"""
Project management service: CRUD operations for projects.
"""

import uuid
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.db.models import Project, User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectListResponse


def _generate_subdomain(name: str) -> str:
    """Generate a URL-safe subdomain from a project name."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    short_id = uuid.uuid4().hex[:6]
    return f"{slug}-{short_id}"


async def create_project(
    db: AsyncSession, user: User, data: ProjectCreate
) -> ProjectResponse:
    """Create a new project for the authenticated user."""

    subdomain = _generate_subdomain(data.name)

    project = Project(
        name=data.name,
        description=data.description,
        repo_url=data.repo_url,
        source_type=data.source_type,
        subdomain=subdomain,
        owner_id=user.id,
        status="created",
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    return ProjectResponse.model_validate(project)


async def get_user_projects(
    db: AsyncSession, user: User, skip: int = 0, limit: int = 50
) -> ProjectListResponse:
    """Retrieve all projects owned by the authenticated user."""

    # Count total
    count_result = await db.execute(
        select(func.count(Project.id)).where(Project.owner_id == user.id)
    )
    total = count_result.scalar()

    # Fetch projects
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == user.id)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()

    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(p) for p in projects],
        total=total,
    )


async def get_project_by_id(
    db: AsyncSession, user: User, project_id: uuid.UUID
) -> ProjectResponse:
    """Retrieve a single project by ID, ensuring ownership."""

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return ProjectResponse.model_validate(project)


async def delete_project(
    db: AsyncSession, user: User, project_id: uuid.UUID
) -> dict:
    """Delete a project by ID, ensuring ownership."""

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    await db.delete(project)
    return {"message": "Project deleted successfully"}
