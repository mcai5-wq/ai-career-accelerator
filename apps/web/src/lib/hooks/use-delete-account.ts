"use client";

import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

export function useDeleteAccount() {
  const { data: session } = useSession();

  return useMutation({
    mutationFn: () =>
      apiClient.delete<void>("/auth/me", { token: session?.accessToken }),
  });
}
