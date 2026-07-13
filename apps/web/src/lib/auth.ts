import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Vercel preview URLs change per-deploy; trustHost lets Auth.js infer the
  // host from the incoming request instead of requiring a fixed NEXTAUTH_URL.
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
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
    // Runs when JWT is created/updated — embed the NestJS tokens into it
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        // `user.id` is optional on next-auth's base type; ours (via
        // types/next-auth.d.ts) always sets it in `authorize()`/OAuth profile.
        token.id = user.id as string;
      }
      return token;
    },
    // Runs when session is accessed — expose accessToken to the app
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      return session;
    },
  },
  pages: {
    signIn: "/login", // use our custom login page, not Auth.js default
    error: "/login",
  },
});
