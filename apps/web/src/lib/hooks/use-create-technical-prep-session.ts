"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { TechnicalPrepSession } from "@/types/technical-prep";

interface CreateTechnicalPrepSessionInput {
  companyNameRaw: string;
  targetRole?: string;
}

export function useCreateTechnicalPrepSession() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTechnicalPrepSessionInput) =>
      apiClient.post<TechnicalPrepSession>("/technical-prep", input, {
        token: session?.accessToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical-prep-sessions"] });
    },
  });
}
