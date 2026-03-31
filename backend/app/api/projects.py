"""
Project management API routes.
POST /projects            — create a new project
GET  /projects            — list all user projects
GET  /projects/{id}       — get single project details
DELETE /projects/{id}     — delete a project
"""

import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectListResponse
from app.services.project_service import (
    create_project,
    get_user_projects,
    get_project_by_id,
    delete_project,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new project.

    - **name**: Project name (1-255 characters)
    - **description**: Optional project description
    - **repo_url**: GitHub repository URL
    - **source_type**: 'github' or 'zip'
    """
    return await create_project(db, current_user, data)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List user projects",
)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all projects owned by the authenticated user with pagination."""
    return await get_user_projects(db, current_user, skip, limit)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project details",
)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific project by ID. Enforces ownership."""
    return await get_project_by_id(db, current_user, project_id)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a project",
)
async def remove_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project and all its deployments. Enforces ownership."""
    return await delete_project(db, current_user, project_id)
