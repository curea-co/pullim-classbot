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
#   bun install --production --frozen-lockfile で bun.lock に固定されたランタイム依存のみ取得。
#   bcrypt の native addon が含まれるため build ツールは本ステージで完結させる。
#   bun の symlink 構造 (node_modules/.bun) を /runtime-nm に実体展開する:
#     node_modules/.bun/<pkg>/node_modules/<dep> を node_modules/<dep> にフラット化。
# ============================================================
FROM oven/bun:1-slim AS prod-install

WORKDIR /workspace

# bun install に必要な全 workspace package.json + lockfile をコピー
COPY package.json bun.lock ./
COPY packages/types/package.json       ./packages/types/package.json
COPY packages/auth/package.json        ./packages/auth/package.json
COPY packages/api-client/package.json  ./packages/api-client/package.json
COPY apps/backend/package.json         ./apps/backend/package.json
COPY apps/classbot/package.json        ./apps/classbot/package.json

# bcrypt native addon のビルドと rsync (symlink 実体化コピー用) をインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      python3 make g++ rsync \
    && rm -rf /var/lib/apt/lists/*

# bun.lock に固定された production 依存のみ取得
RUN bun install --production --frozen-lockfile

# bun の node_modules/.bun キャッシュから全パッケージを /runtime-nm にフラット展開する。
# rsync -rL で symlink を実体解決しながらコピー。
# .bun/<pkg+ver>/node_modules/* の各エントリをトップレベルに集約 (先勝ちで重複解決)。
RUN mkdir /runtime-nm && \
    find /workspace/node_modules/.bun -mindepth 2 -maxdepth 2 -name 'node_modules' -type d | \
      while read nm; do \
        rsync -rL --ignore-existing "$nm"/ /runtime-nm/ 2>/dev/null || true; \
      done && \
    rsync -rL --ignore-existing /workspace/apps/backend/node_modules/ /runtime-nm/ 2>/dev/null || true

# ============================================================
# Stage 3: runtime
#   oven/bun:1-slim — prod-install と同じ ABI で bcrypt native addon が動く
# ============================================================
FROM oven/bun:1-slim AS runtime

# 보안: non-root 사용자
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

ENV NODE_ENV=production

# build stage 에서 컴파일된 dist 를 복사
COPY --from=build /workspace/apps/backend/dist ./dist

# prod-install でフラット化した node_modules をコピー
COPY --from=prod-install /runtime-nm ./node_modules

# 소유권 변경
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 4032

# /api/health 헬스체크 — DB 연결 후 Nest 가 응답을 시작하는 시점까지 여유를 둔다
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||4032) + '/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
