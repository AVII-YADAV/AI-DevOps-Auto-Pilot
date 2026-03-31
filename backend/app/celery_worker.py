"""
Celery application and task definitions.
Handles background deployment jobs with retry logic.
"""

import uuid
import logging
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "autopilot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=600,  # 10 minutes
    task_time_limit=900,  # 15 minutes
)

# Synchronous DB session for Celery tasks
sync_engine = create_engine(settings.DATABASE_SYNC_URL, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(bind=sync_engine)


@celery_app.task(
    bind=True,
    name="deploy_project",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def deploy_project_task(self, deployment_id: str):
    """
    Celery task to execute a project deployment.
    Uses synchronous operations since Celery workers are sync.
    """
    import os
    from datetime import datetime, timezone
    from app.db.models import Project, Deployment, DeploymentLog
    from app.services.stack_detector import StackDetector
    from app.services.dockerfile_generator import DockerfileGenerator
    from app.services.port_allocator import port_allocator
    from app.services.nginx_manager import nginx_manager
    import docker
    from git import Repo, GitCommandError

    db: Session = SyncSessionLocal()
    dep_uuid = uuid.UUID(deployment_id)

    try:
        deployment = db.query(Deployment).filter(Deployment.id == dep_uuid).first()
        if not deployment:
            logger.error(f"Deployment {deployment_id} not found")
            return {"status": "error", "message": "Deployment not found"}

        project = db.query(Project).filter(Project.id == deployment.project_id).first()
        if not project:
            logger.error(f"Project for deployment {deployment_id} not found")
            return {"status": "error", "message": "Project not found"}

        docker_client = docker.from_env()

        def add_log(message: str, level: str = "info", source: str = "system"):
            log_entry = DeploymentLog(
                deployment_id=dep_uuid,
                message=message,
                level=level,
                source=source,
            )
            db.add(log_entry)
            db.commit()

        # Step 1: Clone
        deployment.status = "cloning"
        db.commit()
        add_log(f"Cloning repository: {project.repo_url}")

        repo_dir = os.path.join(settings.REPOS_DIR, str(project.id), str(deployment.id))
        os.makedirs(repo_dir, exist_ok=True)

        if project.repo_url:
            try:
                Repo.clone_from(
                    project.repo_url, repo_dir,
                    depth=1, single_branch=True,
                )
            except GitCommandError as e:
                raise RuntimeError(f"Git clone failed: {str(e)}")
        elif project.local_path:
            repo_dir = project.local_path
        else:
            raise ValueError("No repository URL or local path")

        add_log("Repository cloned successfully")

        # Step 2: Detect stack
        add_log("Detecting technology stack...")
        stack = StackDetector.detect(repo_dir)
        if not stack:
            raise ValueError("Could not detect technology stack")

        framework = StackDetector.detect_framework(repo_dir, stack)
        entry_point = StackDetector.get_entry_point(repo_dir, stack, framework)

        project.detected_stack = f"{stack}/{framework}" if framework else stack
        db.commit()

        add_log(f"Detected: {stack}/{framework or 'generic'}, entry: {entry_point}")

        # Step 3: Generate Dockerfile
        deployment.status = "building"
        db.commit()
        add_log("Generating Dockerfile...")

        dockerfile = DockerfileGenerator.generate(repo_dir, stack, framework, entry_point)
        deployment.dockerfile_content = dockerfile

        # Write Dockerfile
        dockerfile_path = os.path.join(repo_dir, "Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile)

        add_log("Dockerfile generated")

        # Step 4: Build image
        image_name = f"autopilot-{project.subdomain}:{deployment.id.hex[:8]}"
        deployment.image_name = image_name
        db.commit()

        add_log(f"Building image: {image_name}")

        image, build_logs = docker_client.images.build(
            path=repo_dir, tag=image_name, rm=True, forcerm=True,
        )

        for log_line in build_logs:
            if "stream" in log_line:
                line = log_line["stream"].strip()
                if line:
                    add_log(line, source="build")

        add_log(f"Image built successfully: {image.id[:12]}")

        # Step 5: Run container
        deployment.status = "running"
        db.commit()

        port = port_allocator.allocate()
        deployment.port = port
        container_name = f"autopilot-{project.subdomain}"

        # Stop existing container
        try:
            existing = docker_client.containers.get(container_name)
            existing.stop(timeout=5)
            existing.remove(force=True)
        except docker.errors.NotFound:
            pass

        internal_port = 8000 if stack == "python" else 3000
        if stack == "static":
            internal_port = 80

        add_log(f"Starting container on port {port} → {internal_port}")

        # Ensure network
        try:
            docker_client.networks.get(settings.CONTAINER_NETWORK)
        except docker.errors.NotFound:
            docker_client.networks.create(settings.CONTAINER_NETWORK, driver="bridge")

        container = docker_client.containers.run(
            image=image_name,
            name=container_name,
            detach=True,
            ports={f"{internal_port}/tcp": port},
            mem_limit=settings.CONTAINER_MEMORY_LIMIT,
            cpu_quota=int(settings.CONTAINER_CPU_LIMIT * 100000),
            cpu_period=100000,
            restart_policy={"Name": "unless-stopped"},
            network=settings.CONTAINER_NETWORK,
            environment={"PORT": str(internal_port), "NODE_ENV": "production"},
            labels={"managed-by": "autopilot", "project": container_name},
        )

        deployment.container_id = container.id
        deployment.container_name = container_name
        db.commit()

        add_log(f"Container started: {container.id[:12]}")

        # Step 6: Nginx config
        add_log("Configuring reverse proxy...")
        success, msg, public_url = nginx_manager.deploy_config(
            project.subdomain, port, project.name
        )

        if success and public_url:
            deployment.public_url = public_url
        else:
            deployment.public_url = f"http://localhost:{port}"
            add_log(f"Nginx config note: {msg}", level="warning")

        deployment.status = "deployed"
        deployment.finished_at = datetime.now(timezone.utc)
        project.status = "deployed"
        db.commit()

        add_log(f"Deployment complete! URL: {deployment.public_url}")

        return {
            "status": "success",
            "deployment_id": deployment_id,
            "public_url": deployment.public_url,
        }

    except Exception as exc:
        logger.error(f"Deployment task failed: {str(exc)}")

        if deployment:
            deployment.status = "failed"
            deployment.error_message = str(exc)
            deployment.finished_at = datetime.now(timezone.utc)
            deployment.retry_count = self.request.retries

            if deployment.port:
                port_allocator.release(deployment.port)

        if project:
            project.status = "failed"

        db.add(DeploymentLog(
            deployment_id=dep_uuid,
            message=f"Deployment failed: {str(exc)}",
            level="error",
            source="system",
        ))
        db.commit()

        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)

        return {
            "status": "failed",
            "deployment_id": deployment_id,
            "error": str(exc),
        }

    finally:
        db.close()


@celery_app.task(name="collect_container_logs")
def collect_container_logs_task(deployment_id: str, container_id: str):
    """Collect and store logs from a running container."""
    import docker
    from app.db.models import DeploymentLog

    db = SyncSessionLocal()
    dep_uuid = uuid.UUID(deployment_id)

    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(container_id)
        logs = container.logs(tail=100, timestamps=True).decode("utf-8")

        for line in logs.strip().split("\n"):
            if line.strip():
                # Parse timestamp if present
                parts = line.split(" ", 1)
                message = parts[1] if len(parts) > 1 else parts[0]

                level = "info"
                msg_lower = message.lower()
                if "error" in msg_lower or "err" in msg_lower:
                    level = "error"
                elif "warn" in msg_lower:
                    level = "warning"
                elif "debug" in msg_lower:
                    level = "debug"

                db.add(DeploymentLog(
                    deployment_id=dep_uuid,
                    message=message.strip(),
                    level=level,
                    source="container",
                ))

        db.commit()
        return {"status": "success", "lines": len(logs.strip().split("\n"))}

    except Exception as e:
        logger.error(f"Log collection failed: {str(e)}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
