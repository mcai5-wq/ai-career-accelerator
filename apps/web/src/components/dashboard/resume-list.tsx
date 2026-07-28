"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useDeleteResume } from "@/lib/hooks/use-delete-resume";
import { useResumes } from "@/lib/hooks/use-resumes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResumeList() {
  const { data: resumes, isPending, isError } = useResumes();
  const deleteResume = useDeleteResume();

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
      {resumes.map((resume) => {
        const isDeletingThis =
          deleteResume.isPending && deleteResume.variables === resume.id;

        return (
          <Card key={resume.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className="hover:underline"
                >
                  {resume.title}
                </Link>
              </CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${resume.title}`}
                  disabled={isDeletingThis}
                  onClick={() => {
                    if (window.confirm(`Delete "${resume.title}"?`)) {
                      deleteResume.mutate(resume.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/resumes/${resume.id}`}>
                <Badge variant="secondary">
                  {resume.analyses.length}{" "}
                  {resume.analyses.length === 1 ? "analysis" : "analyses"}
                </Badge>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
