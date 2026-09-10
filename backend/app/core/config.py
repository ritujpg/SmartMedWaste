from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./smartmedwaste.db"
    jwt_secret_key: str = Field(default="change-me-in-development", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    app_env: str = "development"
    ai_confidence_threshold: float = 75.0
    compliance_compliant_threshold: float = 90.0
    compliance_attention_threshold: float = 70.0
    track_base_url: str = "https://smartmedwaste.app/track"
    ai_provider: str = "mock"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    ai_max_image_size_bytes: int = 10 * 1024 * 1024
    demo_facility_email: str = "facility@smartmedwaste.demo"
    demo_collector_email: str = "collector@smartmedwaste.demo"
    demo_admin_email: str = "admin@smartmedwaste.demo"
    demo_password: str = "demo123"

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
