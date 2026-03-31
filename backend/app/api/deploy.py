"""
Deployment API routes.
POST /deploy                    — trigger a deployment
GET  /deploy/{id}               — get deployment status
GET  /deploy/{id}/logs          — get deployment logs
POST /deploy/{id}/stop          — stop a running deployment
GET  /deploy/project/{id}       — list deployments for a project
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Project, Deployment, DeploymentLog
from app.schemas.deployment import (
    DeploymentCreate,
    DeploymentResponse,
    DeploymentLogsResponse,
    LogEntry,
)
from app.core.security import get_current_user
from app.services.port_allocator import port_allocator
from app.celery_worker import deploy_project_task, collect_container_logs_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deploy", tags=["Deployments"])


from pydantic import BaseModel

class SyncDeployRequest(BaseModel):
    repo_url: str

class SyncDeployResponse(BaseModel):
    project_id: str
    url: str | None
    status: str

@router.post(
    "/sync",
    response_model=SyncDeployResponse,
    status_code=status.HTTP_200_OK,
    summary="Direct synchronous deployment",
)
async def deploy_project_sync(
    data: SyncDeployRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Directly deploy a project from a repo URL in a synchronous manner.
    """
    from app.services.deploy_service import deploy_service
    from app.services.logs_service import logs_service
    import asyncio
    
    # Run synchronous deployment pipeline in threadpool
    result = await asyncio.to_thread(deploy_service.deploy_project, data.repo_url)
    
    # Extract logs immediately if successful
    if result.get("container_id"):
        raw_logs = logs_service.get_container_logs(result["container_id"])
        if raw_logs:
            await logs_service.save_logs_to_db(db, result["project_id"], result["container_id"], raw_logs)
    
    return result

@router.post(
    "",
    response_model=DeploymentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Deploy a project (Async Celery)",
)
async def deploy_project(
    data: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a deployment for a project.
    The deployment runs asynchronously via Celery.
    Returns the deployment record with a 202 Accepted status.
    """
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            Project.id == data.project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if not project.repo_url and not project.local_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no repository URL or uploaded source",
        )

    # Create deployment record
    deployment = Deployment(
        project_id=data.project_id,
        status="pending",
    )
    db.add(deployment)
    await db.flush()
    await db.refresh(deployment)

    # Update project status
    project.status = "deploying"
    await db.flush()

    # Queue deployment task
    task = deploy_project_task.delay(str(deployment.id))
    deployment.celery_task_id = task.id
    await db.flush()

    # Add initial log
    log_entry = DeploymentLog(
        deployment_id=deployment.id,
        message="Deployment queued",
        level="info",
        source="system",
    )
    db.add(log_entry)

    return DeploymentResponse.model_validate(deployment)


@router.get(
    "/{deployment_id}",
    response_model=DeploymentResponse,
    summary="Get deployment status",
)
async def get_deployment(
    deployment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current status of a deployment."""
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(
            Deployment.id == deployment_id,
            Project.owner_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    return DeploymentResponse.model_validate(deployment)


@router.get(
    "/{deployment_id}/logs",
    response_model=DeploymentLogsResponse,
    summary="Get deployment logs",
)
async def get_deployment_logs(
    deployment_id: uuid.UUID,
    tail: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get logs for a deployment.
    Optionally triggers fresh log collection from the running container.
    """
    # Verify ownership
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(
            Deployment.id == deployment_id,
            Project.owner_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    # If container is running, trigger fresh log collection
    if deployment.container_id and deployment.status == "deployed":
        try:
            collect_container_logs_task.delay(
                str(deployment.id), deployment.container_id
            )
        except Exception as e:
            logger.warning(f"Failed to trigger log collection: {e}")

    # Fetch stored logs
    result = await db.execute(
        select(DeploymentLog)
        .where(DeploymentLog.deployment_id == deployment_id)
        .order_by(DeploymentLog.timestamp.desc())
        .limit(tail)
    )
    logs = list(reversed(result.scalars().all()))

    return DeploymentLogsResponse(
        deployment_id=deployment_id,
        status=deployment.status,
        logs=[LogEntry.model_validate(log) for log in logs],
        total=len(logs),
    )


@router.post(
    "/{deployment_id}/stop",
    response_model=DeploymentResponse,
    summary="Stop a deployment",
)
async def stop_deployment(
    deployment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stop a running deployment and release its resources."""
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(
            Deployment.id == deployment_id,
            Project.owner_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    # Stop container
    if deployment.container_id:
        try:
            import docker
            client = docker.from_env()
            container = client.containers.get(deployment.container_id)
            container.stop(timeout=10)
            container.remove(force=True)
        except Exception as e:
            logger.warning(f"Error stopping container: {e}")

    # Release port
    if deployment.port:
        port_allocator.release(deployment.port)

    # Remove nginx config
    result2 = await db.execute(
        select(Project).where(Project.id == deployment.project_id)
    )
    project = result2.scalar_one_or_none()
    if project and project.subdomain:
        from app.services.nginx_manager import nginx_manager
        nginx_manager.remove_config(project.subdomain)
        nginx_manager.reload()
        project.status = "stopped"

    deployment.status = "stopped"
    deployment.finished_at = datetime.now(timezone.utc)

    log_entry = DeploymentLog(
        deployment_id=deployment.id,
        message="Deployment stopped by user",
        level="info",
        source="system",
    )
    db.add(log_entry)

    return DeploymentResponse.model_validate(deployment)


@router.get(
    "/project/{project_id}",
    response_model=list[DeploymentResponse],
    summary="List deployments for a project",
)
async def list_project_deployments(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all deployments for a specific project."""
    # Verify ownership
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    result = await db.execute(
        select(Deployment)
        .where(Deployment.project_id == project_id)
        .order_by(Deployment.created_at.desc())
    )
    deployments = result.scalars().all()

    return [DeploymentResponse.model_validate(d) for d in deployments]
