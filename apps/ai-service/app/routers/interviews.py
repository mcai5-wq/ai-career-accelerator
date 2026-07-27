from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.internal_auth import require_internal_api_key
from app.schemas.interviews import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GradeAnswerRequest,
    GradeAnswerResponse,
)
from app.services.interview_ai_service import (
    AiNotConfiguredError,
    AiServiceError,
    generate_questions,
    grade_answer,
)

router = APIRouter(prefix="/interviews", tags=["interviews"], dependencies=[Depends(require_internal_api_key)])


@router.post("/questions/generate", response_model=GenerateQuestionsResponse)
def generate_questions_route(request: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    try:
        return generate_questions(request)
    except AiNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except AiServiceError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error


@router.post("/answers/grade", response_model=GradeAnswerResponse)
def grade_answer_route(request: GradeAnswerRequest) -> GradeAnswerResponse:
    try:
        return grade_answer(request)
    except AiNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except AiServiceError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
