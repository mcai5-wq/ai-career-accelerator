"use client";

import { useResumes } from "@/lib/hooks/use-resumes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResumeList() {
  const { data: resumes, isPending, isError } = useResumes();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading resumes…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t reach the API yet. Once the backend is live, your
        resumes will show up here.
      </p>
    );
  }

  if (resumes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No resumes uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resumes.map((resume) => (
        <Card key={resume.id}>
          <CardHeader>
            <CardTitle className="text-base">{resume.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {resume.analyses.length} {resume.analyses.length === 1 ? "analysis" : "analyses"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
