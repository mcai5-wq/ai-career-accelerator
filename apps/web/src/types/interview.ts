// Frontend-facing subset of the NestJS `InterviewSession`/`InterviewQuestion`/
// `InterviewAnswer` models (see apps/api/prisma/schema.prisma). Backed by
// apps/api/src/interviews:
//   GET  /interviews
//   POST /interviews                                    { role, company, difficulty }
//   GET  /interviews/:id
//   POST /interviews/:id/questions/:questionId/answer   { answerText }
// Questions are a mix of a static per-difficulty bank (question-bank.ts)
// and live AI generation (ai-service, using `company` to skew toward that
// company's known interview style — see prompts/interviews.py) — `company`
// is required for exactly that reason, not just `role` in the abstract.
export type InterviewDifficulty = "JUNIOR" | "MID" | "SENIOR";
export type InterviewStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface InterviewSession {
  id: string;
  role: string;
  company: string | null;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  overallScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface InterviewAnswer {
  id: string;
  answerText: string;
  score: number | null;
  strengths: string[];
  improvementAreas: string[];
}

export interface InterviewQuestion {
  id: string;
  orderIndex: number;
  prompt: string;
  category: string | null;
  answer: InterviewAnswer | null;
}

export interface InterviewSessionDetail extends InterviewSession {
  questions: InterviewQuestion[];
}
