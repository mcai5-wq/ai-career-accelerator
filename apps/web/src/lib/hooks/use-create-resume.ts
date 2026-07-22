"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { Resume } from "@/types/resume";

interface CreateResumeInput {
  title: string;
  rawText: string;
}

export function useCreateResume() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateResumeInput) =>
      apiClient.post<Resume>("/resumes", input, {
        token: session?.accessToken,
      }),
    onSuccess: () => {
      // Refetch the list so the new resume shows up without a manual reload.
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
