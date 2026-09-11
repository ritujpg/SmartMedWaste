import os
from typing import Any

try:
    from supabase import create_client
except Exception:  # pragma: no cover
    create_client = None

from .config import settings


class SupabaseClient:
    _client: Any | None = None

    @classmethod
    def get_client(cls) -> Any:
        if cls._client is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
                return None
            if create_client is None:
                raise RuntimeError("supabase Python package is not installed")
            cls._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
        return cls._client


def get_supabase_client() -> Any:
    return SupabaseClient.get_client()


supabase = get_supabase_client()
