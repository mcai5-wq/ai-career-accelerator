"use client";

import { useTechnicalPrepSession } from "@/lib/hooks/use-technical-prep-session";
import { Badge } from "@/components/ui/badge";
import { ProblemRow } from "./problem-row";
import { TopicBreakdown } from "./topic-breakdown";

interface PrepSessionDetailProps {
  sessionId: string;
}

export function PrepSessionDetail({ sessionId }: PrepSessionDetailProps) {
  const { data: prepSession, isPending, isError } =
    useTechnicalPrepSession(sessionId);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">
          {prepSession.companyNameRaw ?? "Technical prep"}
        </h1>
        {prepSession.targetRole && (
          <Badge variant="secondary">{prepSession.targetRole}</Badge>
        )}
        <Badge variant="outline">{prepSession.status}</Badge>
      </div>

      {prepSession.status === "PENDING" && (
        <p className="text-sm text-muted-foreground">
          Generating your topic breakdown…
        </p>
      )}

      {prepSession.status === "FAILED" && (
        <p className="text-sm text-destructive">
          Couldn&apos;t generate a topic breakdown for this company. Try
          starting a new session.
        </p>
      )}

      {prepSession.topicBreakdown && prepSession.topicBreakdown.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Topic breakdown</h2>
          <TopicBreakdown topics={prepSession.topicBreakdown} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Practice problems</h2>
        {prepSession.problems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No practice problems assigned yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {prepSession.problems.map((progress) => (
              <ProblemRow
                key={progress.id}
                sessionId={sessionId}
                progress={progress}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
