import { z } from "zod";

// Split from lib/env.ts — this is the only env module safe to import from
// Client Components, since only NEXT_PUBLIC_ vars actually reach the browser.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
