from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # AI
    GEMINI_API_KEY: str
    GEMINI_LITE_MODEL: str = "gemini-2.5-flash-lite-preview-06-17"
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash-preview-05-20"

    # Database
    DATABASE_URL: str = "sqlite:///./jobops.db"

    # App
    SECRET_KEY: str = "dev-secret-key"
    FRONTEND_URL: str = "http://localhost:3000"

    # Scanning
    SCAN_INTERVAL_HOURS: int = 12
    MAX_JOBS_PER_SCAN: int = 100

    # Email (optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
