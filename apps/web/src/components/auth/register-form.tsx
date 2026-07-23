"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
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

type Step = "details" | "code";

export function RegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: a plain API call (not signIn) — creates the account and has
  // the backend email a code. A password only proves the user chose one;
  // this is what proves they actually control the email address.
  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/register", { name, email, password });
      setStep("code");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't create that account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: the exact same verification signIn() uses for logging in —
  // re-checks the password and the emailed code together.
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          {step === "details"
            ? "Start getting AI feedback on your resume and interviews."
            : `Enter the code we sent to ${email}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {step === "details" ? (
          <>
            <form
              onSubmit={handleDetailsSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="register-name">Name</Label>
                <Input
                  id="register-name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="register-code">Verification code</Label>
              <Input
                id="register-code"
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
              {isSubmitting ? "Verifying…" : "Verify & create account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("details");
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
