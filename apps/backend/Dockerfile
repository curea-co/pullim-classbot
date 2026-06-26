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
#   backend 패키지만 npm --omit=dev 로 설치해 심볼릭링크 없는 node_modules 를 생성.
#   bun 의 글로벌 .bun 캐시 심볼릭링크 구조를 우회한다.
# ============================================================
FROM node:20-slim AS prod-install

WORKDIR /install

# backend package.json 만 복사 (workspace 의존성 @pullim-classbot/* 는 devOnly 처리)
COPY --from=build /workspace/apps/backend/package.json ./package.json

# @pullim-classbot/types 는 import type 전용 → 런타임 require 없음.
# npm install 시 workspace: 프로토콜을 모르므로 해당 dep 을 제거 후 설치한다.
# jq 없으면 node -e 로 처리.
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); \
  delete pkg.dependencies['@pullim-classbot/types']; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
"
# bcrypt は native addon (node-gyp) を含むため --ignore-scripts は使えない
# python3 + make + g++ が必要; ビルド後 dev ツールはランタイムステージに持ち込まない
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev

# ============================================================
# Stage 3: runtime
#   node:20-slim + 비root 사용자
# ============================================================
FROM node:20-slim AS runtime

# 보안: non-root 사용자
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

ENV NODE_ENV=production

# build stage 에서 컴파일된 dist 를 복사
COPY --from=build /workspace/apps/backend/dist ./dist

# prod-install stage 의 실제 node_modules (symlink 없는 npm 트리)
COPY --from=prod-install /install/node_modules ./node_modules

# 소유권 변경
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 4032

# /api/health 헬스체크 — DB 연결 후 Nest 가 응답을 시작하는 시점까지 여유를 둔다
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||4032) + '/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
