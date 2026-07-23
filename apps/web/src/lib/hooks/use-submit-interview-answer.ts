"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { InterviewAnswer } from "@/types/interview";

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  answerText: string;
}

export function useSubmitInterviewAnswer() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, questionId, answerText }: SubmitAnswerInput) =>
      apiClient.post<InterviewAnswer>(
        `/interviews/${sessionId}/questions/${questionId}/answer`,
        { answerText },
        { token: session?.accessToken }
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interview-sessions", variables.sessionId],
      });
    },
  });
}
