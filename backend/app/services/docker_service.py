"""
Docker service for generating Dockerfiles, building images, and running containers.
"""

import os
import uuid
import logging
from typing import Dict, Any

import docker
from docker.errors import DockerException, BuildError, ContainerError, APIError

logger = logging.getLogger(__name__)


class DockerService:
    """Handles all Docker-related operations using the Docker SDK."""

    def __init__(self):
        try:
            self.client = docker.from_env()
        except DockerException as e:
            logger.error(f"Failed to connect to Docker daemon: {e}")
            self.client = None

    def dockerfile_generator(self, stack: str, entry_point: str) -> str:
        """Generate a production-ready Dockerfile based on stack."""
        if stack == "python":
            return f"""FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser
CMD ["python", "{entry_point}"]
"""
        elif stack == "nodejs":
            # Determine if we should use npm start or node index.js
            cmd = 'CMD ["npm", "start"]' if entry_point == "npm start" else f'CMD ["node", "{entry_point}"]'
            return f"""FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser /app
USER appuser
{cmd}
"""
        else:
            raise ValueError(f"Unsupported stack for Dockerfile generation: {stack}")

    def build_image(self, project_id: str, app_dir: str, dockerfile_content: str) -> str:
        """Build Docker image from the given directory and Dockerfile."""
        if not self.client:
            raise RuntimeError("Docker client not initialized")

        dockerfile_path = os.path.join(app_dir, "Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile_content)

        image_name = f"app_{project_id}:latest"
        logger.info(f"Building image {image_name} from {app_dir}")

        try:
            image, build_logs = self.client.images.build(
                path=app_dir,
                tag=image_name,
                rm=True,
                forcerm=True
            )
            for log in build_logs:
                if 'stream' in log:
                    logger.debug(log['stream'].strip())
            
            return image_name
        except BuildError as e:
            logger.error(f"Build failed: {e}")
            raise RuntimeError(f"Docker build failed: {str(e)}")
        except APIError as e:
            logger.error(f"API Error building image: {e}")
            raise RuntimeError(f"Docker API error: {str(e)}")

    def run_container(self, project_id: str, image_name: str, host_port: int, container_port: int) -> Dict[str, Any]:
        """Run a container with resource limits and mapping."""
        if not self.client:
            raise RuntimeError("Docker client not initialized")

        container_name = f"app_container_{project_id}"
        
        # Stop and remove existing container if it exists
        try:
            existing = self.client.containers.get(container_name)
            existing.stop(timeout=5)
            existing.remove(force=True)
            logger.info(f"Removed existing container {container_name}")
        except docker.errors.NotFound:
            pass
        except Exception as e:
            logger.warning(f"Error checking existing container: {e}")

        logger.info(f"Starting container {container_name} mapping {host_port}->{container_port}")

        try:
            container = self.client.containers.run(
                image=image_name,
                name=container_name,
                detach=True,
                ports={f"{container_port}/tcp": host_port},
                mem_limit="512m",
                cpu_quota=50000,  # 0.5 CPUs (50% of a core)
                cpu_period=100000,
                pids_limit=100,
                restart_policy={"Name": "unless-stopped"}
            )
            
            # Ensure container is running
            container.reload()
            
            return {
                "container_id": container.id[:12],
                "container_name": container.name,
                "status": container.status
            }
        except ContainerError as e:
            logger.error(f"Container failed to start: {e}")
            raise RuntimeError(f"Failed to start container: {str(e)}")
        except APIError as e:
            logger.error(f"API error running container: {e}")
            raise RuntimeError(f"Docker API error running container: {str(e)}")


# Singleton instance
docker_service = DockerService()
