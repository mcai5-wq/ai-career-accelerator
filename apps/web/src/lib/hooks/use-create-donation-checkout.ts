"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateCheckoutSessionResponse } from "@/types/donation";

interface CreateDonationCheckoutInput {
  amountCents: number;
}

// No token — donations are anonymous, no session required.
export function useCreateDonationCheckout() {
  return useMutation({
    mutationFn: (input: CreateDonationCheckoutInput) =>
      apiClient.post<CreateCheckoutSessionResponse>("/donations/checkout", input),
  });
}
