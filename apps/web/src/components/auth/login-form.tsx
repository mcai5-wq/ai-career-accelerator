"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "@/components/icons/google-icon";

type Step = "credentials" | "code";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: a plain API call (not signIn) — just checks the password and,
  // if correct, has the backend email a code. No session exists yet.
  async function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/login", { email, password });
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: signIn() re-checks the password *and* the code together — this
  // is what actually creates the session.
  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      code,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Incorrect or expired code.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {step === "credentials"
            ? "Access your resume reviews and interview prep."
            : `Enter the code we sent to ${email}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "credentials" ? (
          <>
            <form
              onSubmit={handleCredentialsSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Checking…" : "Continue"}
              </Button>
              <Link
                href="/forgot-password"
                className="text-center text-sm text-muted-foreground hover:underline"
              >
                Forgot your password?
              </Link>
            </form>

            <div className="relative flex items-center justify-center py-1">
              <Separator className="absolute inset-x-0" />
              <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <GoogleIcon className="size-4" />
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-foreground hover:underline"
              >
                Create one
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
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
              {isSubmitting ? "Verifying…" : "Verify & sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("credentials");
                setCode("");
                setError(null);
              }}
            >
              Back
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
