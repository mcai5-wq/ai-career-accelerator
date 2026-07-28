from fastapi import FastAPI

from app.routers import interviews, resumes, technical_prep

app = FastAPI(title="AI Career Accelerator — AI Service")

app.include_router(interviews.router)
app.include_router(resumes.router)
app.include_router(technical_prep.router)


@app.get("/health")
def health() -> dict[str, bool]:
    from app.core.config import settings

    return {"ok": True, "aiConfigured": settings.ai_configured}
