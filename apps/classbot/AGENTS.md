<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16, `apps/classbot/`) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/classbot 작업 룰

- **도메인 범위**: 풀림 클래스봇 추출본 — 학생 `/classbot/*` + 교사 `/teacher/{classbot,builder}` 만. 다른 도메인 코드를 새로 작성하지 말 것
- **UI 소스는 3레인**: ① **PUDS 원격 벤더링**(`app/tokens/*`, `components/ui/{dashboard-shell,os-rail,os-tabbar,page-header,rail-collapse-context,service-switcher,service-icon,breadcrumb,skip-link}.tsx`, `lib/cn.ts`) — **로컬 수정 금지**, 재설치가 덮어쓴다 · ② **로컬 base-ui 프리미티브**(`components/ui/*` 나머지) — **PUDS 프리미티브로 교체 금지**(이름이 겹치는 16종 중 12종이 Radix 기반이라 엔진이 갈리고, `shadcn add` 는 머지가 아니라 덮어쓰기다) · ③ **서비스 고유**(나머지) — 자유.
  판별표·설치·업그레이드 절차는 [CLAUDE.md § 3.1](CLAUDE.md#31-puds-디자인-시스템--3레인-판별표). 레지스트리는 **경로로 고정한 URL** `https://pullim-design-system.vercel.app/v/0.4.2/{name}.json` 만 쓴다 — 고정은 호스트가 아니라 **경로 `/v/<버전>/`** 이 한다(그 내용은 PUDS 리포에 커밋돼 있어 main 이 바뀌어도 안 변한다). **`/r/{name}.json`(최신 추종) 직접 참조 금지** — 설치 시점마다 소스가 갈린다. 호스트 고정 방식(`puds-v0-2-0.vercel.app` 류)은 폐기됐다.
  npm DS **패키지**(`@pullim/design-system` 등) dependency 추가는 계속 금지.
- **명암 축**: `<html data-theme="pullim-os" data-scheme="light|dark">`. `data-theme` 슬롯은 성격이 점유했으니 다크를 거기 넣지 말 것. `.dark` 클래스는 의미 없다. 레인 3 에서 `var(--radius-*)` / `var(--text-<size>)` 직접 읽기 금지(앱 스케일 ≠ PUDS 스케일) — Tailwind 유틸리티를 쓴다
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
