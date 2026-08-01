"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { Resume } from "@/types/resume";

interface UploadResumeInput {
  title: string;
  file: File;
}

export function useUploadResume() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, file }: UploadResumeInput) => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("file", file);

      return apiClient.post<Resume>("/resumes/upload", formData, {
        token: session?.accessToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
