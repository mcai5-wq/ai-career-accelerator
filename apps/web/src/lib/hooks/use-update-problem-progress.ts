"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type {
  ProblemProgressStatus,
  TechnicalPrepProblemProgress,
} from "@/types/technical-prep";

interface UpdateProblemProgressInput {
  sessionId: string;
  problemId: string;
  status: ProblemProgressStatus;
}

export function useUpdateProblemProgress() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, problemId, status }: UpdateProblemProgressInput) =>
      apiClient.patch<TechnicalPrepProblemProgress>(
        `/technical-prep/${sessionId}/problems/${problemId}`,
        { status },
        { token: session?.accessToken }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["technical-prep-sessions", variables.sessionId],
      });
    },
  });
}
