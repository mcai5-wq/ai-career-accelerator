import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

interface OAuthExchangeResult {
  user: { id: string; email: string; name: string | null };
  accessToken: string;
  refreshToken: string;
}

// Reads the `exp` claim straight out of the JWT payload — no signature
// verification needed here, this is only used to schedule when the jwt
// callback below should refresh, not as a security check (JwtAuthGuard on
// the API does the real verification on every request). Uses atob rather
// than Buffer so this also works if this file is ever bundled for the Edge
// runtime (proxy.ts imports `auth` from here).
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

// Trades a still-valid refresh token for a new access token via the
// existing POST /auth/refresh endpoint.
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

// Trades a Google profile (already verified by Google/Auth.js) for a
// NestJS-issued access/refresh token pair, finding-or-creating the matching
// database user along the way. Authenticated with a shared secret rather
// than a user token, since there's no end-user Bearer token at this point.
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
  // Vercel preview URLs change per-deploy; trustHost lets Auth.js infer the
  // host from the incoming request instead of requiring a fixed NEXTAUTH_URL.
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // `code` isn't a real form field (the app has its own login/register
      // UI) — this object is just type/label metadata; authorize() below
      // is what actually matters.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" },
      },
      // Always the *second* step of the two-step (password + emailed code)
      // flow — for both login AND registration, since a password only
      // proves the user chose one, not that they control this email
      // address. Step one (POST /auth/login or POST /auth/register)
      // happens as a plain API call before this, outside Auth.js, to check
      // credentials / create the account and trigger the email — see
      // login-form.tsx and register-form.tsx.
      // Google sign-in is a completely separate provider, untouched by any
      // of this.
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
    // Only registered when Google OAuth credentials are configured, so local
    // dev / early deploys don't crash before those secrets exist.
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
    // Runs when JWT is created/updated — embed the NestJS tokens into it.
    // `user`/`account`/`profile` are only populated once, right after a
    // fresh sign-in; every later call re-verifies (and, once the access
    // token is close to expiring, refreshes) the existing token. Without
    // this, every request more than JWT_ACCESS_EXPIRES_IN (15m) after login
    // would 401 — there'd be nothing to auto-renew the accessToken.
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "credentials" && user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        // `user.id` is optional on next-auth's base type; ours (via
        // types/next-auth.d.ts) always sets it in `authorize()`.
        token.id = user.id as string;
        token.accessTokenExpires = decodeJwtExpiryMs(user.accessToken as string);
        delete token.error;
        return token;
      }

      if (account?.provider === "google" && profile?.email) {
        // Google sign-in only proves identity to Auth.js — it doesn't hand
        // us a NestJS-issued token. Exchange the verified profile for one,
        // creating (or linking to) a real database user in the process.
        const backendAuth = await exchangeGoogleProfileForTokens({
          email: profile.email,
          name: profile.name ?? undefined,
          avatarUrl:
            typeof profile.picture === "string" ? profile.picture : undefined,
        });

        if (backendAuth) {
          token.accessToken = backendAuth.accessToken;
          token.refreshToken = backendAuth.refreshToken;
          // Overwrite Google's own `sub` with our database user id, so
          // this token lines up with `userId` foreign keys in our schema.
          token.id = backendAuth.user.id;
          token.accessTokenExpires = decodeJwtExpiryMs(backendAuth.accessToken);
          delete token.error;
        }
        // If the exchange failed (backend down, misconfigured key), the
        // user still gets a session — API calls just won't be authenticated
        // until they retry. Fails open on login, closed on data access.
        return token;
      }

      // Not a fresh sign-in — reuse the existing access token as long as
      // it's not close to expiring (refresh 60s early to absorb clock
      // skew/request latency).
      const stillValid =
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires - 60_000;

      const refreshToken = token.refreshToken;
      if (stillValid || !refreshToken) {
        return token;
      }

      const refreshedAccessToken = await refreshAccessToken(refreshToken);
      if (!refreshedAccessToken) {
        // The refresh token itself is expired/revoked — nothing left to do
        // but flag it. components/providers.tsx signs the user out when it
        // sees this instead of leaving them stuck with a session that
        // 401s on every request.
        token.error = "RefreshTokenError";
        return token;
      }

      token.accessToken = refreshedAccessToken;
      token.accessTokenExpires = decodeJwtExpiryMs(refreshedAccessToken);
      delete token.error;
      return token;
    },
    // Runs when session is accessed — expose accessToken to the app
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/login", // use our custom login page, not Auth.js default
    error: "/login",
  },
  events: {
    // Fires server-side, before the session cookie is cleared. For JWT
    // strategy this receives the raw token (with our accessToken/
    // refreshToken) — never the trimmed `session` object — so this is the
    // only place that can revoke both without ever exposing them to the
    // browser (types/next-auth.d.ts intentionally keeps refreshToken off
    // the client-visible Session).
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
        // Best-effort: if the API is unreachable, the browser's cookie is
        // still cleared — the tokens just remain valid until they naturally
        // expire instead of being revoked immediately.
      }
    },
  },
});
