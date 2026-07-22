import "server-only";
import { z } from "zod";
import { publicEnv } from "@/lib/env.public";

// `server-only` makes any accidental import of this file from client code
// fail the build immediately, instead of the silent runtime crash this
// module used to cause (see lib/env.public.ts for the full story).
const serverEnvSchema = z.object({
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Shared secret for the server-to-server call to the NestJS OAuth
  // exchange endpoint. Optional so the app still boots without Google set
  // up; the exchange itself just fails closed (see lib/auth.ts) if unset.
  INTERNAL_API_KEY: z.string().optional(),
});

const serverEnv = serverEnvSchema.parse({
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
});

export const env = { ...serverEnv, ...publicEnv };
