// Frontend-facing subset of the NestJS `InterviewSession`/`InterviewQuestion`/
// `InterviewAnswer` models (see apps/api/prisma/schema.prisma). Backed by
// apps/api/src/interviews:
//   GET  /interviews
//   POST /interviews                                    { role, difficulty }
//   GET  /interviews/:id
//   POST /interviews/:id/questions/:questionId/answer   { answerText }
// Questions come from a static per-difficulty bank (question-bank.ts), not
// live AI generation — scoring/feedback is also not wired up yet, so
// `answer.score` stays null and the UI's "Feedback pending…" state is what
// actually renders once an answer is submitted.
export type InterviewDifficulty = "JUNIOR" | "MID" | "SENIOR";
export type InterviewStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface InterviewSession {
  id: string;
  role: string;
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
