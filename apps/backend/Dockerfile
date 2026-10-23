# syntax=docker/dockerfile:1
#
# The API image. Build it from the repo root, since it needs the workspace's
# shared package:
#
#   docker build -f apps/backend/Dockerfile -t portfolio-api .
#
# On start it applies pending migrations (`prisma migrate deploy`, never
# `reset`), then starts the server. A failed migration exits the container, so
# the new deploy never turns healthy and the host keeps the old one serving

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
# same npm the repo pins in devEngines
RUN npm install --global npm@11.13.0 && npm cache clean --force
WORKDIR /repo

# only the API and the workspace packages it depends on
FROM base AS prune
COPY . .
RUN npx --yes turbo@2.10.12 prune backend --docker

FROM base AS build
# dependencies first, so this layer stays cached until a package.json changes.
# Scripts are skipped because the postinstall (prisma generate) needs the
# schema, which only arrives in the next step
COPY --from=prune /repo/out/json/ .
RUN npm ci --ignore-scripts
COPY --from=prune /repo/out/full/ .
RUN npm run db:generate --workspace backend \
 && npx turbo run build --filter=backend \
 && npm prune --omit=dev --ignore-scripts

FROM node:${NODE_VERSION}-slim AS runtime
# Prisma's migration engine needs OpenSSL
RUN apt-get update \
 && apt-get install --yes --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build --chown=node:node /repo .
USER node
WORKDIR /repo/apps/backend
# Render's default web service port
EXPOSE 10000
# calls the Prisma CLI directly since npx would enforce the repo's pinned npm,
# which this runtime image doesn't have
CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
