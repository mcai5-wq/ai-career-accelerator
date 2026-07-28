from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.internal_auth import require_internal_api_key
from app.schemas.technical_prep import AnalyzeTopicsRequest, AnalyzeTopicsResponse
from app.services.ai_common import AiNotConfiguredError, AiServiceError
from app.services.technical_prep_ai_service import analyze_topics

router = APIRouter(
    prefix="/technical-prep", tags=["technical-prep"], dependencies=[Depends(require_internal_api_key)]
)


@router.post("/analyze-topics", response_model=AnalyzeTopicsResponse)
def analyze_topics_route(request: AnalyzeTopicsRequest) -> AnalyzeTopicsResponse:
    try:
        return analyze_topics(request)
    except AiNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except AiServiceError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
