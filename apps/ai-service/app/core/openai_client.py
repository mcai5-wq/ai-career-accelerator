from functools import lru_cache

from openai import OpenAI

from app.core.config import settings


@lru_cache
def get_ai_client() -> OpenAI:
    # Cached so requests reuse one client/connection pool. Callers should
    # check settings.ai_configured first — this just wraps whatever key is set.
    return OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
