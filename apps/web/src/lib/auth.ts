import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

interface OAuthExchangeResult {
  user: { id: string; email: string; name: string | null };
  accessToken: string;
  refreshToken: string;
}

// atob instead of Buffer so this still works if bundled for the Edge
// runtime (proxy.ts imports auth from here). No signature check needed —
// this only decides when to refresh, the API verifies the token for real.
function decodeJwtExpiryMs(jwt: string): number | undefined {
  try {
    const payload = jwt.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64)) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    return data.accessToken;
  } catch {
    return null;
  }
}

// Google only proves identity to Auth.js, not to our own API — this trades
// that verified profile for a real access/refresh pair, creating the user
// if needed.
async function exchangeGoogleProfileForTokens(input: {
  email: string;
  name?: string;
  avatarUrl?: string;
}): Promise<OAuthExchangeResult | null> {
  if (!env.INTERNAL_API_KEY) return null;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/oauth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) return null;
    return (await res.json()) as OAuthExchangeResult;
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Lets Auth.js infer the host per-request instead of a fixed NEXTAUTH_URL.
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              code: credentials.code,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "credentials" && user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.id = user.id as string;
        token.accessTokenExpires = decodeJwtExpiryMs(user.accessToken as string);
        delete token.error;
        return token;
      }

      if (account?.provider === "google" && profile?.email) {
        const backendAuth = await exchangeGoogleProfileForTokens({
          email: profile.email,
          name: profile.name ?? undefined,
          avatarUrl:
            typeof profile.picture === "string" ? profile.picture : undefined,
        });

        if (backendAuth) {
          token.accessToken = backendAuth.accessToken;
          token.refreshToken = backendAuth.refreshToken;
          token.id = backendAuth.user.id;
          token.accessTokenExpires = decodeJwtExpiryMs(backendAuth.accessToken);
          delete token.error;
        }
        // If the exchange failed, the user still gets a session — API calls
        // just won't be authenticated until they retry.
        return token;
      }

      const stillValid =
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires - 60_000;

      const refreshToken = token.refreshToken;
      if (stillValid || !refreshToken) {
        return token;
      }

      const refreshedAccessToken = await refreshAccessToken(refreshToken);
      if (!refreshedAccessToken) {
        // Refresh token itself is dead — providers.tsx signs the user out
        // when it sees this instead of leaving them stuck.
        token.error = "RefreshTokenError";
        return token;
      }

      token.accessToken = refreshedAccessToken;
      token.accessTokenExpires = decodeJwtExpiryMs(refreshedAccessToken);
      delete token.error;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    // The only place the raw refresh token is available server-side before
    // the cookie clears, so it's also the only place that can revoke it.
    async signOut(message) {
      if (!("token" in message) || !message.token) return;
      const { accessToken, refreshToken } = message.token;
      if (!accessToken || !refreshToken) return;

      try {
        await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Best-effort — the cookie still clears either way.
      }
    },
  },
});
