import os
from typing import Any


class Settings:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smartmedwaste-dev-secret")
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

    @staticmethod
    def require_env(name: str) -> str:
        value = os.getenv(name, "")
        if not value:
            raise RuntimeError(f"Missing environment variable: {name}")
        return value


settings = Settings()
