from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.internal_auth import require_internal_api_key
from app.schemas.resumes import AnalyzeResumeRequest, AnalyzeResumeResponse
from app.services.ai_common import AiNotConfiguredError, AiServiceError
from app.services.resume_ai_service import analyze_resume

router = APIRouter(prefix="/resumes", tags=["resumes"], dependencies=[Depends(require_internal_api_key)])


@router.post("/analyze", response_model=AnalyzeResumeResponse)
def analyze_resume_route(request: AnalyzeResumeRequest) -> AnalyzeResumeResponse:
    try:
        return analyze_resume(request)
    except AiNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except AiServiceError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
