import json
import logging

import openai

from app.core.config import settings
from app.core.openai_client import get_ai_client
from app.prompts.interviews import (
    GENERATE_QUESTIONS_SYSTEM_PROMPT,
    GRADE_ANSWER_SYSTEM_PROMPT,
    build_generate_questions_user_prompt,
    build_grade_answer_user_prompt,
)
from app.schemas.interviews import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GradeAnswerRequest,
    GradeAnswerResponse,
)
from app.services.ai_common import AiServiceError, require_ai_configured

logger = logging.getLogger(__name__)


def generate_questions(request: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    require_ai_configured()

    user_prompt = build_generate_questions_user_prompt(
        role=request.role,
        difficulty=request.difficulty,
        count=request.count,
        exemplars=request.exemplars,
    )

    try:
        completion = get_ai_client().chat.completions.create(
            model=settings.ai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": GENERATE_QUESTIONS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_content = completion.choices[0].message.content
        parsed = json.loads(raw_content)
        return GenerateQuestionsResponse.model_validate(parsed)
    except openai.OpenAIError as error:
        logger.error("AI call failed during question generation: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during question generation: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error


def grade_answer(request: GradeAnswerRequest) -> GradeAnswerResponse:
    require_ai_configured()

    user_prompt = build_grade_answer_user_prompt(
        prompt=request.prompt,
        category=request.category,
        answer_text=request.answer_text,
    )

    try:
        completion = get_ai_client().chat.completions.create(
            model=settings.ai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": GRADE_ANSWER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw_content = completion.choices[0].message.content
        parsed = json.loads(raw_content)
        return GradeAnswerResponse.model_validate(parsed)
    except openai.OpenAIError as error:
        logger.error("AI call failed during answer grading: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during answer grading: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error
