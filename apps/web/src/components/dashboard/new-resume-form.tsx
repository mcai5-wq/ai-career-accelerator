"use client";

import { useState } from "react";
import { useCreateResume } from "@/lib/hooks/use-create-resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewResumeForm() {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const createResume = useCreateResume();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    createResume.mutate(
      { title, rawText },
      {
        onSuccess: () => {
          setTitle("");
          setRawText("");
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a resume</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="resume-title">Title</Label>
            <Input
              id="resume-title"
              placeholder="e.g. Backend Engineer — 2026"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="resume-text">Resume text</Label>
            <Textarea
              id="resume-text"
              placeholder="Paste your resume text here…"
              required
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
            />
          </div>
          {createResume.isError && (
            <p className="text-sm text-destructive">
              Couldn&apos;t save that resume. Try again.
            </p>
          )}
          <Button
            type="submit"
            disabled={createResume.isPending}
            className="self-start"
          >
            {createResume.isPending ? "Saving…" : "Save resume"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
