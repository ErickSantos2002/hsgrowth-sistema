"""
Configurações da aplicação usando Pydantic Settings.
Carrega variáveis de ambiente do arquivo .env
"""
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações gerais da aplicação"""

    # Application
    PROJECT_NAME: str = "HSGrowth CRM API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str

    # JWT Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Email (Microsoft 365 SMTP)
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NAME: str = "HSGrowth CRM"

    # Cache (cachetools)
    CACHE_TTL: int = 3600  # 1 hora
    CACHE_MAXSIZE: int = 1000

    # Celery (Job Queue)
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Logs
    LOG_LEVEL: str = "DEBUG"
    LOG_RETENTION_DAYS: int = 90

    # Automations
    AUTOMATION_MAX_PER_ACCOUNT: int = 50
    AUTOMATION_CRON_INTERVAL_MINUTES: int = 1
    EMAIL_FAILURE_THRESHOLD: int = 3
    EMAIL_GROUP_THRESHOLD: int = 5

    # Transfers
    TRANSFER_LIMIT_PER_MONTH: int = 10
    TRANSFER_APPROVAL_REQUIRED: bool = False
    TRANSFER_APPROVAL_EXPIRATION_HOURS: int = 72
    TRANSFER_MAX_BATCH_SIZE: int = 50

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10 MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignora campos extras do .env que não estão definidos
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Converte string JSON para lista se necessário"""
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v


# Instância global de configurações
settings = Settings()
