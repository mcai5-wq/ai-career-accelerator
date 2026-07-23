"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { InterviewSession } from "@/types/interview";

export function useInterviewSessions() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["interview-sessions"],
    queryFn: () =>
      apiClient.get<InterviewSession[]>("/interviews", {
        token: session?.accessToken,
      }),
    enabled: !!session?.accessToken,
  });
}
