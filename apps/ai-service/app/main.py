from fastapi import FastAPI

from app.routers import interviews

app = FastAPI(title="AI Career Accelerator — AI Service")

app.include_router(interviews.router)


@app.get("/health")
def health() -> dict[str, bool]:
    from app.core.config import settings

    return {"ok": True, "openaiConfigured": settings.openai_configured}
