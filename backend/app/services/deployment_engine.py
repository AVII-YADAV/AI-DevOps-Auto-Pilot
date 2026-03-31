"""
Docker deployment engine.
Handles the full deployment lifecycle: clone → detect → build → run.
"""

import os
import uuid
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional

import docker
from docker.errors import DockerException, BuildError, ContainerError, APIError
from git import Repo, GitCommandError
from tenacity import retry, stop_after_attempt, wait_exponential
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import Project, Deployment, DeploymentLog
from app.services.stack_detector import StackDetector
from app.services.dockerfile_generator import DockerfileGenerator
from app.services.port_allocator import port_allocator
from app.services.nginx_manager import nginx_manager

settings = get_settings()
logger = logging.getLogger(__name__)


class DeploymentEngine:
    """
    Orchestrates the full deployment pipeline:
    1. Clone repository
    2. Detect technology stack
    3. Generate Dockerfile
    4. Build Docker image
    5. Run container
    6. Configure Nginx routing
    """

    def __init__(self):
        try:
            self.docker_client = docker.from_env()
        except DockerException:
            self.docker_client = docker.DockerClient(base_url=settings.DOCKER_SOCKET)

    async def _add_log(
        self,
        db: AsyncSession,
        deployment_id: uuid.UUID,
        message: str,
        level: str = "info",
        source: str = "system",
    ):
        """Add a log entry for a deployment."""
        log_entry = DeploymentLog(
            deployment_id=deployment_id,
            message=message,
            level=level,
            source=source,
        )
        db.add(log_entry)
        await db.flush()

    async def _update_status(
        self,
        db: AsyncSession,
        deployment: Deployment,
        status: str,
        error_message: Optional[str] = None,
    ):
        """Update deployment status."""
        deployment.status = status
        if error_message:
            deployment.error_message = error_message
        if status in ("deployed", "failed", "stopped"):
            deployment.finished_at = datetime.now(timezone.utc)
        await db.flush()

    def clone_repository(self, repo_url: str, target_dir: str) -> str:
        """
        Clone a git repository to the target directory.
        Returns the path to the cloned repository.
        """
        os.makedirs(target_dir, exist_ok=True)

        try:
            logger.info(f"Cloning repository: {repo_url}")
            Repo.clone_from(
                repo_url,
                target_dir,
                depth=1,  # Shallow clone for speed
                single_branch=True,
            )
            return target_dir
        except GitCommandError as e:
            raise RuntimeError(f"Failed to clone repository: {str(e)}")

    def build_image(
        self, project_path: str, image_name: str, dockerfile_content: str
    ) -> str:
        """
        Build a Docker image from the generated Dockerfile.
        Returns the image ID.
        """
        # Write the Dockerfile
        dockerfile_path = os.path.join(project_path, "Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile_content)

        try:
            logger.info(f"Building Docker image: {image_name}")
            image, build_logs = self.docker_client.images.build(
                path=project_path,
                tag=image_name,
                rm=True,
                forcerm=True,
                nocache=False,
            )

            # Log build output
            for log_entry in build_logs:
                if "stream" in log_entry:
                    line = log_entry["stream"].strip()
                    if line:
                        logger.debug(f"Build: {line}")

            return image.id
        except BuildError as e:
            build_log = "\n".join(
                [l.get("stream", l.get("error", "")) for l in e.build_log]
            )
            raise RuntimeError(f"Docker build failed:\n{build_log}")
        except APIError as e:
            raise RuntimeError(f"Docker API error during build: {str(e)}")

    def run_container(
        self,
        image_name: str,
        container_name: str,
        port: int,
        internal_port: int = 8000,
    ) -> str:
        """
        Run a Docker container with resource limits and port mapping.
        Returns the container ID.
        """
        try:
            # Ensure the network exists
            self._ensure_network()

            logger.info(
                f"Starting container {container_name} on port {port}"
            )

            container = self.docker_client.containers.run(
                image=image_name,
                name=container_name,
                detach=True,
                ports={f"{internal_port}/tcp": port},
                mem_limit=settings.CONTAINER_MEMORY_LIMIT,
                cpu_quota=int(settings.CONTAINER_CPU_LIMIT * 100000),
                cpu_period=100000,
                restart_policy={"Name": "unless-stopped"},
                network=settings.CONTAINER_NETWORK,
                environment={
                    "PORT": str(internal_port),
                    "NODE_ENV": "production",
                },
                labels={
                    "managed-by": "autopilot",
                    "project": container_name,
                },
            )

            return container.id
        except ContainerError as e:
            raise RuntimeError(f"Container failed to start: {str(e)}")
        except APIError as e:
            raise RuntimeError(f"Docker API error: {str(e)}")

    def _ensure_network(self):
        """Ensure the Docker network exists."""
        try:
            self.docker_client.networks.get(settings.CONTAINER_NETWORK)
        except docker.errors.NotFound:
            self.docker_client.networks.create(
                settings.CONTAINER_NETWORK, driver="bridge"
            )

    def get_container_logs(
        self, container_id: str, tail: int = 200
    ) -> str:
        """Retrieve logs from a running container."""
        try:
            container = self.docker_client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=True).decode("utf-8")
            return logs
        except docker.errors.NotFound:
            return "Container not found"
        except Exception as e:
            return f"Error fetching logs: {str(e)}"

    def stop_container(self, container_id: str) -> bool:
        """Stop and remove a container."""
        try:
            container = self.docker_client.containers.get(container_id)
            container.stop(timeout=10)
            container.remove(force=True)
            return True
        except docker.errors.NotFound:
            return True  # Already removed
        except Exception as e:
            logger.error(f"Error stopping container: {str(e)}")
            return False

    def get_container_status(self, container_id: str) -> Optional[str]:
        """Get the current status of a container."""
        try:
            container = self.docker_client.containers.get(container_id)
            return container.status
        except docker.errors.NotFound:
            return None

    async def execute_deployment(
        self, db: AsyncSession, deployment_id: uuid.UUID
    ) -> Deployment:
        """
        Execute the full deployment pipeline.
        This is the main method called by Celery tasks.
        """
        # Fetch deployment with project
        result = await db.execute(
            select(Deployment).where(Deployment.id == deployment_id)
        )
        deployment = result.scalar_one_or_none()
        if not deployment:
            raise ValueError(f"Deployment {deployment_id} not found")

        result = await db.execute(
            select(Project).where(Project.id == deployment.project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {deployment.project_id} not found")

        try:
            # Step 1: Clone repository
            await self._update_status(db, deployment, "cloning")
            await self._add_log(db, deployment.id, f"Cloning repository: {project.repo_url}")

            repo_dir = os.path.join(
                settings.REPOS_DIR, str(project.id), str(deployment.id)
            )

            if project.repo_url:
                self.clone_repository(project.repo_url, repo_dir)
            elif project.local_path:
                repo_dir = project.local_path
            else:
                raise ValueError("No repository URL or local path provided")

            await self._add_log(db, deployment.id, "Repository cloned successfully")

            # Step 2: Detect stack
            await self._add_log(db, deployment.id, "Detecting technology stack...")
            stack = StackDetector.detect(repo_dir)
            if not stack:
                raise ValueError("Could not detect the project's technology stack")

            framework = StackDetector.detect_framework(repo_dir, stack)
            entry_point = StackDetector.get_entry_point(repo_dir, stack, framework)

            project.detected_stack = f"{stack}/{framework}" if framework else stack
            await db.flush()

            await self._add_log(
                db, deployment.id,
                f"Detected stack: {stack}, framework: {framework or 'N/A'}, entry: {entry_point}"
            )

            # Step 3: Generate Dockerfile
            await self._update_status(db, deployment, "building")
            await self._add_log(db, deployment.id, "Generating Dockerfile...")

            dockerfile = DockerfileGenerator.generate(
                repo_dir, stack, framework, entry_point
            )
            deployment.dockerfile_content = dockerfile

            await self._add_log(db, deployment.id, "Dockerfile generated successfully")

            # Step 4: Build Docker image
            image_name = f"autopilot-{project.subdomain}:{deployment.id.hex[:8]}"
            deployment.image_name = image_name

            await self._add_log(db, deployment.id, f"Building image: {image_name}")
            image_id = self.build_image(repo_dir, image_name, dockerfile)
            await self._add_log(db, deployment.id, f"Image built: {image_id[:12]}")

            # Step 5: Allocate port and run container
            await self._update_status(db, deployment, "running")
            port = port_allocator.allocate()
            deployment.port = port

            container_name = f"autopilot-{project.subdomain}"

            # Stop any existing container with the same name
            try:
                existing = self.docker_client.containers.get(container_name)
                existing.stop(timeout=5)
                existing.remove(force=True)
            except docker.errors.NotFound:
                pass

            # Determine internal port based on stack
            internal_port = 8000 if stack == "python" else 3000
            if stack == "static":
                internal_port = 80

            await self._add_log(
                db, deployment.id,
                f"Starting container {container_name} on port {port} → {internal_port}"
            )

            container_id = self.run_container(
                image_name, container_name, port, internal_port
            )
            deployment.container_id = container_id
            deployment.container_name = container_name

            await self._add_log(db, deployment.id, f"Container started: {container_id[:12]}")

            # Step 6: Configure Nginx
            await self._add_log(db, deployment.id, "Configuring Nginx reverse proxy...")

            success, msg, public_url = nginx_manager.deploy_config(
                project.subdomain, port, project.name
            )

            if success and public_url:
                deployment.public_url = public_url
                project.status = "deployed"
                await self._update_status(db, deployment, "deployed")
                await self._add_log(
                    db, deployment.id,
                    f"Deployment complete! Public URL: {public_url}"
                )
            else:
                # Nginx failed but container is running, set URL without nginx
                deployment.public_url = f"http://localhost:{port}"
                project.status = "deployed"
                await self._update_status(db, deployment, "deployed")
                await self._add_log(
                    db, deployment.id,
                    f"Container running at http://localhost:{port} (Nginx: {msg})",
                    level="warning"
                )

            await db.flush()
            return deployment

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Deployment failed: {error_msg}")
            await self._update_status(db, deployment, "failed", error_msg)
            await self._add_log(
                db, deployment.id,
                f"Deployment failed: {error_msg}",
                level="error",
                source="system",
            )

            # Release allocated port on failure
            if deployment.port:
                port_allocator.release(deployment.port)

            project.status = "failed"
            await db.flush()
            return deployment


# Singleton instance
deployment_engine = DeploymentEngine()
