"use client";

import { useInterviewSession } from "@/lib/hooks/use-interview-session";
import { Badge } from "@/components/ui/badge";
import { InterviewQuestionCard } from "./interview-question-card";

interface InterviewSessionDetailProps {
  sessionId: string;
}

export function InterviewSessionDetail({
  sessionId,
}: InterviewSessionDetailProps) {
  const { data: interviewSession, isPending, isError } =
    useInterviewSession(sessionId);

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the API yet. Once the backend is live, this
        session will load here.
      </p>
    );
  }

  const sortedQuestions = [...interviewSession.questions].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">
          {interviewSession.role}
          {interviewSession.company ? ` at ${interviewSession.company}` : ""}
        </h1>
        <Badge variant="secondary">{interviewSession.difficulty}</Badge>
        <Badge variant="outline">
          {interviewSession.status.replace("_", " ")}
        </Badge>
        {interviewSession.overallScore !== null && (
          <Badge variant="outline">
            Score: {interviewSession.overallScore}
          </Badge>
        )}
      </div>

      {sortedQuestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions generated for this session yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedQuestions.map((question, index) => (
            <InterviewQuestionCard
              key={question.id}
              sessionId={sessionId}
              question={question}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
