"use client";

import { useState } from "react";
import { useUploadResume } from "@/lib/hooks/use-upload-resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function NewResumeForm() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Bumping this key remounts the file input, clearing its selection —
  // simpler than fighting an uncontrolled <input type="file">'s value.
  const [inputKey, setInputKey] = useState(0);
  const uploadResume = useUploadResume();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setValidationError(null);
    setFile(null);

    if (!selected) return;

    if (selected.type !== "application/pdf") {
      setValidationError("Only PDF files are supported.");
      return;
    }

    if (selected.size > MAX_FILE_BYTES) {
      setValidationError("That file is too large (max 5MB).");
      return;
    }

    setFile(selected);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setValidationError("Choose a PDF file first.");
      return;
    }

    uploadResume.mutate(
      { title, file },
      {
        onSuccess: () => {
          setTitle("");
          setFile(null);
          setInputKey((key) => key + 1);
        },
      }
    );
  }

  const errorMessage = validationError ?? uploadResume.error?.message ?? null;

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
            <Label htmlFor="resume-file">Resume (PDF)</Label>
            <Input
              key={inputKey}
              id="resume-file"
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button
            type="submit"
            disabled={uploadResume.isPending}
            className="self-start"
          >
            {uploadResume.isPending ? "Uploading…" : "Upload resume"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
