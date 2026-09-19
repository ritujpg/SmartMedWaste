import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load the workspace .env when the Python package is imported, so the FastAPI
# settings object is the single consistent environment source.
ROOT = Path(__file__).resolve().parents[3]
for candidate in (ROOT / ".env", ROOT / "server" / ".env"):
    if candidate.exists():
        load_dotenv(candidate)


def normalize_supabase_url(url: str) -> str:
    value = (url or "").strip()
    value = value.removesuffix("/")
    # Accept the workspace env shape that includes the REST suffix and return the
    # canonical project base url the official Python client expects.
    value = value.replace("/rest/v1", "")
    value = value.replace("/v1", "")
    if value.endswith("/rest"):
        value = value[: -len("/rest")]
    return value


class Settings:
    SUPABASE_URL = normalize_supabase_url(os.getenv("SUPABASE_URL", ""))
    SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    AI_SCANNER_MODE = os.getenv("AI_SCANNER_MODE", "detect").strip().lower()
    LOCAL_CLASSIFIER_CONFIDENCE_THRESHOLD = float(os.getenv("LOCAL_CLASSIFIER_CONFIDENCE_THRESHOLD", "0.70"))
    ROBOT_API_KEY = os.getenv("ROBOT_API_KEY", "").strip()
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smartmedwaste-dev-secret")
    CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

    @staticmethod
    def require_env(name: str) -> str:
        value = os.getenv(name, "")
        if not value:
            raise RuntimeError(f"Missing environment variable: {name}")
        return value


settings = Settings()
