"use client";

import { useResume } from "@/lib/hooks/use-resume";
import { ResumeAnalysisForm } from "./resume-analysis-form";
import { ResumeAnalysisList } from "./resume-analysis-list";

interface ResumeDetailProps {
  resumeId: string;
}

export function ResumeDetail({ resumeId }: ResumeDetailProps) {
  const { data: resume, isPending, isError } = useResume(resumeId);

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading resume…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the API yet. Once the backend is live, this
        resume will load here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{resume.title}</h1>
        <p className="text-sm text-muted-foreground">
          Scan this resume against a target role to get an ATS-style
          compatibility score and feedback.
        </p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 className="mb-3 text-lg font-medium">Scan history</h2>
          <ResumeAnalysisList analyses={resume.analyses} />
        </div>
        <ResumeAnalysisForm resumeId={resumeId} />
      </section>
    </div>
  );
}
