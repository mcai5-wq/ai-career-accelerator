import json
import logging

import openai

from app.core.config import settings
from app.core.openai_client import get_openai_client
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

logger = logging.getLogger(__name__)


class AiNotConfiguredError(Exception):
    """Raised when no real OPENAI_API_KEY is set — callers should turn this into a 503."""


class AiServiceError(Exception):
    """Raised when OpenAI is configured but the call itself failed."""


def _require_configured() -> None:
    if not settings.openai_configured:
        raise AiNotConfiguredError("OPENAI_API_KEY is not configured.")


def generate_questions(request: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    _require_configured()

    user_prompt = build_generate_questions_user_prompt(
        role=request.role,
        difficulty=request.difficulty,
        count=request.count,
        exemplars=request.exemplars,
    )

    try:
        completion = get_openai_client().chat.completions.create(
            model=settings.openai_model,
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
        logger.error("OpenAI call failed during question generation: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during question generation: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error


def grade_answer(request: GradeAnswerRequest) -> GradeAnswerResponse:
    _require_configured()

    user_prompt = build_grade_answer_user_prompt(
        prompt=request.prompt,
        category=request.category,
        answer_text=request.answer_text,
    )

    try:
        completion = get_openai_client().chat.completions.create(
            model=settings.openai_model,
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
        logger.error("OpenAI call failed during answer grading: %s", error)
        raise AiServiceError(str(error)) from error
    except (json.JSONDecodeError, ValueError) as error:
        logger.error("Malformed model output during answer grading: %s", error)
        raise AiServiceError("Model returned an unparseable response.") from error
