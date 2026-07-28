from app.core.config import settings


class AiNotConfiguredError(Exception):
    """Raised when no real AI_API_KEY is set — callers should turn this into a 503."""


class AiServiceError(Exception):
    """Raised when the AI provider is configured but the call itself failed."""


def require_ai_configured() -> None:
    if not settings.ai_configured:
        raise AiNotConfiguredError("AI_API_KEY is not configured.")
