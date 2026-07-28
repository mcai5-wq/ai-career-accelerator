// Frontend-facing subset of the NestJS `TechnicalPrepSession`/
// `PracticeProblem`/`TechnicalPrepProblemProgress` models (see
// apps/api/prisma/schema.prisma). Backed by apps/api/src/technical-prep:
//   GET   /technical-prep
//   POST  /technical-prep                              { companyNameRaw, targetRole }
//   GET   /technical-prep/:id
//   PATCH /technical-prep/:id/problems/:problemId       { status }
// Companies are created ad hoc from whatever the user types (no curated
// catalog/matching yet). `topicBreakdown` is generated fresh per company +
// role by the ai-service (falls back to a per-company cache, then a static
// default, if AI is unavailable — see TechnicalPrepService.generateTopicBreakdown).
// Practice problems come from a small fixed catalog
// (practice-problem-catalog.ts) — real, verified problems/URLs are never
// AI-invented — but which ones get selected is weighted by the generated
// breakdown (see TechnicalPrepService.selectProblemsForBreakdown).
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
