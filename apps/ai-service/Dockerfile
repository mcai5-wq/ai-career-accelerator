# Run from the repo root: docker build -f apps/ai-service/Dockerfile -t ai-career-ai-service apps/ai-service
FROM python:3.13-slim
WORKDIR /app

RUN groupadd --system --gid 1001 appuser && useradd --system --uid 1001 --gid appuser appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app app

USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
