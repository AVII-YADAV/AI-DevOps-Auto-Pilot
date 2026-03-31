"""
Log fetching API endpoint.
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.logs_service import logs_service

router = APIRouter(prefix="/deploy", tags=["Logs (Synchronous)"])

class SyncLogsResponse(BaseModel):
    logs: str

@router.get(
    "/{project_id}/logs",
    response_model=SyncLogsResponse,
    summary="Get deployment logs",
)
async def get_deployment_logs_sync(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch the latest logs for a given project deployment.
    First checks database. If empty, it'll attempt to return what exists.
    """
    # 1. Look up the logs in the database
    logs_content = await logs_service.fetch_logs_from_db(db, project_id)
    
    if not logs_content:
        # Give it a generic payload if it doesn't exist yet (in process of deploying)
        logs_content = "No logs available yet. Deployment may still be initializing."

    return SyncLogsResponse(logs=logs_content)
