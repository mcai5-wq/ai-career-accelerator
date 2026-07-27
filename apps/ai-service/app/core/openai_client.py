from functools import lru_cache

from openai import OpenAI

from app.core.config import settings


@lru_cache
def get_ai_client() -> OpenAI:
    # Still the `openai` SDK — it's just pointed at settings.ai_base_url,
    # which defaults to Groq's OpenAI-compatible endpoint (see config.py).
    # Cached so every request reuses one client/connection pool instead of
    # constructing a new one each call. Safe to call even when
    # settings.ai_configured is False — callers must check that first; this
    # just wraps whatever key (real or placeholder) is currently set.
    return OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
