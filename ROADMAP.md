# Roadmap

Lightweight running notes on what's built vs. planned. Not a commitment/timeline doc — just a place to park decisions before they're forgotten.

## Done

- Frontend auth shell (Next.js + Auth.js + TanStack Query + shadcn/ui) — login, protected dashboard, session wiring.
- Backend auth foundation (NestJS + Prisma + Postgres) — register/login/refresh, JWT guard, `/auth/me`.
- Resumes module (backend CRUD + frontend list/create UI).

## Planned

### Interview evaluation: audio + video recording
- User can choose to answer interview questions via **audio recording or video recording**.
- If **video** is chosen, the browser must request camera (and mic) permission before the session starts — handle the "permission denied" case explicitly rather than failing silently.
- The AI must be able to grade **both** modes (not just transcribe-then-grade text — actual audio/video-aware evaluation, e.g. tone/delivery for audio, presence/eye contact for video, on top of content).
- Not scoped to a specific backend/service yet — will likely involve `apps/ai-service` (the Python service) for the actual grading model, plus new Prisma fields on `InterviewAnswer`/`InterviewSession` for storing recording metadata (media type, storage URL, duration).
- Flagged 2026-07-22 during a planning conversation — not being built yet, just don't want it lost before the Interview module is scoped.
