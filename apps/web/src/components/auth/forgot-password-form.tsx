"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "email" | "code" | "new-password" | "done";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: always "succeeds" from the frontend's point of view — the API
  // deliberately never reveals whether the email exists or has a password,
  // so this doesn't (and can't) tell the user which case they're in.
  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setStep("code");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: exchanges the emailed code for a short-lived resetToken — the
  // code itself is never sent again in step 3.
  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<{ resetToken: string }>(
        "/auth/forgot-password/verify",
        { email, code }
      );
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Incorrect or expired code."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 3: the resetToken (not the password/code) is what authorizes this.
  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (!resetToken) {
      setError("Something went wrong. Please start over.");
      setStep("email");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't reset your password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          {step === "email" &&
            "Enter your email and we'll send you a code."}
          {step === "code" && `Enter the code we sent to ${email}.`}
          {step === "new-password" && "Choose a new password."}
          {step === "done" && "Your password has been updated."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send code"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-code">Verification code</Label>
              <Input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Verify code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Back
            </Button>
          </form>
        )}

        {step === "new-password" && (
          <form
            onSubmit={handlePasswordSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-new-password">New password</Label>
              <Input
                id="forgot-new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-confirm-password">
                Confirm new password
              </Label>
              <Input
                id="forgot-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        {step === "done" && (
          <Button
            nativeButton={false}
            render={<Link href="/login">Go to sign in</Link>}
          />
        )}
      </CardContent>
    </Card>
  );
}
