"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { Resume } from "@/types/resume";

export function useResumes() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["resumes"],
    queryFn: () =>
      apiClient.get<Resume[]>("/resumes", { token: session?.accessToken }),
    enabled: !!session?.accessToken,
  });
}
