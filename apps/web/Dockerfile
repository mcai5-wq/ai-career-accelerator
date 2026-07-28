# Builds apps/web (Next.js, standalone output) out of the npm-workspaces
# monorepo. Run from the repo root:
#   docker build -f apps/web/Dockerfile -t ai-career-web .
FROM node:24-slim AS builder
WORKDIR /repo

# Manifests only, first — see apps/api/Dockerfile for why both app
# manifests are needed even though this image only builds web.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/web apps/web

# NEXT_PUBLIC_* vars are baked into the client bundle at build time, not
# read at runtime — must be real for production, passed as a build arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# NEXTAUTH_SECRET is validated eagerly at *module import* time
# (lib/env.ts's zod `.parse()` runs whenever anything imports it), which
# `next build`'s page-data-collection step does — so a value has to be
# present here or the build fails, even though nothing during the build
# actually uses it. This is NOT the real secret and never becomes part of
# the running app's behavior: docker-compose.prod.yml injects the real
# NEXTAUTH_SECRET as a container *runtime* env var, which Next.js reads
# fresh via process.env on every request and which overrides this.
ENV NEXTAUTH_SECRET=build-time-placeholder-overridden-at-runtime

RUN npm run build --workspace=web

FROM node:24-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` (next.config.ts) traces only the node_modules this
# app actually needs into .next/standalone — but deliberately excludes
# static assets, which have to be copied in alongside it.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
# apps/web has no public/ directory yet — add this if one is introduced:
# COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
