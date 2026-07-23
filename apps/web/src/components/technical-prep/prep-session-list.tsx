"use client";

import Link from "next/link";
import { useTechnicalPrepSessions } from "@/lib/hooks/use-technical-prep-sessions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PrepSessionStatus } from "@/types/technical-prep";

const statusVariant: Record<
  PrepSessionStatus,
  "secondary" | "default" | "destructive"
> = {
  PENDING: "secondary",
  READY: "default",
  FAILED: "destructive",
};

export function PrepSessionList() {
  const { data: sessions, isPending, isError } = useTechnicalPrepSessions();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading sessions…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the API yet. Once the backend is live, your
        technical prep sessions will show up here.
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No technical prep sessions yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sessions.map((prepSession) => (
        <Link
          key={prepSession.id}
          href={`/dashboard/technical-prep/${prepSession.id}`}
          className="block"
        >
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">
                {prepSession.companyNameRaw ?? "Technical prep"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {prepSession.targetRole && (
                <Badge variant="secondary">{prepSession.targetRole}</Badge>
              )}
              <Badge variant={statusVariant[prepSession.status]}>
                {prepSession.status}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
