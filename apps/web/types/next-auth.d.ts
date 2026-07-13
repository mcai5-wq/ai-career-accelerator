import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    // Optional: only the Credentials flow currently returns a NestJS-issued
    // token (see lib/auth.ts). Google sign-in has no backend session until
    // the API adds an OAuth token-exchange endpoint.
    accessToken?: string;
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
  }
}