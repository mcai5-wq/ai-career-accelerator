from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = "sk-..."
    internal_api_key: str = "local-internal-secret"
    openai_model: str = "gpt-4o-mini"

    @property
    def openai_configured(self) -> bool:
        # "sk-..." is the local-dev placeholder — treat it the same as
        # "not set" rather than sending it to OpenAI and getting back a
        # confusing auth error instead of a clean "not configured" one.
        return bool(self.openai_api_key) and self.openai_api_key != "sk-..."


settings = Settings()
