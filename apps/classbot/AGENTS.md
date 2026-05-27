<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16, `apps/classbot/`) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/classbot 작업 룰

- **도메인 범위**: 풀림 클래스봇 추출본 — 학생 `/classbot/*` + 교사 `/teacher/{classbot,builder}` 만. 다른 도메인 코드를 새로 작성하지 말 것
- **UI 소스**: shadcn (`components/ui/*`). `@pullim/design-system` 같은 외부 DS 패키지 import 금지
- **i18n / Sentry**: 미도입. 추가하지 말 것 (한글 하드코딩 OK)
- **import alias**: `@/*` → `apps/classbot/*` (root 아님)
- **ORM**: drizzle. `lib/db/schema.ts` 를 소스로 `bun run db:generate` → `db:migrate`
- **포트**: FE 3032, BE 4032
- **prod-verify**: `tests/e2e/*` 는 production hit 자동화 자산 — `process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032'` 패턴 깨지 말 것
- **Jest**: `__tests__/`, `**/__tests__/`, `*.test.ts(x)` 패턴. config 는 `jest.config.ts`. `tests/e2e/` 는 Jest 에서 제외 (Playwright 전용)

# 패키지 의존

- `@pullim-classbot/{api-client,auth,types}` — 현재 빈 placeholder, Phase β·δ 이후 사용
- 패키지 편집은 **글로벌 작업** (사용자 확인 필요)

# 모노레포 글로벌 작업 (확인 필요)

- root `package.json`, `turbo.json`, `tsconfig.base.json`, `docker-compose.yml`
- `.github/workflows/**` (ci, codex-review, prod-verify)
- `packages/*` 내부 (apps/classbot ↔ apps/backend 양쪽 영향)
- 이 가이드 / CLAUDE.md / README.md 편집

자세한 컨벤션: [CLAUDE.md](CLAUDE.md), 루트 가이드: [/CLAUDE.md](../../CLAUDE.md), [/AGENTS.md](../../AGENTS.md)
