// Frontend-facing subset of the NestJS `TechnicalPrepSession`/
// `PracticeProblem`/`TechnicalPrepProblemProgress` models (see
// apps/api/prisma/schema.prisma). Endpoints this expects (not built yet —
// that's tomorrow's backend work):
//   GET   /technical-prep
//   POST  /technical-prep                              { companyNameRaw, targetRole }
//   GET   /technical-prep/:id
//   PATCH /technical-prep/:id/problems/:problemId       { status }
export type PrepSessionStatus = "PENDING" | "READY" | "FAILED";
export type ProblemDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ProblemProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SOLVED"
  | "SKIPPED";

export interface TopicBreakdownEntry {
  topic: string;
  weight: number;
  rationale?: string;
}

export interface TechnicalPrepSession {
  id: string;
  companyNameRaw: string | null;
  targetRole: string | null;
  status: PrepSessionStatus;
  topicBreakdown: TopicBreakdownEntry[] | null;
  createdAt: string;
}

export interface PracticeProblem {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  topics: string[];
  externalUrl: string;
  source: string;
}

export interface TechnicalPrepProblemProgress {
  id: string;
  status: ProblemProgressStatus;
  problem: PracticeProblem;
}

export interface TechnicalPrepSessionDetail extends TechnicalPrepSession {
  problems: TechnicalPrepProblemProgress[];
}
