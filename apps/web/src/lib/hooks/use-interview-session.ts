"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { InterviewSessionDetail } from "@/types/interview";

export function useInterviewSession(id: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["interview-sessions", id],
    queryFn: () =>
      apiClient.get<InterviewSessionDetail>(`/interviews/${id}`, {
        token: session?.accessToken,
      }),
    enabled: !!session?.accessToken,
  });
}
