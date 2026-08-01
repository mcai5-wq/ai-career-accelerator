from pydantic import BaseModel, Field


class AnalyzeTopicsRequest(BaseModel):
    company: str
    target_role: str
    # Fixed vocabulary the model must choose from (see CATALOG_TOPIC_TAGS on
    # the NestJS side) so topics always map back to real practice problems.
    available_topics: list[str]


class TopicWeight(BaseModel):
    topic: str
    weight: int = Field(ge=0, le=100)
    rationale: str


class AnalyzeTopicsResponse(BaseModel):
    topic_breakdown: list[TopicWeight]
