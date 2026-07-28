# Builds apps/api (NestJS) out of the npm-workspaces monorepo. Run from the
# repo root: docker build -f apps/api/Dockerfile -t ai-career-api .
FROM node:24-slim AS builder
WORKDIR /repo

# Manifests only, first — copying just these (not full source) means
# `npm ci` is re-run only when a dependency actually changes, not on every
# code edit, so Docker's layer cache stays useful across builds. Both
# apps/api and apps/web package.json are needed even though this image only
# builds api: npm workspaces resolves the lockfile against every declared
# workspace, and apps/web is the only other real one (packages/* are empty
# scaffolding with no package.json, and ai-service is Python-only — npm
# just skips workspace globs with nothing to find).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Now the real source for the piece this build actually needs.
COPY apps/api apps/api

RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=api

# Strips devDependencies out of the *existing* node_modules (using the
# lockfile already resolved above) instead of a second `npm ci` — avoids
# npm workspaces' occasional flakiness when re-resolving with some
# workspace manifests missing, and keeps the generated Prisma client
# (written into node_modules/.prisma, not a listed dependency) intact.
RUN npm prune --omit=dev

FROM node:24-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=builder --chown=nestjs:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /repo/apps/api/prisma ./apps/api/prisma

USER nestjs
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
