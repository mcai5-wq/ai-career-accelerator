"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { TechnicalPrepSession } from "@/types/technical-prep";

export function useTechnicalPrepSessions() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["technical-prep-sessions"],
    queryFn: () =>
      apiClient.get<TechnicalPrepSession[]>("/technical-prep", {
        token: session?.accessToken,
      }),
    enabled: !!session?.accessToken,
  });
}
