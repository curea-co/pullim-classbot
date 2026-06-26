# ============================================================
# Stage 1: build
#   build context = repo root (bun workspace 전체가 필요)
#   docker build -f apps/backend/Dockerfile -t classbot-backend .
# ============================================================
FROM oven/bun:1-slim AS build

WORKDIR /workspace

# --- 의존성 레이어 캐시 ---
# 모든 workspace 의 package.json + lockfile 을 먼저 복사해 bun install 캐시를 최대화한다
# (lockfile 은 모든 workspace 를 참조하므로 전체 package.json 이 필요)
COPY package.json bun.lock ./
COPY packages/types/package.json       ./packages/types/package.json
COPY packages/auth/package.json        ./packages/auth/package.json
COPY packages/api-client/package.json  ./packages/api-client/package.json
COPY apps/backend/package.json         ./apps/backend/package.json
COPY apps/classbot/package.json        ./apps/classbot/package.json

RUN bun install --frozen-lockfile

# --- 소스 복사 (백엔드 빌드에 필요한 것만) ---
COPY packages/types      ./packages/types
COPY packages/auth       ./packages/auth
COPY packages/api-client ./packages/api-client
COPY apps/backend        ./apps/backend

# --- NestJS 빌드 (nest build → apps/backend/dist) ---
WORKDIR /workspace/apps/backend
RUN bun run build

# ============================================================
# Stage 2: prod-install
#   bun install --production --frozen-lockfile 로 bun.lock 에 고정된 런타임 의존성만 취득.
#   bcrypt 의 native addon 빌드 툴은 본 스테이지에서 완결 (runtime 에는 반입하지 않음).
#   bun 의 symlink 화된 node_modules (.bun 내용주소 스토어 + 상대 symlink) 를
#   그대로 runtime 에 넘긴다. 스토어는 한 번만 저장되어 dedup 된다.
# ============================================================
FROM oven/bun:1-slim AS prod-install

WORKDIR /workspace

# bun install 에 필요한 전 workspace package.json + lockfile 복사
COPY package.json bun.lock ./
COPY packages/types/package.json       ./packages/types/package.json
COPY packages/auth/package.json        ./packages/auth/package.json
COPY packages/api-client/package.json  ./packages/api-client/package.json
COPY apps/backend/package.json         ./apps/backend/package.json
COPY apps/classbot/package.json        ./apps/classbot/package.json

# bcrypt native addon 빌드 툴 (본 스테이지에서 완결)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# bun.lock 에 고정된 production 의존성만, 그것도 backend workspace 범위로만 취득.
# --filter 없으면 FE(classbot) 의존(next/@next-swc 등 ~700MB)까지 .bun 스토어에 깔린다.
RUN bun install --production --frozen-lockfile --filter @pullim-classbot/backend

# ============================================================
# Stage 3: runtime
#   oven/bun:1-slim — prod-install 과 동일 ABI 라 bcrypt native addon 이 동작
# ============================================================
FROM oven/bun:1-slim AS runtime

# 보안: non-root 사용자
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /workspace/apps/backend

ENV NODE_ENV=production

# bun 의 symlink 레이아웃을 그대로 보존하기 위해 workspace 구조를 동일하게 재현한다.
# apps/backend/node_modules 의 상대 symlink (../../../../node_modules/.bun/...) 가
# runtime 에서도 동일 경로로 해소되도록 store 디렉토리(.bun)와 symlink 트리 양쪽을 복사.
# COPY 는 symlink 를 symlink 그대로 보존 → .bun 스토어는 한 번만 저장되어 dedup 된다.
COPY --from=prod-install /workspace/node_modules              /workspace/node_modules
COPY --from=prod-install /workspace/apps/backend/node_modules /workspace/apps/backend/node_modules

# build stage 에서 컴파일된 dist 를 복사
COPY --from=build /workspace/apps/backend/dist ./dist

# 소유권 변경
RUN chown -R appuser:appgroup /workspace

USER appuser

EXPOSE 4032

# /api/health 헬스체크 — DB 연결 후 Nest 가 응답을 시작하는 시점까지 여유를 둔다
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||4032) + '/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
