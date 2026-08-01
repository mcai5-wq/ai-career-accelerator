from pydantic import BaseModel, Field


class QuestionExemplar(BaseModel):
    category: str
    prompt: str


class GenerateQuestionsRequest(BaseModel):
    role: str
    company: str
    difficulty: str  # "JUNIOR" | "MID" | "SENIOR"
    count: int = Field(gt=0, le=10)
    # Style examples so generated questions match the bank's quality/scope.
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
