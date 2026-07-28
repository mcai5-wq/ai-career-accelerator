from pydantic import BaseModel, Field


class QuestionExemplar(BaseModel):
    category: str
    prompt: str


class GenerateQuestionsRequest(BaseModel):
    role: str
    company: str
    difficulty: str  # "JUNIOR" | "MID" | "SENIOR"
    count: int = Field(gt=0, le=10)
    # Bank questions for this difficulty, passed in as few-shot examples so
    # generated questions match their style/quality/scope instead of
    # drifting into generic filler.
    exemplars: list[QuestionExemplar]


class GeneratedQuestion(BaseModel):
    category: str
    prompt: str


class GenerateQuestionsResponse(BaseModel):
    questions: list[GeneratedQuestion]


class GradeAnswerRequest(BaseModel):
    prompt: str
    category: str | None = None
    answer_text: str


class GradeAnswerResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    strengths: list[str]
    improvement_areas: list[str]
    summary: str
