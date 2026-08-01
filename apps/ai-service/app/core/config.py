from pydantic_settings import BaseSettings, SettingsConfigDict

# Groq's free tier by default — its API is OpenAI-compatible, so switching
# providers later is just an env var change.
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
        # Treat the local placeholder keys as "not set" rather than sending
        # them to the provider and getting a confusing auth error back.
        return bool(self.ai_api_key) and self.ai_api_key not in ("gsk_...", "sk-...")


settings = Settings()
