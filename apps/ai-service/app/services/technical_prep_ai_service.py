import json
import logging

import openai

from app.core.config import settings
from app.core.openai_client import get_ai_client
from app.prompts.technical_prep import ANALYZE_TOPICS_SYSTEM_PROMPT, build_analyze_topics_user_prompt
from app.schemas.technical_prep import AnalyzeTopicsRequest, AnalyzeTopicsResponse
from app.services.ai_common import AiServiceError, require_ai_configured

logger = logging.getLogger(__name__)


def analyze_topics(request: AnalyzeTopicsRequest) -> AnalyzeTopicsResponse:
    require_ai_configured()

    user_prompt = build_analyze_topics_user_prompt(
        company=request.company,
        target_role=request.target_role,
        available_topics=request.available_topics,
    )

    try:
        completion = get_ai_client().chat.completions.create(
            model=settings.ai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ANALYZE_TOPICS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_content = completion.choices[0].message.content
        parsed = json.loads(raw_content)
        return AnalyzeTopicsResponse.model_validate(parsed)
    except openai.OpenAIError as error:
        logger.error("AI call failed during technical prep topic analysis: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during technical prep topic analysis: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error
