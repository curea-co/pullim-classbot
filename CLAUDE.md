@AGENTS.md

# 풀림 클래스봇 모노레포 작업 가이드

이 리포는 [curea-co/pullim](https://github.com/curea-co/pullim) 의 BE 구조를 차용한 **bun workspace 모노레포**입니다. `pullim-classbot` 은 **풀림 클래스봇 도메인** 추출본으로, 향후 `pullim` 플랫폼의 하위 도메인으로 흡수될 SaaS 단위입니다.

도메인 구체 룰은 [`apps/classbot/CLAUDE.md`](apps/classbot/CLAUDE.md) 를 우선 참조.

## 1. 모노레포 구조

```
pullim-classbot/
├── apps/
│   ├── classbot/       # Next.js 16 (App Router) — 클래스봇 추출본 FE (port 3032)
│   └── backend/        # NestJS 11 — Phase β 이후 본격 (port 4032, 현재 health endpoint만)
├── packages/
│   ├── types/          # BE↔FE 공유 타입 (현재 빈 placeholder)
│   ├── api-client/     # FE → BE fetch 래퍼 (현재 빈 placeholder)
│   └── auth/           # IAuthProvider 추상화 + MockAuthProvider (현재 빈 placeholder)
├── proc/               # plan / spec / knowhow / archive / research
├── input/              # 기획 문서 (docs-archive 권위)
├── output/             # PM·QA 산출물
├── docker-compose.yml  # 로컬 Postgres 16 (port 5434)
├── turbo.json
├── tsconfig.base.json
├── package.json        # workspace root
└── bun.lock
```

## 2. 작업 영역별 boundary

### apps/classbot — 클래스봇 FE (단일 도메인 락인)

자세한 룰: [apps/classbot/CLAUDE.md](apps/classbot/CLAUDE.md), [apps/classbot/AGENTS.md](apps/classbot/AGENTS.md).

요지:
- **편집 자유**: 페이지(`app/(student)/classbot/*`, `app/(teacher)/teacher/{classbot,builder}/*`), `components/{classbot,builder}/*`, `lib/{db,mock,tokens,hooks,store}/*`
- **read-only**: 공유 셸·UI 프리미티브는 클래스봇 단일 도메인이라 사실상 안전하지만 role/nav 변경은 보고
- **금지**: 다른 도메인(플래너/Q/라이브러리/스튜디오/스토어/보호자) 코드 추가, DS 패키지 import, i18n / Sentry 도입
- **alias**: `@/*` → `apps/classbot/*` (모노레포 root 아님)

### apps/backend — NestJS skeleton

- 현재 `app.controller.ts` 의 `GET /api/health` 만 존재
- Phase β 부터 classbot 도메인 모듈(`apps/backend/src/modules/classbot/`) 추가 예정
- pullim 패턴 그대로 차용: controller / use-cases / service / interface / infrastructure
- 새 도메인 모듈 추가는 **사용자 명시 확인 필요**

### packages/* — 공유 패키지

- 편집 시 apps/classbot 과 apps/backend 양쪽에 영향 → 신중
- 현재는 빈 placeholder, Phase β·δ 에서 본격 구현
- 패키지 scope: `@pullim-classbot/{api-client,auth,types}`

### 공통 문서 (read only)

- `input/docs-archive/00_풀림_기능기획_Skill.md` — 기획 작성 가이드
- `input/docs-archive/04_풀림_종합_마스터.md` — 풀림 전체 IA 컨텍스트
- `input/docs-archive/05_풀림_수업방_세부기획.md` — 수업방·라이브 세션 RBAC·Scope 정책
- `input/docs-archive/07_풀림_클래스봇_핸드오프.md` — **클래스봇 도메인 권위** (이 리포의 source of truth)
- `proc/spec/2026-05-18_be-api-design.md` — BE API 설계 spec

## 3. 명령어

| 작업 | 명령 |
|---|---|
| 의존성 설치 | `bun install` |
| Classbot FE dev (port 3032) | `bun run dev:classbot` |
| Backend dev (port 4032) | `bun run dev:backend` |
| 둘 다 dev (turbo 병렬) | `bun run dev` |
| Classbot build (standalone) | `bun run build:classbot` |
| Backend build | `bun run build:backend` |
| 전체 build | `bun run build` |
| 전체 typecheck | `bun run typecheck` |
| 전체 lint | `bun run lint` |
| 전체 test | `bun run test` |
| Postgres 컨테이너 | `bun run db:up` / `db:down` / `db:reset` |

특정 워크스페이스에만 명령 실행:
```
bun --filter @pullim-classbot/classbot <script>
bun --filter @pullim-classbot/backend <script>
```

## 4. 락인 컨벤션

이 리포는 *영구 클래스봇 락인*이라 별도 도메인 선언 없이도 classbot boundary 가 기본값.

### 해도 되는 것 (편집)
- `apps/classbot/` 내 페이지·컴포넌트·mock·lib 수정·신규 (단일 도메인 범위)
- `apps/backend/src/modules/classbot/` 내 BE 작업 (Phase β 이후)

### 사용자 명시 확인 필요 (글로벌 작업)
- root 파일(`package.json`, `turbo.json`, `tsconfig.base.json`, `docker-compose.yml`) 편집
- `.github/workflows/**` 편집 (CI/Codex Review/prod-verify 등 저장소 전체 자동화 동작 변경)
- `packages/*` 내부 인터페이스 변경 (apps 양쪽 영향)
- `apps/backend/src/{common,config,database}/*` 편집 (BE 전역 영향)
- 새 도메인 모듈 추가 (이 리포는 classbot 단일 도메인이라 본질적으로 거의 발생 X)
- 이 가이드 / AGENTS.md / README.md 편집

## 5. prod-verify (classbot 고유 자산)

`apps/classbot/tests/e2e/*` + `.github/workflows/prod-verify.yml` 은 production 회귀 자동화 자산:
- main push / KST 08:00 일일 schedule / 수동 dispatch 세 경로
- https://pullim-classbot.vercel.app 의 HTML `<meta name="x-build-sha">` 가 commit SHA 와 일치할 때까지 polling 후 Playwright 7 spec 실행
- 색·chat·slider 회귀 자동 검출

작업 시 깨지 말 것:
- `apps/classbot/app/layout.tsx` 의 x-build-sha meta tag
- Playwright spec 의 `baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032'` 패턴

## 6. 컨벤션 변경

이 가이드 자체를 수정해야 할 때는 **글로벌 작업**으로 분리. 일반 작업 중에 이 파일을 수정하지 말 것.
