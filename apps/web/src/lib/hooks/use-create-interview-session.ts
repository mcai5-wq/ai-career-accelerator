"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { InterviewDifficulty, InterviewSession } from "@/types/interview";

interface CreateInterviewSessionInput {
  role: string;
  company: string;
  difficulty: InterviewDifficulty;
}

export function useCreateInterviewSession() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInterviewSessionInput) =>
      apiClient.post<InterviewSession>("/interviews", input, {
        token: session?.accessToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-sessions"] });
    },
  });
}
