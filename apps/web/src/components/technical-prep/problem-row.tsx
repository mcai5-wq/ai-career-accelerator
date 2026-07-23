"use client";

import { ExternalLink } from "lucide-react";
import { useUpdateProblemProgress } from "@/lib/hooks/use-update-problem-progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ProblemDifficulty,
  ProblemProgressStatus,
  TechnicalPrepProblemProgress,
} from "@/types/technical-prep";

const statusOptions: { value: ProblemProgressStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SOLVED", label: "Solved" },
  { value: "SKIPPED", label: "Skipped" },
];

const difficultyVariant: Record<
  ProblemDifficulty,
  "secondary" | "default" | "destructive"
> = {
  EASY: "secondary",
  MEDIUM: "default",
  HARD: "destructive",
};

interface ProblemRowProps {
  sessionId: string;
  progress: TechnicalPrepProblemProgress;
}

export function ProblemRow({ sessionId, progress }: ProblemRowProps) {
  const updateProgress = useUpdateProblemProgress();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
      <a
        href={progress.problem.externalUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-1 text-sm font-medium hover:underline"
      >
        {progress.problem.title}
        <ExternalLink className="h-3 w-3" />
      </a>
      <Badge variant={difficultyVariant[progress.problem.difficulty]}>
        {progress.problem.difficulty}
      </Badge>
      {progress.problem.topics.slice(0, 3).map((topic) => (
        <Badge key={topic} variant="outline">
          {topic}
        </Badge>
      ))}

      <select
        value={progress.status}
        disabled={updateProgress.isPending}
        onChange={(event) =>
          updateProgress.mutate({
            sessionId,
            problemId: progress.problem.id,
            status: event.target.value as ProblemProgressStatus,
          })
        }
        className={cn(
          "ml-auto h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
