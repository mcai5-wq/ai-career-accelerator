from pydantic import BaseModel, Field


class AnalyzeTopicsRequest(BaseModel):
    company: str
    target_role: str
    # The fixed vocabulary to weight from (CATALOG_TOPIC_TAGS on the NestJS
    # side, plus "System Design"/"Behavioral") — constrains the model to
    # topics we can actually match back to real practice problems, instead
    # of letting it invent free-form names.
    available_topics: list[str]


class TopicWeight(BaseModel):
    topic: str
    weight: int = Field(ge=0, le=100)
    rationale: str


class AnalyzeTopicsResponse(BaseModel):
    topic_breakdown: list[TopicWeight]
