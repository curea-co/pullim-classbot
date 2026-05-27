# @pullim-classbot/classbot

풀림 클래스봇 — Next.js 16 (App Router) FE. 학생 `/classbot/*` 5 페이지 + 교사 `/teacher/{,classbot,builder}` 3 페이지.

자세한 컨벤션: [CLAUDE.md](CLAUDE.md) · [AGENTS.md](AGENTS.md) · 루트 [/CLAUDE.md](../../CLAUDE.md)

## Getting started

루트에서 (workspace 기준):

```bash
# 1. 의존성 설치 (모노레포 전체)
bun install

# 2. Postgres 로컬 컨테이너 시작 (port 5434)
bun run db:up

# 3. drizzle 마이그레이션 + seed (apps/classbot 안에서)
bun --filter @pullim-classbot/classbot db:migrate
bun --filter @pullim-classbot/classbot db:seed

# 4. dev 서버 (port 3032)
bun --filter @pullim-classbot/classbot dev
# → http://localhost:3032/classbot

# 5. typecheck / lint / test / build
bun --filter @pullim-classbot/classbot typecheck
bun --filter @pullim-classbot/classbot lint
bun --filter @pullim-classbot/classbot test
bun --filter @pullim-classbot/classbot build
```

또는 root alias:

```bash
bun run dev:classbot           # = bun --filter @pullim-classbot/classbot dev
bun run build:classbot
```

## Production verify (Playwright)

```bash
# Local production-shaped run
bun --filter @pullim-classbot/classbot build
bun --filter @pullim-classbot/classbot start
bun --filter @pullim-classbot/classbot test:e2e

# Production hit
PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app \
  bun --filter @pullim-classbot/classbot test:e2e
```

CI 자동화: `.github/workflows/prod-verify.yml` 가 main push / KST 08:00 일일 / 수동 dispatch 시 production 회귀 검증.

## 포트

- FE (Next.js): **3032**
- BE (NestJS): 4032 (Phase β 이후)
- Postgres (docker compose): 5434 → container 5432

## 디렉터리 구조

```
apps/classbot/
├── app/                  # Next.js App Router 페이지
│   ├── (student)/         # /classbot/* 학생 라우트
│   └── (teacher)/         # /teacher/{,classbot,builder} 교사 라우트
├── components/
│   ├── classbot/         # 학생 클래스봇 도메인
│   ├── builder/           # 교사 봇 빌더
│   ├── shell/            # 공유 셸 (nav)
│   ├── ui/               # shadcn 프리미티브
│   └── brand/            # 로고 / 브랜드
├── lib/
│   ├── db/               # Drizzle 스키마 + 클라이언트
│   ├── mock/             # 도메인 mock (persona/family/tutor/classbot/chat)
│   ├── tokens/           # 디자인 토큰
│   ├── hooks/            # 공유 hooks
│   ├── store/            # zustand stores
│   └── utils.ts          # cn 등
├── drizzle/              # 마이그레이션 SQL
├── public/               # static assets
├── scripts/              # seed.ts, capture scripts
├── tests/e2e/            # Playwright (Jest 제외)
├── __tests__/            # Jest sanity (도메인 테스트는 lib/**/__tests__/)
├── components.json       # shadcn 설정
├── drizzle.config.ts     # drizzle-kit 설정
├── eslint.config.mjs
├── jest.config.ts
├── next.config.ts        # output: standalone
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── Dockerfile            # bun + node 멀티스테이지 (port 3032)
```
