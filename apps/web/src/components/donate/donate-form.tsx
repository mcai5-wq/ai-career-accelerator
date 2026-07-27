"use client";

import { useState } from "react";
import { useCreateDonationCheckout } from "@/lib/hooks/use-create-donation-checkout";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS_CENTS = [500, 1000, 2500, 5000];

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export function DonateForm() {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const createCheckout = useCreateDonationCheckout();

  const amountCents = customAmount
    ? Math.round(Number.parseFloat(customAmount) * 100)
    : selectedPreset;

  const isValidAmount =
    typeof amountCents === "number" &&
    Number.isFinite(amountCents) &&
    amountCents >= 100 &&
    amountCents <= 100_000;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidAmount || !amountCents) return;

    createCheckout.mutate(
      { amountCents },
      {
        onSuccess: (data) => {
          // Full navigation, not a client-side route — Stripe Checkout is
          // a page it hosts, not something we render.
          window.location.href = data.url;
        },
      }
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Support this project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS_CENTS.map((cents) => (
              <button
                key={cents}
                type="button"
                onClick={() => {
                  setSelectedPreset(cents);
                  setCustomAmount("");
                }}
                aria-pressed={selectedPreset === cents && !customAmount}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors",
                  selectedPreset === cents && !customAmount
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-transparent text-foreground hover:bg-muted"
                )}
              >
                {formatDollars(cents)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="donate-custom-amount">Or enter a custom amount (USD)</Label>
            <Input
              id="donate-custom-amount"
              type="number"
              min="1"
              max="1000"
              step="1"
              placeholder="e.g. 15"
              value={customAmount}
              onChange={(event) => {
                setCustomAmount(event.target.value);
                setSelectedPreset(null);
              }}
            />
          </div>

          {createCheckout.isError && (
            <p className="text-sm text-destructive">
              {createCheckout.error instanceof ApiError
                ? createCheckout.error.message
                : "Couldn't start checkout."}
            </p>
          )}

          <Button type="submit" disabled={!isValidAmount || createCheckout.isPending}>
            {createCheckout.isPending
              ? "Redirecting to checkout…"
              : amountCents
                ? `Donate ${formatDollars(amountCents)}`
                : "Donate"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be redirected to Stripe to complete your donation securely.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
