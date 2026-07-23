"use client";

import { useState } from "react";
import { useCreateInterviewSession } from "@/lib/hooks/use-create-interview-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultySelect } from "./difficulty-select";
import type { InterviewDifficulty } from "@/types/interview";

export function NewInterviewForm() {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("MID");
  const createSession = useCreateInterviewSession();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createSession.mutate(
      { role, difficulty },
      { onSuccess: () => setRole("") }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start a new interview</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="interview-role">Role</Label>
            <Input
              id="interview-role"
              placeholder="e.g. Backend Engineer"
              required
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Difficulty</Label>
            <DifficultySelect value={difficulty} onChange={setDifficulty} />
          </div>
          {createSession.isError && (
            <p className="text-sm text-destructive">
              {createSession.error?.message ?? "Couldn't start that session."}
            </p>
          )}
          <Button
            type="submit"
            disabled={createSession.isPending}
            className="self-start"
          >
            {createSession.isPending ? "Starting…" : "Start interview"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
