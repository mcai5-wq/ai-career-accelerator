import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    // Optional: only the Credentials flow currently returns a NestJS-issued
    // token (see lib/auth.ts). Google sign-in has no backend session until
    // the API adds an OAuth token-exchange endpoint.
    accessToken?: string;
    // Set when the refresh token itself is no longer usable (expired/
    // revoked) — the jwt callback couldn't get a new access token, so this
    // session is effectively dead. See components/providers.tsx.
    error?: "RefreshTokenError";
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    id: string;
    // Epoch ms the current accessToken expires at — lets the jwt callback
    // decide when to refresh without re-decoding the token every time.
    accessTokenExpires?: number;
    error?: "RefreshTokenError";
  }
}