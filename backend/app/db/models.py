"""
Consolidated SQLAlchemy ORM models.
All tables for the platform are defined here with proper relationships.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


# ╔══════════════════════════════════════════════════════════════════╗
# ║  USER                                                          ║
# ╚══════════════════════════════════════════════════════════════════╝

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50))
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    tier: Mapped[str] = mapped_column(String(20), default="free")
    stripe_customer_id: Mapped[str] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    projects = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"


# ╔══════════════════════════════════════════════════════════════════╗
# ║  PROJECT                                                       ║
# ╚══════════════════════════════════════════════════════════════════╝

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    repo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="github"
    )  # github | zip
    detected_stack: Mapped[str] = mapped_column(String(50), nullable=True)
    subdomain: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="created"
    )  # created | deploying | deployed | failed | stopped
    local_path: Mapped[str] = mapped_column(String(500), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner = relationship("User", back_populates="projects")
    deployments = relationship(
        "Deployment",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Deployment.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<Project {self.name}>"


# ╔══════════════════════════════════════════════════════════════════╗
# ║  DEPLOYMENT                                                    ║
# ╚══════════════════════════════════════════════════════════════════╝

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | cloning | building | running | deployed | failed | stopped
    container_id: Mapped[str] = mapped_column(String(100), nullable=True)
    container_name: Mapped[str] = mapped_column(String(100), nullable=True)
    image_name: Mapped[str] = mapped_column(String(200), nullable=True)
    port: Mapped[int] = mapped_column(Integer, nullable=True)
    public_url: Mapped[str] = mapped_column(String(500), nullable=True)
    dockerfile_content: Mapped[str] = mapped_column(Text, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    celery_task_id: Mapped[str] = mapped_column(String(255), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    project = relationship("Project", back_populates="deployments")
    logs = relationship(
        "DeploymentLog",
        back_populates="deployment",
        cascade="all, delete-orphan",
        order_by="DeploymentLog.timestamp.asc()",
    )
    ai_suggestions = relationship(
        "AISuggestion",
        back_populates="deployment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Deployment {self.id} status={self.status}>"


# ╔══════════════════════════════════════════════════════════════════╗
# ║  DEPLOYMENT LOG                                                ║
# ╚══════════════════════════════════════════════════════════════════╝

class DeploymentLog(Base):
    __tablename__ = "deployment_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    deployment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deployments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="info"
    )  # info | warning | error | debug
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="container"
    )  # container | build | system
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    deployment = relationship("Deployment", back_populates="logs")

    def __repr__(self) -> str:
        return f"<Log [{self.level}] {self.message[:50]}>"


# ╔══════════════════════════════════════════════════════════════════╗
# ║  AI SUGGESTION                                                 ║
# ╚══════════════════════════════════════════════════════════════════╝

class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    deployment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deployments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    fix_suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    commands: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    confidence: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium"
    )  # low | medium | high
    is_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    applied_result: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    deployment = relationship("Deployment", back_populates="ai_suggestions")

    def __repr__(self) -> str:
        return f"<AISuggestion {self.id} confidence={self.confidence}>"

# ╔══════════════════════════════════════════════════════════════════╗
# ║  DEPLOYMENT LOGS (Synchronous Extension)                       ║
# ╚══════════════════════════════════════════════════════════════════╝

class DeploymentLogs(Base):
    __tablename__ = "deployment_logs_v2"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[str] = mapped_column(String, index=True)
    container_id: Mapped[str | None] = mapped_column(String, nullable=True)
    logs: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
