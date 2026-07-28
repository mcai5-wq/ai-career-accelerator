"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { ResumeDetail } from "@/types/resume";

export function useResume(id: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["resumes", id],
    queryFn: () =>
      apiClient.get<ResumeDetail>(`/resumes/${id}`, {
        token: session?.accessToken,
      }),
    enabled: !!session?.accessToken,
  });
}
