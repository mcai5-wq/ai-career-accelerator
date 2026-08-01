"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { ResumeAnalysis } from "@/types/resume";

interface AnalyzeResumeInput {
  resumeId: string;
  jobTitle: string;
  company?: string;
  jobDescriptionText?: string;
}

export function useAnalyzeResume() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resumeId, ...body }: AnalyzeResumeInput) =>
      apiClient.post<ResumeAnalysis>(`/resumes/${resumeId}/analyze`, body, {
        token: session?.accessToken,
        // Longer than the 20s default — a full resume takes more input than one question.
        signal: AbortSignal.timeout(45_000),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["resumes", variables.resumeId],
      });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
