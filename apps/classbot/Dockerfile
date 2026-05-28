# Build context: monorepo root (pullim-classbot/)
# docker buildx build --platform linux/arm64 -f apps/classbot/Dockerfile .
#
# pullim apps/web/Dockerfile + planner 패턴 차용 — bun + workspace + Next.js 16 standalone

# ============================================
# Stage 1: builder
# ============================================
FROM oven/bun:1.3.12-debian AS builder
WORKDIR /app

# manifest 먼저 복사 → install layer 캐시 확보
COPY package.json bun.lock ./
COPY apps/classbot/package.json ./apps/classbot/
COPY packages ./packages
RUN bun install --frozen-lockfile --filter @pullim-classbot/classbot

ENV NEXT_TELEMETRY_DISABLED=1

# 소스 복사 후 빌드 (standalone 출력)
COPY apps/classbot ./apps/classbot
RUN bun --filter @pullim-classbot/classbot build

# ============================================
# Stage 2: runner — 최소 런타임
# ============================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3032
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /bin/bash nextjs

# Next.js standalone 출력물 (monorepo 루트 경로 유지)
# .next/standalone 안에 apps/classbot/server.js 와 의존 node_modules 가 함께 들어있음
COPY --from=builder --chown=nextjs:nodejs /app/apps/classbot/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/classbot/.next/static ./apps/classbot/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/classbot/public ./apps/classbot/public

USER nextjs
EXPOSE 3032

CMD ["node", "apps/classbot/server.js"]
