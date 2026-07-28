import json
import logging

import openai

from app.core.config import settings
from app.core.openai_client import get_ai_client
from app.prompts.resumes import ANALYZE_RESUME_SYSTEM_PROMPT, build_analyze_resume_user_prompt
from app.schemas.resumes import AnalyzeResumeRequest, AnalyzeResumeResponse
from app.services.ai_common import AiServiceError, require_ai_configured

logger = logging.getLogger(__name__)


def analyze_resume(request: AnalyzeResumeRequest) -> AnalyzeResumeResponse:
    require_ai_configured()

    user_prompt = build_analyze_resume_user_prompt(
        resume_text=request.resume_text,
        job_title=request.job_title,
        company=request.company,
        job_description_text=request.job_description_text,
    )

    try:
        completion = get_ai_client().chat.completions.create(
            model=settings.ai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ANALYZE_RESUME_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_content = completion.choices[0].message.content
        parsed = json.loads(raw_content)
        return AnalyzeResumeResponse.model_validate(parsed)
    except openai.OpenAIError as error:
        logger.error("AI call failed during resume analysis: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during resume analysis: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error
