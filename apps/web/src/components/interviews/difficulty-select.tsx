"use client";

import { cn } from "@/lib/utils";
import type { InterviewDifficulty } from "@/types/interview";

const options: { value: InterviewDifficulty; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MID", label: "Mid" },
  { value: "SENIOR", label: "Senior" },
];

interface DifficultySelectProps {
  value: InterviewDifficulty;
  onChange: (value: InterviewDifficulty) => void;
}

export function DifficultySelect({ value, onChange }: DifficultySelectProps) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent text-foreground hover:bg-muted"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
