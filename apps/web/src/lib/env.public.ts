import { z } from "zod";

// Split from lib/env.ts on purpose: this is the only env module safe to
// import from Client Components. `NEXT_PUBLIC_`-prefixed vars are the only
// ones Next.js actually inlines into the browser bundle — every other
// `process.env.X` reference resolves to `undefined` in the browser, which
// made lib/env.ts's full schema (NEXTAUTH_SECRET, etc.) throw at hydration
// time when api-client.ts (imported by client hooks) pulled it in.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
