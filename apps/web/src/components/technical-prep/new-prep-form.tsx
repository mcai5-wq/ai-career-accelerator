"use client";

import { useState } from "react";
import { useCreateTechnicalPrepSession } from "@/lib/hooks/use-create-technical-prep-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewPrepForm() {
  const [companyNameRaw, setCompanyNameRaw] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const createSession = useCreateTechnicalPrepSession();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createSession.mutate(
      { companyNameRaw, targetRole },
      {
        onSuccess: () => {
          setCompanyNameRaw("");
          setTargetRole("");
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start technical prep</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prep-company">Company</Label>
            <Input
              id="prep-company"
              placeholder="e.g. Stripe"
              required
              value={companyNameRaw}
              onChange={(event) => setCompanyNameRaw(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prep-role">Target role</Label>
            <Input
              id="prep-role"
              placeholder="e.g. New Grad SWE"
              required
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
            />
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
            {createSession.isPending ? "Starting…" : "Start prep"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
