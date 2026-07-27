from pydantic_settings import BaseSettings, SettingsConfigDict

# Groq's free tier by default — its API is OpenAI-compatible, so the same
# `openai` SDK client works unchanged (see openai_client.py). Swapping to
# OpenAI, another OpenAI-compatible provider, or a paid tier later is just
# an env var change: nothing in openai_client.py or the services needs to
# change, only ai_base_url/ai_model/ai_api_key.
DEFAULT_AI_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_AI_MODEL = "llama-3.3-70b-versatile"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_api_key: str = "gsk_..."
    ai_base_url: str = DEFAULT_AI_BASE_URL
    ai_model: str = DEFAULT_AI_MODEL
    internal_api_key: str = "local-internal-secret"

    @property
    def ai_configured(self) -> bool:
        # "gsk_..." (Groq) / "sk-..." (OpenAI) are local-dev placeholders —
        # treat them the same as "not set" rather than sending them to the
        # provider and getting back a confusing auth error instead of a
        # clean "not configured" one.
        return bool(self.ai_api_key) and self.ai_api_key not in ("gsk_...", "sk-...")


settings = Settings()
