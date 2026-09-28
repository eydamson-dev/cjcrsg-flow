FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

COPY frontend frontend
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter frontend build

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/frontend/public ./public
COPY --from=build /workspace/frontend/.next/standalone ./
COPY --from=build /workspace/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
CMD ["node", "frontend/server.js"]
