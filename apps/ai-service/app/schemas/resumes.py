from pydantic import BaseModel, Field


class Suggestion(BaseModel):
    section: str
    suggestion: str


class AnalyzeResumeRequest(BaseModel):
    resume_text: str
    job_title: str
    company: str | None = None
    job_description_text: str | None = None


class AnalyzeResumeResponse(BaseModel):
    ats_score: int = Field(ge=0, le=100)
    matched_keywords: list[str]
    missing_keywords: list[str]
    suggestions: list[Suggestion]
    summary: str
