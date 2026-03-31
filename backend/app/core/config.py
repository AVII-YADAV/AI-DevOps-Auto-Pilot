"""
Application configuration using pydantic-settings.
All secrets and tunables are loaded from environment variables / .env file.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "AI DevOps Auto-Pilot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── Database ─────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://autopilot:autopilot@localhost:5432/autopilot"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://autopilot:autopilot@localhost:5432/autopilot"

    # ── Redis ────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ──────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-this-to-a-secure-random-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Docker ───────────────────────────────────────────────────
    DOCKER_SOCKET: str = "unix:///var/run/docker.sock"
    CONTAINER_MEMORY_LIMIT: str = "512m"
    CONTAINER_CPU_LIMIT: float = 0.5
    CONTAINER_NETWORK: str = "autopilot-network"

    # ── Port Allocation ──────────────────────────────────────────
    PORT_RANGE_START: int = 9000
    PORT_RANGE_END: int = 9500

    # ── Nginx ────────────────────────────────────────────────────
    NGINX_CONFIG_DIR: str = "/etc/nginx/conf.d"
    NGINX_RELOAD_CMD: str = "nginx -s reload"
    BASE_DOMAIN: str = "localhost"

    # ── Storage ──────────────────────────────────────────────────
    PROJECTS_DIR: str = "/tmp/autopilot/projects"
    REPOS_DIR: str = "/tmp/autopilot/repos"

    # ── AI Module ────────────────────────────────────────────────
    AI_API_KEY: str = ""
    AI_API_URL: str = "https://api.openai.com/v1/chat/completions"
    AI_MODEL: str = "gpt-4"

    # ── Stripe Setup ─────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = ""

    # ── Rate Limiting ────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    # ── Celery ───────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton for application settings."""
    return Settings()
