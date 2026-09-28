FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

COPY backend backend
RUN pnpm --filter @cjcrsg-flow/backend build
RUN pnpm --filter @cjcrsg-flow/backend --prod deploy /app

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 3001
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]
