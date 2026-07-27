from functools import lru_cache

from openai import OpenAI

from app.core.config import settings


@lru_cache
def get_openai_client() -> OpenAI:
    # Cached so every request reuses one client/connection pool instead of
    # constructing a new one each call. Safe to call even when
    # settings.openai_configured is False — callers must check that first;
    # this just wraps whatever key (real or placeholder) is currently set.
    return OpenAI(api_key=settings.openai_api_key)
