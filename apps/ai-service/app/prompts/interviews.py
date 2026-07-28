from app.schemas.interviews import QuestionExemplar

GENERATE_QUESTIONS_SYSTEM_PROMPT = """You are an experienced technical interviewer writing new interview \
questions for a software engineering candidate. You will be given a target role, a target company, a \
difficulty level, and a few example questions that are already known to be good. Use the company to \
skew the questions toward what that specific company is known for asking or the domains/technologies \
it's known for (e.g. a company known for heavy system-design loops should get more system-design \
questions; a company known for a particular tech stack should reflect that) — if you don't have \
reliable knowledge of the company's specific interview style, fall back to strong, realistic questions \
for the role and difficulty rather than inventing false specifics about the company. Write NEW \
questions that match the same style, depth, and quality as the examples — do not repeat or lightly \
reword them. Each question must be realistic, specific enough to prompt a real answer, and appropriate \
for the stated difficulty level. Respond with strict JSON matching this shape: \
{"questions": [{"category": "behavioral" | "coding" | "system-design", "prompt": "..."}]}"""


def build_generate_questions_user_prompt(
    role: str, company: str, difficulty: str, count: int, exemplars: list[QuestionExemplar]
) -> str:
    exemplar_lines = "\n".join(
        f'- [{example.category}] {example.prompt}' for example in exemplars
    )
    return (
        f"Role: {role}\n"
        f"Company: {company}\n"
        f"Difficulty: {difficulty}\n"
        f"Number of new questions needed: {count}\n\n"
        f"Example questions already used for this difficulty (write NEW ones in this style, "
        f"do not repeat these):\n{exemplar_lines}"
    )


GRADE_ANSWER_SYSTEM_PROMPT = """You are an experienced technical interviewer grading a candidate's \
spoken/written answer to an interview question. Score the answer from 0-100 based on correctness, \
depth, clarity, and how directly it addresses the question. List concrete strengths and concrete \
improvement areas grounded in what the candidate actually wrote — do not invent details they didn't \
mention. Respond with strict JSON matching this shape: \
{"score": 0-100, "strengths": ["..."], "improvement_areas": ["..."], "summary": "..."}"""


def build_grade_answer_user_prompt(prompt: str, category: str | None, answer_text: str) -> str:
    return (
        f"Question category: {category or 'general'}\n"
        f"Question: {prompt}\n\n"
        f"Candidate's answer:\n{answer_text}"
    )
