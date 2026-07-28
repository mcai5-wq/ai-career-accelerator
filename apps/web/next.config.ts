import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone — a self-contained server with only the
  // node_modules actually traced as used, instead of shipping the whole
  // monorepo's node_modules in the production Docker image. Only affects
  // `next build` output layout; `next dev` is unaffected. See
  // apps/web/Dockerfile.
  output: "standalone",
};

export default nextConfig;
