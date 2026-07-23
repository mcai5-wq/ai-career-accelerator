"use client";

import { useInterviewSessions } from "@/lib/hooks/use-interview-sessions";
import { useResumes } from "@/lib/hooks/use-resumes";
import { useTechnicalPrepSessions } from "@/lib/hooks/use-technical-prep-sessions";
import { StatCard } from "./stat-card";

export function DashboardStats() {
  const resumes = useResumes();
  const interviews = useInterviewSessions();
  const technicalPrep = useTechnicalPrepSessions();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        title="Resumes"
        href="/dashboard/resumes"
        value={resumes.data?.length}
        isLoading={resumes.isPending}
        isError={resumes.isError}
        unit="uploaded"
      />
      <StatCard
        title="Interview Sessions"
        href="/dashboard/interviews"
        value={interviews.data?.length}
        isLoading={interviews.isPending}
        isError={interviews.isError}
        unit="sessions"
      />
      <StatCard
        title="Technical Prep"
        href="/dashboard/technical-prep"
        value={technicalPrep.data?.length}
        isLoading={technicalPrep.isPending}
        isError={technicalPrep.isError}
        unit="sessions"
      />
    </div>
  );
}
