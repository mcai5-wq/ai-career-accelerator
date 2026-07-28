from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_health_reports_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_generate_questions_rejects_missing_internal_api_key():
    response = client.post(
        "/interviews/questions/generate",
        json={
            "role": "Backend Engineer",
            "company": "Acme",
            "difficulty": "MID",
            "count": 2,
            "exemplars": [],
        },
    )
    assert response.status_code == 401


def test_generate_questions_returns_503_when_ai_not_configured(monkeypatch):
    # Same behavior AiClientService (on the NestJS side) treats as
    # "unavailable, fall back to the bank" — this is the "not configured"
    # path, not an actual call failure.
    monkeypatch.setattr(settings, "ai_api_key", "gsk_...")

    response = client.post(
        "/interviews/questions/generate",
        headers={"x-internal-api-key": settings.internal_api_key},
        json={
            "role": "Backend Engineer",
            "company": "Acme",
            "difficulty": "MID",
            "count": 2,
            "exemplars": [],
        },
    )

    assert response.status_code == 503


def test_grade_answer_rejects_missing_internal_api_key():
    response = client.post(
        "/interviews/answers/grade",
        json={"prompt": "Explain a hash map.", "category": "coding", "answer_text": "..."},
    )
    assert response.status_code == 401


def test_analyze_resume_rejects_missing_internal_api_key():
    response = client.post(
        "/resumes/analyze",
        json={"resume_text": "...", "job_title": "Software Engineer"},
    )
    assert response.status_code == 401


def test_analyze_resume_returns_503_when_ai_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "gsk_...")

    response = client.post(
        "/resumes/analyze",
        headers={"x-internal-api-key": settings.internal_api_key},
        json={"resume_text": "...", "job_title": "Software Engineer"},
    )

    assert response.status_code == 503


def test_wrong_internal_api_key_is_rejected():
    response = client.post(
        "/interviews/questions/generate",
        headers={"x-internal-api-key": "definitely-wrong"},
        json={
            "role": "Backend Engineer",
            "company": "Acme",
            "difficulty": "MID",
            "count": 2,
            "exemplars": [],
        },
    )
    assert response.status_code == 401
