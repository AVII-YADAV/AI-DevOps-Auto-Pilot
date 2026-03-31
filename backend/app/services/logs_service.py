"""
Logs service.
Handles capturing, storing, and serving deployment logs.
"""

import logging
from typing import Optional

import docker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import DeploymentLogs

logger = logging.getLogger(__name__)


class LogsService:
    """Production-grade container log orchestrator."""

    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"Failed to connect to Docker daemon for logs: {e}")
            self.client = None

    def get_container_logs(self, container_id: str, tail: int = 500) -> Optional[str]:
        """Fetch logs (stdout+stderr) from Docker daemon safely."""
        if not self.client:
            logger.error("Docker client unavailable")
            return None

        try:
            container = self.client.containers.get(container_id)
            # Fetch combined logs with a hard limit to avoid memory overload
            raw_logs = container.logs(
                stdout=True,
                stderr=True,
                tail=tail,
                timestamps=True
            )
            return raw_logs.decode("utf-8", errors="replace")
        except docker.errors.NotFound:
            logger.error(f"Container {container_id} not found for logs.")
            return None
        except Exception as e:
            logger.error(f"Error fetching logs for container {container_id}: {e}")
            return None

    async def save_logs_to_db(self, db: AsyncSession, project_id: str, container_id: str, log_data: str):
        """Persist a monolithic snapshot of container logs."""
        if not log_data:
            logger.warning(f"Empty logs received for project {project_id}, skipping save.")
            return

        deployment_log = DeploymentLogs(
            project_id=project_id,
            container_id=container_id,
            logs=log_data,
        )
        db.add(deployment_log)
        await db.commit()
        logger.info(f"Saved logs payload for {project_id} (container: {container_id})")

    async def fetch_logs_from_db(self, db: AsyncSession, project_id: str) -> str:
        """Fetch the most recent log payload for a project."""
        result = await db.execute(
            select(DeploymentLogs)
            .where(DeploymentLogs.project_id == project_id)
            .order_by(DeploymentLogs.created_at.desc())
        )
        record = result.scalars().first()
        
        if not record:
            return ""
        return record.logs


# Singleton export
logs_service = LogsService()
