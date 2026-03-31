"""
AI analysis API routes.
POST /ai/analyze                    — analyze deployment errors
GET  /ai/suggestions/{dep_id}      — get suggestions for a deployment
POST /ai/validate-fix               — validate fix commands
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Project, Deployment, DeploymentLog, AISuggestion
from app.schemas.ai_suggestion import (
    AIAnalyzeRequest,
    AIAnalyzeResponse,
    AISuggestionResponse,
    AIArchitectResponse,
)
from app.core.security import get_current_user
from app.services.ai_analyzer import ai_analyzer
from app.services.ai_architect import ai_architect

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Analysis"])


@router.post(
    "/analyze",
    response_model=AIAnalyzeResponse,
    summary="Analyze deployment errors",
)
async def analyze_deployment(
    data: AIAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze deployment logs using AI to identify root causes
    and suggest fixes.

    - **deployment_id**: The deployment to analyze
    - **additional_context**: Optional user-provided context
    """
    # Verify ownership
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(
            Deployment.id == data.deployment_id,
            Project.owner_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    # Fetch deployment logs
    result = await db.execute(
        select(DeploymentLog)
        .where(DeploymentLog.deployment_id == data.deployment_id)
        .order_by(DeploymentLog.timestamp.asc())
    )
    logs = result.scalars().all()

    if not logs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No logs available for analysis",
        )

    # Combine logs into a single text
    log_text = "\n".join(
        [f"[{log.timestamp}] [{log.level.upper()}] [{log.source}] {log.message}" for log in logs]
    )

    # Get project info for context
    result = await db.execute(
        select(Project).where(Project.id == deployment.project_id)
    )
    project = result.scalar_one_or_none()

    # Run AI analysis
    analysis_result = await ai_analyzer.analyze_logs(
        logs=log_text,
        stack=project.detected_stack if project else None,
        dockerfile=deployment.dockerfile_content,
        additional_context=data.additional_context,
    )

    # Store suggestion
    suggestion = AISuggestion(
        deployment_id=data.deployment_id,
        root_cause=analysis_result["root_cause"],
        fix_suggestion=analysis_result["fix_suggestion"],
        commands=analysis_result.get("commands", "[]"),
        confidence=analysis_result.get("confidence", "medium"),
    )
    db.add(suggestion)
    await db.flush()
    await db.refresh(suggestion)

    return AIAnalyzeResponse(
        suggestion=AISuggestionResponse.model_validate(suggestion),
        logs_analyzed=len(logs),
    )


@router.get(
    "/suggestions/{deployment_id}",
    response_model=list[AISuggestionResponse],
    summary="Get AI suggestions for a deployment",
)
async def get_suggestions(
    deployment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all AI suggestions for a deployment."""
    # Verify ownership
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(
            Deployment.id == deployment_id,
            Project.owner_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    result = await db.execute(
        select(AISuggestion)
        .where(AISuggestion.deployment_id == deployment_id)
        .order_by(AISuggestion.created_at.desc())
    )
    suggestions = result.scalars().all()

    return [AISuggestionResponse.model_validate(s) for s in suggestions]

# ╔══════════════════════════════════════════════════════════════════╗
# ║  SYNCHRONOUS AI ROUTES                                         ║
# ╚══════════════════════════════════════════════════════════════════╝

class SyncAIAnalysisRequest(BaseModel):
    project_id: str

class SyncAIResponse(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    commands: str

@router.post(
    "/analyze",
    response_model=SyncAIResponse,
    summary="Direct log analysis via LLM",
)
async def analyze_logs_sync(
    data: SyncAIAnalysisRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Directly query the AI subsystem to analyze the latest container
    logs belonging to a specific deployed project_id.
    """
    from app.services.logs_service import logs_service
    from app.services.ai_service import ai_service

    if not data.project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id provided.")

    # 1. Fetch from Database
    raw_logs = await logs_service.fetch_logs_from_db(db, data.project_id)
    
    if not raw_logs or len(raw_logs.strip()) == 0:
        raise HTTPException(
            status_code=404, 
            detail=f"No logs found in registry for project: {data.project_id}"
        )

    # 2. Run Analytics Orchestration
    try:
        analysis = await ai_service.analyze_logs(raw_logs)
        return SyncAIResponse(**analysis)
    except Exception as e:
        logger.error(f"Analysis system failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"AI processing failed: {str(e)}"
        )


@router.post(
    "/validate-fix",
    summary="Validate fix commands before applying",
)
async def validate_fix(
    commands: list[str],
    current_user: User = Depends(get_current_user),
):
    """
    Validate a list of fix commands for safety.
    Returns each command with a safety rating.
    """
    validated = ai_analyzer.validate_fix(commands)
    return {"commands": validated}


@router.get(
    "/architect/{project_id}",
    response_model=AIArchitectResponse,
    summary="Generate a strategic infrastructure blueprint for a project",
)
async def get_project_blueprint(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI-driven architectural blueprint including optimization
    and scaling strategies for a specific project.
    """
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

    # Get latest deployment for Dockerfile context
    result = await db.execute(
        select(Deployment)
        .where(Deployment.project_id == project_id)
        .order_by(Deployment.created_at.desc())
        .limit(1)
    )
    latest_deployment = result.scalar_one_or_none()

    dockerfile = latest_deployment.dockerfile_content if latest_deployment else ""
    
    # Generate blueprint
    blueprint = await ai_architect.generate_blueprint(
        stack=project.detected_stack or "Unknown",
        dockerfile=dockerfile,
        project_name=project.name,
    )

    return AIArchitectResponse(**blueprint)
