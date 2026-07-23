"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { TechnicalPrepSessionDetail } from "@/types/technical-prep";

export function useTechnicalPrepSession(id: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["technical-prep-sessions", id],
    queryFn: () =>
      apiClient.get<TechnicalPrepSessionDetail>(`/technical-prep/${id}`, {
        token: session?.accessToken,
      }),
    enabled: !!session?.accessToken,
  });
}
