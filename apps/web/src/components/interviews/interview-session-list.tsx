"use client";

import Link from "next/link";
import { useInterviewSessions } from "@/lib/hooks/use-interview-sessions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewStatus } from "@/types/interview";

const statusVariant: Record<InterviewStatus, "default" | "secondary" | "outline"> = {
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  ABANDONED: "outline",
};

export function InterviewSessionList() {
  const { data: sessions, isPending, isError } = useInterviewSessions();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading sessions…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the API yet. Once the backend is live, your
        interview sessions will show up here.
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No interview sessions yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sessions.map((interviewSession) => (
        <Link
          key={interviewSession.id}
          href={`/dashboard/interviews/${interviewSession.id}`}
          className="block"
        >
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">
                {interviewSession.role}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{interviewSession.difficulty}</Badge>
              <Badge variant={statusVariant[interviewSession.status]}>
                {interviewSession.status.replace("_", " ")}
              </Badge>
              {interviewSession.overallScore !== null && (
                <Badge variant="outline">
                  Score: {interviewSession.overallScore}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
