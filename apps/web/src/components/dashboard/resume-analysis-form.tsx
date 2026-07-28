"use client";

import { useState } from "react";
import { useAnalyzeResume } from "@/lib/hooks/use-analyze-resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResumeAnalysisFormProps {
  resumeId: string;
}

export function ResumeAnalysisForm({ resumeId }: ResumeAnalysisFormProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const analyzeResume = useAnalyzeResume();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    analyzeResume.mutate({
      resumeId,
      jobTitle,
      company: company || undefined,
      jobDescriptionText: jobDescriptionText || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analyze against a role</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="analysis-job-title">Job title</Label>
            <Input
              id="analysis-job-title"
              placeholder="e.g. Senior Backend Engineer"
              required
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="analysis-company">Company (optional)</Label>
            <Input
              id="analysis-company"
              placeholder="e.g. Stripe"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="analysis-description">
              Job description (optional)
            </Label>
            <Textarea
              id="analysis-description"
              placeholder="Paste the job posting for a more accurate scan — otherwise the job title alone is used."
              rows={5}
              value={jobDescriptionText}
              onChange={(event) => setJobDescriptionText(event.target.value)}
            />
          </div>
          {analyzeResume.isError && (
            <p className="text-sm text-destructive">
              {analyzeResume.error?.message ?? "Couldn't run that analysis."}
            </p>
          )}
          <Button
            type="submit"
            disabled={analyzeResume.isPending}
            className="self-start"
          >
            {analyzeResume.isPending ? "Scanning…" : "Scan resume"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
