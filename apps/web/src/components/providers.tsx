"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { getQueryClient } from "@/lib/query-client";

// If the refresh token itself is expired/revoked, lib/auth.ts's jwt
// callback can no longer renew the access token and sets session.error.
// Without this, the user would be stuck "logged in" with a session that
// 401s on every request instead of being sent back to /login.
function SessionErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshTokenError") {
      void signOut({ callbackUrl: "/login" });
    }
  }, [session?.error]);

  return null;
}

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const queryClient = getQueryClient();

  return (
    <SessionProvider session={session}>
      <SessionErrorHandler />
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
