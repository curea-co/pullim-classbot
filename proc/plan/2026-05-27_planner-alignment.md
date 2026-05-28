# 2026-05-27 — pullim-planner 정렬 plan (classbot 도메인 적응)

## 목표

이 리포(`pullim-classbot`)를 자매 리포 [`pullim-planner`](https://github.com/curea-co/pullim-planner) 와 동일한 **bun workspace mini-monorepo + NestJS BE + Container/Presenter FE** 패턴으로 정렬한다. planner가 PR #27(BE 차용 Phase α 머지) + PR #32(Container/Presenter 파일럿 머지) 까지 진행한 두 정렬 plan을 **classbot 도메인 특수성에 적응**시켜 단계화한 문서.

**현 상태 (PR #81 D-Lite 머지 후 base origin/main 기준)**:
- 이미 `apps/{classbot,backend}/` + `packages/{api-client,auth,types}/` bun workspace 모노레포 (root `CLAUDE.md` / `AGENTS.md` 가 SOT)
- `apps/classbot/` = Next.js 16 FE (학생 14 + 교사 10 페이지, port 3032). `app/`·`components/`·`lib/{db,mock,tokens,hooks,store,utils}` 직속
- `apps/classbot/lib/db/` = Drizzle schema SOT (spec §2 `src/lib/db/schema.ts` 참조 라인은 D-Lite 후에는 `apps/classbot/lib/db/schema.ts` 로 읽어야 함)
- `apps/classbot/drizzle/` = 마이그레이션 (`0000_stiff_ulik.sql`)
- `apps/classbot/scripts/seed.ts` = Drizzle seed
- `apps/backend/` = NestJS 11 스켈레톤 — `app.controller.ts` 의 `GET /api/health` 만 존재 (port 4032)
- `packages/{api-client,auth,types}/` = 빈 placeholder
- `.github/workflows/prod-verify.yml` = D-Lite 머지 시 path filter 이미 `apps/classbot/**` + `packages/**` 등으로 갱신 완료 → **본 plan 진행 중 무변경**

**완료 기준** (이 plan 전체):
- `apps/backend/src/modules/classbot/` (root `CLAUDE.md` §2 가 명시한 도메인 래퍼) 가 spec `2026-05-18_be-api-design.md` 도메인 모델 (entity 표 #1~#26 = **26 테이블**, Phase γ PR 동봉 spec 갱신으로 본문 "24 테이블" → "26 테이블" 으로 해소) / ~36 endpoint 카탈로그에 대응하는 NestJS 모듈 보유 (`apps/classbot/lib/db/` Drizzle → `apps/backend/src/modules/classbot/entities/` TypeORM 대체. 폐기는 entity 동등성 검증 통과 후 별도 PR에서)
- `apps/classbot/` FE 페이지(학생 14 + 교사 10)가 모두 Container/Presenter 분리 + `features/<domain>/` 컨벤션
- `apps/classbot/` FE는 `@pullim-classbot/api-client` 만 import (mock 직접 import 0건)
- `proc/spec/2026-05-18_be-api-design.md` 갱신: 채택 ORM·API 스타일·디렉토리 구조를 새 결정으로 교체. 동시에 spec §3 응답 컨벤션을 pullim envelope 로 전환. spec 본문 "24 테이블" ↔ entity 표 26행 불일치도 본 갱신 시 해소 (§4.4 결정 참조)
- root `CLAUDE.md` / `AGENTS.md` 의 BE 영역 + Container/Presenter 컨벤션 갱신, `apps/classbot/{CLAUDE,AGENTS,README}.md` 의 FE features/ 컨벤션 갱신
- `.github/workflows/prod-verify.yml` 은 **정렬 대상 외 — 본 plan 무변경, D-Lite 머지 시 이미 모노레포 path filter 적용 완료** (§3.5)

---

## 1. 배경 — 왜 정렬하나

### 1.1 D-Lite (PR #81) 산출

- ✅ **mini-monorepo 완료** — `apps/{classbot,backend}/` + `packages/{api-client,auth,types}/` 폴더 + bun workspace + turbo + `tsconfig.base.json` 모두 신규
- ✅ `apps/classbot/` 직속 구조 (Next.js 16, port 3032) — `app/`·`components/`·`lib/`·`drizzle/`·`scripts/`·`tests/`·`playwright.config.ts`·`drizzle.config.ts`·`package.json` 등 D-Lite 머지 시 src/ 제거하고 평면화
- ✅ `apps/backend/` NestJS 스켈레톤 — `app.controller.ts`/`app.module.ts`/`main.ts` + `GET /api/health` (port 4032). Phase β 부터 도메인 모듈 채움
- ✅ `packages/{api-client,auth,types}/` — 빈 placeholder
- ✅ root `CLAUDE.md` / `AGENTS.md` + `apps/classbot/{CLAUDE,AGENTS,README}.md` 신규 — 도메인별 boundary 명시
- ✅ Jest 셋업 (`config/jest.setup.ts` — jest-dom + next/navigation mock + matchMedia stub)
- ✅ `.github/workflows/prod-verify.yml` path filter D-Lite 머지 시 모노레포로 갱신 (`apps/classbot/**`, `packages/**`, `turbo.json`, `tsconfig.base.json` 등)
- ✅ **`prod-verify.yml`** — production 회귀 자동화. 5개 자매 리포 중 classbot 유일 보유 자산
- ✅ Drizzle ORM 유지 (`apps/classbot/lib/db/schema.ts` = 도메인 SOT) — Phase γ entity 동등성 검증 통과 후 별도 PR 에서 폐기 (Phase α 폐기는 위험, §5 Phase α 결정 참조)
- ❌ Mock 잔존: `apps/classbot/lib/mock/{persona,family,tutor,classbot,chat,live-content,classbot-dynamic-replies,classbot-greeting,classbot-home-preview,classbot-wellness-bot}.ts` (총 10 파일) — Phase η에서 제거
- ❌ Container/Presenter 미도입 — 14+10 페이지가 모두 page 안에 로직
- ❌ BE 도메인 모듈 미작성 — `apps/classbot/lib/db/` Drizzle schema만 존재 (Ph1·Ph2 seed 완료, Ph3 read API는 미착수)

### 1.2 자매 리포(pullim-planner) 정렬 결정 (정본 정독)

| 출처 | 채택 결정 (이 리포에도 그대로 적용) |
|---|---|
| `proc/plan/2026-05-26_pullim-be-adoption.md` | 풀 흡수(`apps/planner` + `apps/backend`) / Drizzle 완전 대체 / bun + workspace / NestJS 11 + TypeORM 0.3.x / Cls 채택·Redis·JWT 보류 / mock 인증(`X-User-Id` 헤더) 유지 / 응답 envelope = pullim 패턴(`{ success, data \| error }`) |
| `proc/plan/2026-05-26_container-presenter-adoption.md` | 로직 보유 page(80줄+) → Container + Presenter / `features/<domain>/{containers,presenters,components,hooks}/` / `page.tsx` = `<Suspense><XxxContainer /></Suspense>` 마운트만 / cross-feature import 허용(widget 소유권 명확 시) |
| `CLAUDE.md` · `AGENTS.md` (root) | 영구 도메인 락인 / 새 도메인 추가는 글로벌 작업 / shell·ui·brand·tokens는 자유 / `apps/backend/src/{common,config,database}/`는 글로벌 |

### 1.3 classbot 권위 문서 (정렬 시 reference)

본 정렬에서 entity·라우트 매핑은 다음 문서를 SOT로 한다:
- `input/docs-archive/07_풀림_클래스봇_핸드오프.md` — 클래스봇 도메인 권위 (V1~V5 Value Props, 5단계 Scope Guard)
- `input/docs-archive/05_풀림_수업방_세부기획.md` — 수업방·라이브 세션 RBAC·Scope 정책

이 권위 문서는 Phase γ entity 작성 시 — 특히 `class_bots.scope` (1~5), `bot_settings` (7카테고리), `live_sessions.scope` 컬럼 — 의 의미적 검증 reference.

---

## 2. classbot 도메인 특수성 (planner와 다른 점)

본 정렬을 planner plan 그대로 베끼면 안 되는 4가지:

| 축 | planner | classbot | 본 plan 대응 |
|---|---|---|---|
| **사용자 그룹** | 학생 단일 (`student_001`) | **학생 + 교사** 2그룹 | route group `(student)` / `(teacher)` 그대로 유지. Container/Presenter Phase를 학생/교사 **두 하위 Phase로 분리** (§5 Phase 2s/2t/3s/3t) |
| **페이지 규모** | 6 페이지 (manage 3 + planner home + onboarding + reports) | **학생 14 + 교사 10 = 24 페이지** | planner 4 Phase → 본 plan **6 Phase** (학생 4 + 교사 3) — §5 |
| **권한 모델** | 없음 (단일 사용자) | **`ScopeLevel` 1~5** — base `input/docs-archive/07_풀림_클래스봇_핸드오프.md` (5단계 Scope Guard 정의) + `input/docs-archive/05_풀림_수업방_세부기획.md` (수업방·라이브 Scope 정책) + spec `2026-05-18_be-api-design.md` (entity 스키마)가 SOT. `apps/classbot/lib/mock/tutor.ts` 가 ScopeLevel 타입 보유. `class_bots.scope`, `live_sessions.scope`, `bot_questions.scope_used`, `assignments.scope_override` 등 다수 entity에 침투 | TypeORM entity 작성 시 `ScopeLevel` 을 `@pullim-classbot/types` 공유 패키지로 승격(Phase γ). 권한 가드는 Phase β에서 `RolesGuard` (pullim의 `JwtAuthGuard`+`RolesGuard` 패턴)을 **scope 기반으로 확장한 `ScopeGuard`** 신설 (mock 헤더 인증 위에 얹음) |
| **mock 출처 분기** | `lib/mock/planner.ts` 가 SOT | `apps/classbot/lib/mock/chat.ts` = 원본 `phase1.ts`에서 클래스봇 채팅만 발췌. `tutor.ts` = ScopeLevel만 잔존(본체는 Q 도메인). `family.ts` = type만 (보호자 UI는 사라짐) | Phase η에서 mock 제거 시 chat은 `chat_messages` entity로 이식, tutor는 ScopeLevel만 types 패키지로 승격, family는 spec entity #2 `parent_child_links` 로 흡수 |

### 2.1 builder · replay 의미

- **builder** (`apps/classbot/app/(teacher)/teacher/builder/page.tsx`, 156줄) = 봇 빌더 (교사 도구). 봇 생성 wizard. `class_bots` + `bot_settings` + `bot_curriculum_units` 3 entity 동시 mutation
- **replay** (학생 `/classbot/replay`, 교사 `/teacher/replay`) = 학생 대화 리플레이. spec entity #13~#16 (`replays`, `replay_bookmarks`, `replay_teacher_questions`, `replay_watch_progress`) 4 entity 단일 feature

builder는 **교사 Phase**, replay는 **학생/교사 양쪽 모두**에 등장 — features 폴더에서는 단일 도메인(`classbot-replay`)으로 두고 학생/교사 Container 두 개를 같은 feature 안에 둔다 (cross-route widget 공유).

### 2.2 §6.3 ScopeGuard — 도메인 SOT 와 가드 결정 cross-link

본 §2 권한 모델 행 + §6.3 ScopeGuard 결정 표 + Phase β `apps/backend/src/common/guards/scope.guard.ts` 구현이 한 묶음. ScopeGuard 설계 근거는 다음 3축:
- **도메인 권위**: `input/docs-archive/07_풀림_클래스봇_핸드오프.md` 5단계 Scope Guard 정의
- **수업방·라이브 RBAC 정책**: `input/docs-archive/05_풀림_수업방_세부기획.md`
- **entity 스키마**: spec `2026-05-18_be-api-design.md` (`class_bots.scope`, `live_sessions.scope`, `bot_questions.scope_used`, `assignments.scope_override`)

---

## 3. 최종 디렉토리 구조 (after — D-Lite 머지 후 base에서 본 plan 진행 시)

```
pullim-classbot/                              # ★ D-Lite 머지로 모노레포 base 확정 (root 가이드 SOT)
├── apps/
│   ├── classbot/                            # D-Lite 후: src/ 제거, 평면화 완료
│   │   ├── app/
│   │   │   ├── (student)/classbot/          # 14 페이지
│   │   │   └── (teacher)/teacher/           # 10 페이지
│   │   ├── components/
│   │   │   ├── features/                    # ★ 본 plan Phase ζ·η 에서 신규 (현재 없음)
│   │   │   │   ├── classbot-home/           # 학생 홈 (376줄)
│   │   │   │   ├── classbot-chat/           # 학생 채팅 (755줄 — 최대 단일 페이지)
│   │   │   │   ├── classbot-discover/       # 학생 봇 발견
│   │   │   │   ├── classbot-replay/         # 학생+교사 공용 replay
│   │   │   │   ├── classbot-assignment/     # 학생 과제 (assignment 3 page + result)
│   │   │   │   ├── classbot-wellness/       # 학생 웰빙·감정 체크인
│   │   │   │   ├── classbot-live/           # 학생 라이브 시청
│   │   │   │   ├── classbot-me/             # 학생 본인 리포트
│   │   │   │   ├── classbot-onboarding/     # 학생 온보딩
│   │   │   │   ├── teacher-home/            # 교사 홈 (288줄)
│   │   │   │   ├── teacher-classbot/        # 교사 내 봇 목록 (288줄)
│   │   │   │   ├── teacher-builder/         # 교사 봇 빌더 (156줄)
│   │   │   │   ├── teacher-grading/         # 교사 채점
│   │   │   │   ├── teacher-replay/          # 교사 replay (classbot-replay 빌려옴 가능)
│   │   │   │   ├── teacher-reports/         # 교사 리포트
│   │   │   │   └── teacher-assignment/      # 교사 과제 출제
│   │   │   ├── classbot/                    # 현 widget 28개 — 학생/교사 분배 작업 (Phase ζ·η)
│   │   │   ├── builder/                     # 현 builder 컴포넌트 — Phase η builder feature 흡수
│   │   │   ├── shell/                       # 그대로 (글로벌)
│   │   │   ├── ui/                          # shadcn 프리미티브 — 그대로
│   │   │   ├── brand/                       # 그대로
│   │   │   └── shared/                      # (Phase η에서 필요 시) 진짜 순수 뷰만
│   │   ├── lib/
│   │   │   ├── db/                          # Drizzle schema SOT — Phase γ entity 검증 통과 후 폐기 (별 PR)
│   │   │   ├── mock/                        # 10 파일 — Phase η 에서 제거
│   │   │   ├── tokens/, hooks/, store/, utils.ts
│   │   ├── drizzle/                         # 0000_stiff_ulik.sql — Phase γ 검증 후 폐기
│   │   ├── scripts/seed.ts                  # Drizzle seed — Phase γ TypeORM seed 로 재작성 후 폐기
│   │   ├── tests/                           # Playwright 7 spec
│   │   ├── __tests__/                       # Jest sanity
│   │   ├── playwright.config.ts
│   │   ├── jest.config.ts
│   │   ├── next.config.ts, eslint.config.mjs, tsconfig.json
│   │   ├── drizzle.config.ts                # Phase γ 검증 후 폐기
│   │   └── package.json                     # @pullim-classbot/classbot
│   └── backend/                             # NestJS 11 스켈레톤 (D-Lite 후 신규)
│       ├── src/
│       │   ├── common/{bootstrap,filters,guards,interceptors,decorators,dto,swagger,validation-messages,utils,interfaces,infrastructure,constants}/      # 도메인-비종속 (글로벌 토대)
│       │   ├── config/{database,timezone,swagger}.config.ts                                                                                          # 도메인-비종속
│       │   ├── database/{data-source.ts, database.module.ts, migrations/, seeds/}                                                                    # 도메인-비종속
│       │   └── modules/
│       │       └── classbot/                # ★ root CLAUDE.md §2 가 명시한 도메인 래퍼 — Phase β 이후 모든 BE 도메인 작업은 이 디렉토리 안
│       │           ├── entities/{user.entity.ts, class-bot.entity.ts, classroom.entity.ts, enrollment.entity.ts, live-session.entity.ts, live-quiz.entity.ts, bot-question.entity.ts, replay.entity.ts, replay-bookmark.entity.ts, replay-teacher-question.entity.ts, replay-watch-progress.entity.ts, assignment.entity.ts, assignment-question.entity.ts, grading-item.entity.ts, grading-history.entity.ts, emotion-checkin.entity.ts, wellbeing-snapshot.entity.ts, crisis-alert.entity.ts, report.entity.ts, template.entity.ts, chat-message.entity.ts, bot-curriculum-unit.entity.ts, bot-settings.entity.ts, lesson.entity.ts, parent-child-link.entity.ts, consent-log.entity.ts}/      # 26 entity (spec §2 표 #1~#26 전체). 도메인 래퍼 안에 단일 entities/ 디렉토리로 평면화
│       │           ├── identity/            # users + parent_child_links + consent_logs (spec §4.1) — controller/use-case/service/repository
│       │           ├── bots/                # class_bots + classrooms + enrollments + bot_settings + bot_curriculum_units (spec §4.2)
│       │           ├── live/                # lessons + live_sessions + live_quizzes + bot_questions (spec §4.3)
│       │           ├── replays/             # replays + bookmarks + teacher_questions + watch_progress (spec §4.4)
│       │           ├── assignments/         # assignments + assignment_questions + chat_messages (spec §4.5)
│       │           ├── grading/             # grading_items + grading_history (spec §4.6)
│       │           ├── wellbeing/           # emotion_checkins + wellbeing_snapshots + crisis_alerts (spec §4.7)
│       │           ├── reports/             # reports (spec §4.8)
│       │           └── marketplace/         # templates (spec §4.8)
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json / tsconfig.build.json
│       ├── eslint.config.mjs
│       └── package.json                     # @pullim-classbot/backend
├── packages/
│   ├── types/                               # @pullim-classbot/types
│   │   ├── src/{index.ts, scope.ts, persona.ts, classbot.ts, ...}
│   │   └── package.json
│   ├── api-client/                          # @pullim-classbot/api-client
│   └── auth/                                # @pullim-classbot/auth — MockAuthProvider + ScopeGuard helper
├── proc/                                    # 그대로
├── input/                                   # 그대로
├── config/jest.setup.ts                     # D-Lite 신규 — 그대로
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── codex-review.yml
│       └── prod-verify.yml                  # ★ 정렬 대상 외 — D-Lite 시 모노레포 path filter 이미 적용 (§3.5)
├── docker-compose.yml                       # Postgres 그대로 (port 5434, classbot DB 유지)
├── package.json                             # workspace root (D-Lite)
├── bun.lock                                 # D-Lite
├── turbo.json                               # D-Lite
├── tsconfig.base.json                       # D-Lite
├── CLAUDE.md                                # root 가이드 (D-Lite 신규)
├── AGENTS.md                                # root 가이드 (D-Lite 신규)
└── README.md
```

**폐기 대상** (Phase γ entity 동등성 검증 통과 후 별 PR — Phase α 폐기는 위험 §5):
- `apps/classbot/drizzle/`, `apps/classbot/drizzle.config.ts`
- `apps/classbot/lib/db/` (Drizzle schema SOT — spec §2 본문 참조 라인도 함께 갱신)
- `apps/classbot/scripts/seed.ts` (apps/backend TypeORM seed로 재작성 후 폐기)
- 루트 `package.json` 내 `db:generate/migrate/push/studio/seed` 스크립트 (있을 경우) + Drizzle·pg 의존성 (`apps/classbot/package.json` 에서 제거)

**port 정책 유지**:
- classbot FE: **3032** (현재 그대로, planner 3030과 분리)
- backend: **4032** (planner 4030과 분리)
- postgres: **5434** (planner 5434와 충돌 — 자매 리포 분리 운영 시 5435 로 변경 검토. Phase α PR 본문에서 사용자 확인)

### 3.5 prod-verify.yml 보존 정책

`.github/workflows/prod-verify.yml` 은 5개 자매 리포 중 classbot 유일 보유 자산이며, classbot 핵심 회귀 안전장치(`bun --filter @pullim-classbot/classbot test:e2e` 7 spec)다. 본 정렬 plan은 이 워크플로우를 **건드리지 않는다**:

- D-Lite (PR #81) 머지 시 path filter 이미 모노레포 기준으로 갱신 완료: `apps/classbot/**`, `packages/**`, `package.json`, `bun.lock`, `turbo.json`, `tsconfig.base.json`, `.github/workflows/prod-verify.yml` → 본 plan Phase α~θ 어느 단계에서도 path filter 추가 갱신 불필요
- 모든 Phase 에서 `.github/workflows/prod-verify.yml` 편집 금지 (`.github/workflows/**` 는 글로벌 작업 범주 — root `CLAUDE.md` 및 자매 리포 패턴 모두 사용자 명시 확인을 요구하는 영역. classbot 회귀 안전장치를 끊는 변경은 절대 금지)
- production URL (`https://pullim-classbot.vercel.app`), x-build-sha 검증 메커니즘, Playwright spec 7개 모두 보존
- **Phase η (FE Container/Presenter 학생) · Phase θ (FE mock 제거) 진행 시 Playwright spec 의 `lib/mock` 의존이 깨질 수 있음** → 해당 Phase PR 본문에서 prod-verify 영향 분석을 *사전* 수행. 영향 spec 발견 시:
  - 옵션 a — spec 갱신 PR 을 본 Phase PR 보다 *먼저* 머지 (prod-verify 회귀 안전장치 유지)
  - 옵션 b — 본 Phase PR 안에 spec 갱신 동봉 (단일 PR로 동기 머지, prod-verify 회귀 위험은 PR 본문에 명시 + 사용자 승인 필수)
- 어느 옵션이든 **prod-verify 워크플로우 자체는 무변경**. 워크플로우 변경이 *반드시* 필요한 시나리오(예: 신규 spec 추가로 timeout 조정)는 본 plan 범위 외 — 별도 plan 으로 분리

---

## 4. 변경점 매트릭스

### 4.1 명령어 — bun workspace 패턴

D-Lite 머지 시 root `package.json` scripts 가 이미 모노레포 turbo 패턴으로 셋업됐다 (`dev`, `build`, `typecheck`, `lint`, `test`, `db:up/down/reset`, `dev:classbot`, `dev:backend`, `build:classbot`, `build:backend`).

| 현재 (D-Lite 후) | 본 plan 진행 중 신규 |
|---|---|
| `bun run dev` (turbo) / `bun run dev:classbot` (port 3032) | (그대로) |
| `bun run build` / `build:classbot` / `build:backend` | (그대로) |
| `bun run typecheck` / `lint` / `test` (turbo) | (그대로) |
| `bun run db:up/down/reset` (docker-compose Postgres 5434) | (그대로) |
| `bun run dev:backend` (현재 health endpoint만) | Phase β 부터 NestJS 도메인 모듈 부팅 |
| `bun --filter @pullim-classbot/classbot test:e2e` (Playwright) | (그대로) |
| `bun --filter @pullim-classbot/classbot run db:generate` (drizzle-kit, 현재) | Phase γ 진입 시 → `bun --filter @pullim-classbot/backend migration:generate -- <Name>` 로 전환 (Drizzle 명령은 entity 검증 통과 후 폐기) |
| `bun --filter @pullim-classbot/classbot run db:seed` (Drizzle seed, 현재) | Phase γ → `bun --filter @pullim-classbot/backend seed:run` 로 재작성 |

### 4.2 docs 갱신 항목 (D-Lite 후 base 기준)

D-Lite 머지 시 이미 root `CLAUDE.md` / `AGENTS.md` + `apps/classbot/{CLAUDE,AGENTS,README}.md` 분리 셋업됨. 본 plan 진행 중 갱신:

- **root `CLAUDE.md`** — §2 `apps/backend` 절: Phase β 진입 시 NestJS 도메인 모듈 추가 명시. Phase γ 진입 시 entities 표 cross-link
- **root `AGENTS.md`** — BE 패턴 권위(pullim) 외에 ScopeGuard·Container/Presenter 결정도 본 plan 진행 시 갱신
- **`apps/classbot/CLAUDE.md`** — Phase ζ·η 진입 시 `components/features/<domain>/` 컨벤션 + Container/Presenter 분리 boundary 추가. Phase θ 진입 시 mock 0건 + `@pullim-classbot/api-client` 단일 import 정책 명시
- **`apps/classbot/AGENTS.md`** — planner AGENTS.md 의 "Container/Presenter 컨벤션" 표 + "cross-feature import 정책" 그대로 차용 (도메인명만 `planner-*` → `classbot-*`, `teacher-*`)

### 4.3 권위 spec 갱신 (`proc/spec/2026-05-18_be-api-design.md`)

spec 은 본 plan 진행 시점에서 **여전히 권위 문서**이며, 결정 항목 갱신 PR은 Phase β 동봉 (응답 envelope) + Phase γ 동봉 (ORM·디렉토리·entity 표 24/26 모순 해소) 두 단계로 분리. spec 패치가 머지되기 전까지 plan 의 새 결정은 *제안* 상태이며, 실제 구현(Phase δ 이후)은 spec 패치 머지 후에 진행.

| 결정 항목 | 현행 spec | 본 plan 의 갱신 제안 | 갱신 PR 시점 |
|---|---|---|---|
| ORM | Drizzle 0.36.x | **TypeORM 0.3.x** (Data Mapper) | Phase γ PR 동봉 |
| API 스타일 | Next.js API routes | **NestJS 11 — apps/backend** | Phase β PR 동봉 |
| 마이그레이션 | drizzle-kit | typeorm migration:generate | Phase γ PR 동봉 |
| entity SOT 디렉토리 | `src/lib/db/schema.ts` → 본 SOT 라인은 D-Lite 후 실제로 `apps/classbot/lib/db/schema.ts` 에 위치 (spec 본문 경로도 동시 갱신) | **`apps/backend/src/modules/classbot/entities/*`** (도메인 래퍼 안 — root `CLAUDE.md` §2 가 명시한 boundary 따름) | Phase γ PR 동봉 |
| entity 표 24/26 모순 | spec 본문 "총 24 테이블" ↔ entity 표 행 #1~#26 (templates·chat_messages 포함) | **결정: spec 본문을 "총 26 테이블 (entity 표 #1~#26 전체)" 으로 재기술**. base spec §4 가 `GET /api/templates` / `GET /api/me/templates` 를 Phase 3 read endpoint 로 두고 있어 Phase δ 진입 시 templates entity 가 필수. `chat_messages` 도 spec 본문에 *"향후 채팅 영속화 — Ph1엔 비어 있음"* 으로 entity 자체는 정의 → Phase γ 에서 entity·마이그레이션 모두 작성 (테이블만 비워 둠). 즉 본 plan 의 entity 디렉토리·DTO·마이그레이션 모두 26 entity 전체를 Phase γ 1차 범위로 포함 | Phase γ PR 동봉 |
| 응답 컨벤션 (§3) | raw `{ id, ... }` 또는 `{ error: { code, message } }` | **pullim envelope** `{ success, data \| error }` + `ResponseInterceptor`/`HttpExceptionFilter`/`AllExceptionsFilter` 3축 + 도메인 prefix 에러 코드(`BOT_NOT_FOUND`, `LIVE_SESSION_FORBIDDEN`, `SCOPE_VIOLATION`, `COMMON_VALIDATION_FAILED` 등). **spec §3 패치가 머지된 후에만 Phase δ 구현 진입 — plan 이 spec 보다 먼저 계약을 덮어쓰지 않음** | Phase β PR 동봉, Phase δ 구현 전까지 머지 완료 필수 |
| 인증 (§3, Ph8) | mock `x-user-id` 헤더 | **유지** — `@pullim-classbot/auth` MockAuthProvider 추상화 추가, role(`student`/`teacher`/`parent`) + ScopeLevel(1~5) 가드 | Phase β PR 동봉 |
| Phase 로드맵 (§5) | Ph1~Ph9 | **재진입**: Ph1·Ph2 결과물은 pullim 패턴으로 재작성 (Drizzle 시드 → TypeORM 시드). Ph3~Ph7 = 본 plan Phase γ~η. Ph8·Ph9 보류 (자매 리포 결정 그대로) | Phase γ PR 동봉 |

### 4.4 의존성 변경

**`apps/backend/package.json` 추가** (pullim-planner 차용 plan §4.4와 동일):
- `@nestjs/{common,core,platform-express,config,typeorm,swagger,jwt,passport}`
- `typeorm`, `pg`, `class-validator`, `class-transformer`, `nestjs-cls`, `reflect-metadata`
- dev: `@nestjs/cli`, `@nestjs/testing`, `@types/express`, `@types/node`, `ts-node`, `tsconfig-paths`

**`apps/classbot/package.json` 제거** (Phase γ entity 동등성 검증 통과 후 별 PR):
- `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg` (현재 apps/classbot 에 있음 — D-Lite 후 root 가 아님)

**packages/types 추가** (`@pullim-classbot/types`):
- `ScopeLevel` 1~5 + `scopeMeta` Record (현 `apps/classbot/lib/mock/tutor.ts` 를 그대로 이식)
- `BotTone` — **도메인 SOT 와 builder UI 간 불일치 사전 정리 필요** (Phase γ 또는 Phase η 진입 전):
  - **도메인 SOT** = `apps/classbot/lib/mock/classbot.ts` 의 `ClassBot.tone = '정중' | '친근' | '스파르타' | '차분' | '열정'` (한글 5종). `lib/mock/chat.ts`·`classbot-greeting.ts` 도 한글 5종 일치
  - **builder UI** = `apps/classbot/components/builder/builder-types.ts:12` 의 `BotTone = 'formal' | 'friendly' | 'spartan'` (영문 3종 + `toneMeta` Record) — 도메인 SOT 와 어긋남
  - **결정**: `packages/types/src/bot-tone.ts` 에 도메인 SOT 따라 한글 5종 `BotTone` 정본 정의. builder UI 의 영문 3종은 *UI label key* 로 격하 (별도 `BuilderToneOption` 타입) + ↔ 매핑 helper (`mapBuilderToBotTone()`). Phase η builder 재편 시 매핑 계층 도입 + builder-types.ts 의 `BotTone` 이름 삭제(또는 alias 만). 본 결정은 Phase γ entity (`class_bots.tone`) 작성 *전* 에 확정해야 entity 컬럼 타입과 일치 — Phase β PR 또는 별도 사전 PR 에서 처리
- spec §2 entity 표 **26 테이블** (#1~#26 행 — templates·chat_messages 포함) 의 DTO 타입 (BE↔FE 공유)

### 4.5 PR 머지 정책

- 매 PR Codex Review 통과 필수 (자매 리포 룰)
- main 머지 후 prod-verify 워크플로우 자동 트리거 — Vercel 빌드 → x-build-sha polling → Playwright prod hit 7 spec
- **Phase η 진입 전까지 Playwright spec 영향 없음** (mock 제거 전이라 spec 의존성 무변경)
- 본 plan 진행 중 어느 PR도 prod-verify 워크플로우 자체를 편집하지 않음 (path filter 는 D-Lite 시 모노레포 기준으로 이미 갱신됨 — §3.5)

---

## 5. PR 분할 (제안 — 7 단계 / 9 PR)

각 단계는 독립 PR로 머지 가능. 이전 단계 머지 → 다음 단계 진입. **학생/교사 페이지 분리**가 정렬의 핵심이라 Phase 2·3은 학생/교사 하위 Phase로 분할.

> **모노레포 재편 자체는 D-Lite (PR #81) 머지로 완료됨.** 본 plan 의 Phase α 는 *재편이 아닌* "BE 차용 사전 정리 + spec §2 SOT 라인 갱신" 작업.

### Phase α — spec §2 SOT 라인 갱신 + Phase β 진입 준비 (1 PR)

**목표**: D-Lite 후 base 와 spec 본문 사이 SOT 라인 불일치 정리. Drizzle 폐기는 **본 Phase 작업 외** — Phase γ entity 동등성 검증 통과 후 별도 PR.

- **spec §2 SOT 라인 갱신**: `src/lib/db/schema.ts` → `apps/classbot/lib/db/schema.ts` (D-Lite 실제 위치 반영). 본 갱신은 entity 컬럼 시그니처 변경 *아님* (경로 명시만)
- **root `CLAUDE.md` / `AGENTS.md`** 본 plan §5 PR 9개 진입 예고 cross-link 추가 (구조 변경 없음)
- `apps/backend/src/main.ts` 의 `PORT` 환경변수 기본값 (4032) 확인, `apps/backend/package.json` 의 `start:dev` 스크립트 명시
- Drizzle 자산(`apps/classbot/{drizzle/,drizzle.config.ts,lib/db/,scripts/seed.ts}`) 은 **Phase α 에서 폐기하지 않는다.** Phase γ TypeORM entity + 마이그레이션 + seed 가 Drizzle 동등성 검증을 통과한 *후* 별도 PR (Phase γ' 으로 표기) 에서 폐기. 본 plan §1.1 D-Lite 산출 및 §4.4 의존성 변경 항목 참조
- prod-verify 워크플로우 무변경 (D-Lite 시 path filter 이미 모노레포 기준으로 갱신 완료, §3.5)
- **완료 기준**: spec §2 본문 SOT 라인 1줄 갱신 + docs cross-link. 빌드/테스트/회귀 영향 0 (`bun run typecheck`, `bun --filter @pullim-classbot/classbot test:e2e`, `bun run test` 모두 그대로 통과).

### Phase β — pullim common 패턴 차용 + ScopeGuard 신설 (1 PR)

**목표**: NestJS 토대 + classbot 권한 모델 1차 셋업.

- `apps/backend/src/common/` 전부 — pullim-planner Phase β 와 동일 (bootstrap·filters·interceptors·decorators·dto·validation-messages·swagger·utils·interfaces(BaseRepositoryInterface)·infrastructure(BaseRepository))
- `apps/backend/src/config/{database,timezone,swagger}.config.ts`
- `apps/backend/src/database/{data-source.ts, database.module.ts, migrations/, seeds/}`
- nestjs-cls 글로벌, AllExceptionsFilter + HttpExceptionFilter + ResponseInterceptor 전역 등록
- **MockAuthGuard** (`x-user-id` 헤더 → fallback `student_001`/`teacher_001` role 분기) — `users.role` 컬럼 조회 후 req.user 주입
- **RolesGuard** — `@Roles('teacher')` 데코레이터로 교사 전용 endpoint 보호 (spec §4.6 grading, §4.2 봇 생성, §4.5 출제 등)
- **ScopeGuard 신설** — `@RequireScope(level)` 데코레이터. `class_bots.scope` 1~5 + `assignments.scope_override`/`live_sessions.scope` 와 매칭. 클래스봇 도메인 특수 가드 (planner에는 없음). 설계 근거 cross-link: §2 권한 모델 행 + §2.2 (ScopeGuard 도메인 SOT 와 가드 결정) + §6.3 (ScopeGuard 도입 위치·체크 시점·scope 값 출처·테스트 커버리지 결정 표)
  - decorator: `apps/backend/src/common/decorators/scope.decorator.ts`
  - guard: `apps/backend/src/common/guards/scope.guard.ts`
  - `@pullim-classbot/auth` 패키지로 ScopeLevel 비교 helper 노출
- `packages/types/src/scope.ts` — `ScopeLevel` + `scopeMeta` 정의 (apps/classbot 의 `lib/mock/tutor.ts` 를 import하던 곳을 types로 전환)
- **완료 기준**: Swagger `/api-docs` 노출, `x-user-id` 헤더 가드 동작, `@RequireScope(3)` 붙은 더미 endpoint가 scope 2 사용자에 403 응답.

### Phase γ — entity 설계 (spec §2 26 테이블 전체) + spec 갱신 + 마이그레이션 (1 PR) + Phase γ' — Drizzle 폐기 (1 PR, 동등성 검증 통과 후)

**목표**: mock 시그니처 ↔ TypeORM entity 매핑 + 첫 마이그레이션. spec §2 entity 표 24/26 모순도 본 PR 에서 spec 갱신으로 해소.

- **spec §2 본문 갱신 (Phase γ PR 동봉)**: "총 24 테이블" 표현을 *"총 26 테이블 (entity 표 #1~#26 전체)"* 으로 재기술. entity 표 행 자체는 시그니처 갱신 불요. 그리고 §2 말미 SOT 라인 `apps/classbot/lib/db/schema.ts` → `apps/backend/src/modules/classbot/entities/*` 로 갱신
- `apps/backend/src/modules/classbot/entities/` (도메인 래퍼 안, root `CLAUDE.md` §2 boundary 따름 — §3 디렉토리 트리와 일치) 에 작성 — **entity 표 #1~#26 전체 26 entity 를 Phase γ 본 PR 의 1차 범위로 확정**. base spec §4 가 `GET /api/templates`/`GET /api/me/templates` 를 Phase 3 (Phase δ) read endpoint 로 두고 있으므로 templates entity 는 Phase δ 진입 전 필수. `chat_messages` 는 spec 본문에 *"향후 채팅 영속화 — Ph1엔 비어 있음"* 으로 정의 → entity·테이블만 작성, seed 데이터는 비워 둠:
  - Identity 3 (#1~#3): `user`, `parent-child-link`, `consent-log`
  - Bot Definition 5 (#4~#8): `classroom`, `class-bot`, `enrollment`, `bot-curriculum-unit`, `bot-settings`
  - Live 4 (#9~#12): `lesson`, `live-session`, `live-quiz`, `bot-question`
  - Replay 4 (#13~#16): `replay`, `replay-bookmark`, `replay-teacher-question`, `replay-watch-progress`
  - Assignment 2 (#17·#18): `assignment`, `assignment-question`
  - Grading 2 (#19·#20): `grading-item`, `grading-history`
  - Wellbeing 3 (#21~#23): `emotion-checkin`, `wellbeing-snapshot`, `crisis-alert`
  - Reports 1 (#24): `report`
  - Market 1 (#25): `template` (Phase δ read endpoint 가 의존)
  - Chat 1 (#26): `chat-message` (entity·테이블만, seed 비움 — Phase ε mutation `POST /api/bots/{id}/chat` 작업 시 사용)
- DB 스키마는 **현 Drizzle schema 와 비트단위 동일**하게 도출 (`pg_dump --schema-only` diff 검증). 즉 `apps/classbot/drizzle/0000_stiff_ulik.sql` + `apps/classbot/lib/db/schema.ts` 가 Phase γ entity 작성의 *비교 기준*. 이 기준이 동등성 검증 완료될 때까지 폐기 금지
- TypeORM 마이그레이션 1개 생성 (현 `apps/classbot/drizzle/0000_stiff_ulik.sql` 와 동등 — pg_dump diff 0)
- seed: `apps/backend/src/database/seeds/` 신설, 기존 `apps/classbot/scripts/seed.ts` 의 mock 데이터를 TypeORM repo 로 재작성 — 10개 mock 파일 전부 흡수 (persona·family·tutor·classbot·chat·live-content·classbot-greeting·classbot-home-preview·classbot-wellness-bot·classbot-dynamic-replies). `chat_messages` 테이블은 spec 정의대로 비워 둠
- **invariant 검증** (spec §2.주요 invariant): enrollments PK / bot_settings PK / replay_watch_progress PK / emotion_checkins unique(student_id, date) / wellbeing_snapshots PK / enrollments→class_bots ON DELETE CASCADE / replay_bookmarks→replays ON DELETE CASCADE — 모두 TypeORM `@PrimaryColumn` + `@Unique` + `@OneToMany({ onDelete: 'CASCADE' })` 로 표현
- **완료 기준** (Phase γ): `bun --filter @pullim-classbot/backend migration:run` → 기존 Drizzle 스키마와 diff 0. `bun --filter @pullim-classbot/backend seed:run` → users 3행 (학생+교사+학부모) + class_bots 5행 (cb_001~cb_005) + 학생·교사 mock 시그니처 전부 동등. **Phase γ PR 머지 시점에는 Drizzle 자산 여전히 유지** (회귀 안전망)

#### Phase γ' — Drizzle 폐기 (Phase γ 머지 직후 1 PR)

Phase γ entity·마이그레이션·seed 가 prod-verify Playwright 7 spec 회귀 0 으로 main 머지 + production 정상 동작이 확인된 *후* 별도 PR 로 폐기:

- 폐기 대상: `apps/classbot/drizzle/`, `apps/classbot/drizzle.config.ts`, `apps/classbot/lib/db/`, `apps/classbot/scripts/seed.ts`, `apps/classbot/package.json` 의 drizzle-orm/drizzle-kit/pg/@types/pg 의존성
- spec §2 말미 SOT 라인은 Phase γ 본 PR 에서 이미 `apps/backend/src/entities/*` 로 갱신됨 — Phase γ' 에서는 추가 갱신 불필요
- **완료 기준**: `grep -r "drizzle" apps/classbot/` 0건 (의존성 import 잔존 없음). Playwright 7 spec 회귀 0

### Phase δ — read endpoint 25개 이식 (1 PR)

**목표**: spec §4 의 🟢(Phase 3) endpoint **25개** 전부 이식 (아래 catalog 합산 — identity 2 + bots 4 + live 4 + replays 2 + assignments 3 + grading 3 + wellbeing 3 + reports 2 + marketplace 2). FE는 여전히 mock 사용.

각 모듈마다 controller + use-case + service + repository interface + repository 구현 (planner Phase δ 패턴 그대로):

- **identity 모듈**: `GET /api/me`, `GET /api/me/parent`
- **bots 모듈**: `GET /api/bots`, `GET /api/bots/{id}`, `GET /api/bots/{id}/curriculum`, `GET /api/classrooms`
- **live 모듈**: `GET /api/lessons`, `GET /api/lessons/upcoming`, `GET /api/live-sessions`, `GET /api/live-sessions/{id}/feed`
- **replays 모듈**: `GET /api/replays`, `GET /api/replays/{id}`
- **assignments 모듈**: `GET /api/assignments`, `GET /api/assignments/{id}`, `GET /api/bots/{id}/chat`
- **grading 모듈**: `GET /api/grading/queue`, `GET /api/grading/{id}`, `GET /api/students/{id}/grading-history`
- **wellbeing 모듈**: `GET /api/me/emotion-checkins`, `GET /api/me/wellbeing`, `GET /api/crisis-alerts`
- **reports 모듈**: `GET /api/reports`, `GET /api/reports/{id}`
- **marketplace 모듈**: `GET /api/templates`, `GET /api/me/templates`

응답 shape = pullim envelope (§4.3 갱신). 기존 raw shape과 byte-equal 목표 폐기 — Phase η FE 전환에서 일괄 envelope 분기 처리.

- 통합 테스트 (Testcontainers + Postgres) — 각 endpoint 1개 이상 spec snapshot
- **완료 기준**: 25+ endpoint 모두 200 응답 + scope 위반·role 위반에 403, 미존재 리소스에 404 + 도메인 prefix 에러 코드.

### Phase ε — mutation endpoint 18개 이식 (1~2 PR)

**목표**: spec §4 의 🟡(Phase 4) endpoint 전부 + 🟠(Phase 5) 일부.

- **identity**: `POST /api/me/consents`
- **bots**: `POST /api/bots`, `PATCH /api/bots/{id}/settings`, `POST /api/classrooms/{id}/enrollments`
- **live**: `POST /api/live-sessions`, `PATCH /api/live-sessions/{id}`, `POST /api/live-sessions/{id}/quizzes`, `PATCH /api/quizzes/{id}` (🟠)
- **replays**: `PATCH /api/replays/{id}/status` (processing→review→sent 전이), `POST /api/replays/{id}/bookmarks`, `POST /api/replays/{id}/teacher-questions`, `PATCH /api/replays/{id}/watch-progress`
- **assignments**: `POST /api/assignments`, `PATCH /api/assignments/{id}`, `POST /api/bots/{id}/chat` (🟠 — chat_messages 영속화)
- **grading**: `PATCH /api/grading/{id}` (overrideDelta 계산 — spec entity #19 `override_delta` 컬럼)
- **wellbeing**: `POST /api/me/emotion-checkins` (unique upsert), `PATCH /api/crisis-alerts/{id}`
- **reports**: `PATCH /api/reports/{id}/status`

각 mutation에 `class-validator` DTO + `@RequireScope`/`@Roles` 가드 + 트랜잭션 invariant (emotion_checkins unique·replay status 전이·assignment state machine).

PR 분할 검토: 18 endpoint 단일 PR이 크면 (1) bots+live+replays (2) assignments+chat+grading (3) wellbeing+reports 셋으로 분할 가능. 진입 시 PM 합의.

- **완료 기준**: 모든 mutation에 happy path + scope/role 위반 + validation 실패 + 트랜잭션 충돌 시나리오 통합 테스트 통과.

### Phase ζ — FE Container/Presenter 재편 (학생) (2 PR)

**목표**: 학생 14 페이지 Container/Presenter 분리. **mock 의존은 유지** — 데이터 출처 전환은 Phase η.

#### Phase ζ-1: 학생 메인 4 페이지 (1 PR — 파일럿)

logic 비중 높은 4개부터:
- `classbot/page.tsx` (376줄) → `HomeContainer` + `HomePresenter` (학생 홈)
- `classbot/chat/page.tsx` (755줄, 최대) → `ChatContainer` + `ChatPresenter` + `useChatThread` hook (quickPrompts + 자동 응답 분기 로직 추출)
- `classbot/replay/page.tsx` (340줄) → `ReplayListContainer` + `ReplayListPresenter`
- `classbot/assignment/page.tsx` (213줄) → `AssignmentListContainer` + `AssignmentListPresenter`

각 페이지의 `'use client'` 제거 + Server Component + `<Suspense><XxxContainer /></Suspense>` 패턴. `apps/classbot/components/classbot/*` 28개 컴포넌트 중 **학생 라우트가 쓰는 것** 만 `apps/classbot/components/features/classbot-*/components/` 로 이동 (git mv). 교사용은 Phase η-2 까지 잔존.

#### Phase ζ-2: 학생 나머지 10 페이지 + replay 상세·assignment 상세·wellness·me·onboarding·discover·live (1 PR)

- `assignment/[id]/page.tsx` (112줄) + `result/page.tsx` (175줄) + `solve/page.tsx` (43줄, thin) → `AssignmentSolveContainer`/`AssignmentResultContainer` + 단일 Presenter 세트
- `replay/[id]/page.tsx` (18줄, thin) — 분리 안 함
- `wellness/page.tsx` (182줄) → `WellnessContainer` + `WellnessPresenter` (감정 체크인 widget 보유)
- `wellness/check-in/page.tsx` (5줄, thin) — 분리 안 함
- `me/report/page.tsx` (100줄) → `MeReportContainer` + `MeReportPresenter`
- `onboarding/page.tsx` (147줄) → `OnboardingContainer` + `OnboardingPresenter`
- `discover/page.tsx` (71줄, 80줄 미만) — **분리 임계치 미달**, 그대로 두되 mock import만 추후 Phase η에서 교체
- `live/[botId]/page.tsx` (20줄, thin) — 분리 안 함

- **완료 기준**: 학생 14 페이지 중 logic 보유 9개 모두 Container/Presenter 분리. `bun --filter @pullim-classbot/classbot test:e2e` (Playwright 7 spec) 회귀 0.

### Phase η — FE Container/Presenter 재편 (교사) + builder feature 통합 (1 PR)

**목표**: 교사 10 페이지 분리. builder는 단일 feature로 통합.

- `teacher/page.tsx` (288줄) → `TeacherHomeContainer` + `TeacherHomePresenter`
- `teacher/classbot/page.tsx` (288줄) → `TeacherBotListContainer` + `TeacherBotListPresenter`
- `teacher/builder/page.tsx` (156줄) → `BuilderContainer` + `BuilderPresenter` + `useBuilderWizard` hook (`apps/classbot/components/builder/{builder-types.ts, step-content.tsx, step-indicator.tsx}` 흡수)
- `teacher/grading/page.tsx` (147줄) → `TeacherGradingContainer` + `TeacherGradingPresenter`
- `teacher/grading/[id]/page.tsx` (20줄, thin) — 분리 안 함
- `teacher/replay/page.tsx` (126줄) → `TeacherReplayListContainer` (학생 `classbot-replay` 의 widget 빌려옴 — cross-feature import 허용)
- `teacher/replay/[id]/page.tsx` (181줄) → `TeacherReplayDetailContainer` + `TeacherReplayDetailPresenter`
- `teacher/reports/page.tsx` (115줄) → `TeacherReportListContainer` + `TeacherReportListPresenter`
- `teacher/reports/[id]/page.tsx` (138줄) → `TeacherReportDetailContainer` + `TeacherReportDetailPresenter`
- `teacher/assignment/new/page.tsx` (5줄, thin) — 분리 안 함

- `apps/classbot/components/classbot/*` 28개 중 교사 라우트 의존 widget 전부 `apps/classbot/components/features/teacher-*/components/` 또는 `apps/classbot/components/features/classbot-*/components/` 로 이동
- 빈 `apps/classbot/components/{classbot,builder}/` 디렉토리 제거
- **완료 기준**: 교사 10 페이지 중 logic 보유 7개 분리. shell·ui·brand 그대로. Playwright 회귀 0.

### Phase θ — FE mock 제거 → `@pullim-classbot/api-client` 전환 (1~2 PR)

**목표**: mock 직접 import 0건 + prod-verify Playwright spec 영향 최소화.

- `apps/classbot/components/features/*/containers/*` 안의 `from '@/lib/mock/*'` 전부 `@pullim-classbot/api-client` 호출로 치환 (`@/*` 는 D-Lite 후 `apps/classbot/*` 를 가리킴 — root `CLAUDE.md` §2 참조)
- Server Component 데이터 패칭 패턴 확정 (Server Component fetch vs Route Handler proxy vs Server Action — pullim envelope 분기 한 군데로)
- `chat.ts` mock (원본 phase1.ts 발췌분) → `chat_messages` entity 시드로 흡수 + `POST /api/bots/{id}/chat` (Phase ε 🟠 endpoint)
- mock 10개 파일 자체는 **마지막 PR에서만 제거** (회귀 안전망)
- **prod-verify 영향 검증**: Playwright spec 7개 중 어느 spec이 mock에 의존하는지 사전 확인. 의존 spec이 있으면 해당 spec을 BE 응답 expect로 갱신 (prod-verify 워크플로우 자체는 무변경)
- **완료 기준**: `grep -r "from '@/lib/mock" apps/classbot/` 0건 (D-Lite 후 평면 구조, src/ 없음). `bun --filter @pullim-classbot/classbot test:e2e` 통과. prod-verify 다음 main push 시 정상 동작.

---

## 6. 리스크 매트릭스 + 사전 결정

### 6.1 리스크 — 자매 리포(planner) 차용 + classbot 추가분

| 리스크 | 영향 | 대응 |
|---|---|---|
| **bun + NestJS 호환성** | NestJS 부팅 시 전체 좌초 | D-Lite 시 NestJS 스켈레톤 (`apps/backend/`) + `GET /api/health` 부팅 *이미 검증됨*. Phase β common 차용 시점에 typeorm·class-validator·nestjs-cls 등 의존성 추가에서 호환성 문제 발생 시 — **bun 워크스페이스 안에서 해결**한다 (base `AGENTS.md`/`CLAUDE.md` 가 bun workspace 를 고정 권위로 두고 `bun run ...` / `bun --filter ...` 만 권위 명령으로 인정 — 다른 패키지 매니저로의 우회는 base 권위 위배). 문제가 발생하면: (1) 의존성 버전 호환 매트릭스 확인 + 다른 버전 시도, (2) `bun install --backend=hardlink` 등 install 옵션 조정, (3) 그래도 막히면 **packageManager 자체를 바꾸는 결정은 본 plan 범위 외 — 별도 권위 문서 갱신 + 사용자 명시 승인 게이트로 분리**. 본 plan 은 절대 다른 PM 우회를 자체 선언하지 않음 |
| **bun workspace ↔ turbo** | 빌드/테스트 명령 회귀 | turbo 2.7.4 bun 지원 (D-Lite 시 셋업 완료). 추가 명령 (typeorm migration, swagger 생성 등) 추가 시 root scripts 래핑 |
| **현행 Drizzle 스키마 ↔ TypeORM entity 매핑 정확도** | Phase γ 26 테이블 diff (spec §2 entity 표 #1~#26) | `pg_dump --schema-only` 비교 + Phase γ PR diff 보고서. Drizzle 자산은 Phase γ' 까지 보존 (검증 기준) |
| **응답 envelope shape 변경 (raw → pullim envelope)** | Phase δ·ε FE 즉시 영향 없음, Phase θ 폭발 | spec §3 갱신 (Phase β PR 동봉, 사용자 명시 확인 후 머지). FE 전환은 Phase θ 한 번에. spec 패치 미머지 시 envelope 구현 보류 (§6.2) |
| **prod-verify Playwright spec mock 의존** | Phase η·θ 머지 시점에 prod-verify 자동 실패 가능 | Phase η·θ 진입 시 spec 의존성 사전 확인 + 영향 있는 spec 별도 PR로 분리 갱신. **prod-verify 워크플로우 자체는 무변경** (§3.5) |
| **postgres port 5434 자매 리포 충돌** | 두 리포 동시 dev 실행 시 docker-compose 충돌 | 본 plan Phase α PR 본문에서 사용자 확인 — classbot port 를 5435 로 변경할지, 자매 리포 동시 실행 안 함을 정책으로 둘지 |
| **학생/교사 mock 시그니처 분리 정도** | Phase γ entity 작성 시 어디까지를 학생/교사 entity로 분할? | spec §2 26 테이블 표가 이미 통합 entity (예: `users.role`) → planner와 동일하게 single-table-role 패턴. Phase γ 시작 시 추가 분리 결정 불요 |
| **ScopeGuard 신설 — pullim에는 없는 패턴** | Phase β 진입 시 pullim 패턴 일탈, 다른 게이트키퍼 합의 | spec §4 의 🟠 endpoint(scope 변경·intensity 갱신)가 명시적 권한 모델 요구 → ScopeGuard 신설은 spec 강제. PR 본문에 spec §3 → §4.3 cross-link |
| **classbot 28 컴포넌트의 학생/교사 분배 모호** | Phase ζ·η에서 widget 분류 시간 소모 | planner Phase 4 패턴 그대로: 모호한 widget은 일단 `classbot-home/components/` (학생) 또는 `teacher-home/components/` (교사) 에 두고 추후 재배치 — 이번 plan 범위 밖 |
| **본 plan PR 9개 분량** | 진행 중 우선순위 변동 | Phase별 PR 분할 + 각 PR 본문에 본 plan §5 단계 링크 |

### 6.2 응답 envelope 불일치 — classbot spec §3 갱신

현 spec §3:
- 성공: `{ id, ... }` 또는 `[ ... ]` (별도 wrapper 없음)
- 에러: `{ error: { code, message } }` + HTTP status

pullim envelope (Phase β 차용):
- 성공: `{ success: true, data: T }`
- 에러: `{ success: false, error: { code, message, statusCode } }`
- 에러 코드 = 도메인 prefix 대문자 (`BOT_NOT_FOUND`, `LIVE_SESSION_FORBIDDEN`, `ASSIGNMENT_VALIDATION`, `SCOPE_VIOLATION`, `COMMON_NOT_FOUND` 등)

**제안 — 옵션 A 채택** (planner G3 게이트 해소와 동일 패턴):
- Phase β PR 에 spec §3 갱신 패치를 **동봉** — 즉 spec §3 패치가 Phase β PR 머지의 일부로 함께 머지되며, 본 plan 이 *권위 spec 보다 먼저 envelope 계약을 덮어쓰지 않는다*
- spec §3 패치 머지 *이후* 에만 Phase δ 구현 진입: `ResponseInterceptor` / `HttpExceptionFilter` / `AllExceptionsFilter` + classbot 도메인 `ErrorMessages` 상수 신규
- Phase δ·ε snapshot 은 spec §3 갱신본 기준 envelope shape 로 기록 (byte-equal 목표 폐기는 spec §3 갱신본의 효과 — plan 의 일방 선언 아님)
- **승인 게이트**: Phase β PR 본문에 spec §3 갱신 diff 명시 + 사용자 명시 확인 후 머지. 미승인 시 Phase β PR 은 envelope 부분만 보류하고 common 패턴 차용만 진행

### 6.3 ScopeGuard — classbot 추가 결정 (planner에 없음)

| 결정 | 내용 |
|---|---|
| **ScopeGuard 도입 위치** | `apps/backend/src/common/guards/scope.guard.ts` — 도메인-비종속 위치 (planner와 공유 가능한 패턴이라 common 안) |
| **체크 시점** | endpoint 진입 시점, `@RequireScope(level)` 데코레이터 명시한 endpoint에만. 디폴트 = 가드 미적용 (= 모든 scope 허용) |
| **scope 값 출처** | request body 의 `scope_override`(assignments), path param의 botId → `class_bots.scope` 조회, live_session_id → `live_sessions.scope` 조회. classbot 도메인 특수 fetcher (`apps/backend/src/common/guards/scope-resolver.ts`) |
| **위반 시 응답** | 403 + `error.code = 'SCOPE_VIOLATION'` + `message = '봇 scope (Ln) 위반: 요청 scope (Lm)'` |
| **테스트 커버리지** | Phase β 통합 테스트에서 ScopeGuard 단독 테스트 + Phase δ·ε 각 endpoint에서 scope 위반 시나리오 1건씩 |

---

## 7. 게이트키퍼 합의 포인트

- **G3 (BE 게이트키퍼)** — 도메인 시그니처 합의 게이트는 자매 리포 결정 그대로 0건. 각 PR 본문에 §6.2·§6.3 링크
- **G4 (FE 게이트키퍼)** — Phase θ 진입 시점에서 데이터 패칭 패턴(Server Component vs Route Handler proxy vs Server Action) 확정 + envelope 분기 합의
- **G1** — 본 plan은 내부 구조 작업. §5 진척 보고 시점에 일괄

**사용자 명시 확인이 필요한 글로벌 작업 게이트** (G3·G4 도메인 합의와 별개로 항상 필수):
- Phase α — `proc/spec/2026-05-18_be-api-design.md` §2 SOT 라인 갱신, root `CLAUDE.md`/`AGENTS.md` cross-link 추가 (모노레포 구조 자체는 D-Lite 머지로 이미 확정)
- Phase β — `apps/backend/src/{common,config,database}/` 전부 신규 (글로벌 토대), `packages/{types,api-client,auth}/` 공유 패키지 본격 구현 (D-Lite 시 빈 placeholder), spec §3 envelope 갱신 (§6.2)
- Phase γ — `apps/backend/src/modules/classbot/entities/*` 26 테이블 entity 신규 (도메인 모델 락인), spec §2 본문 "24 테이블 vs 표 #1~#26 모순" 해소 갱신 ("26 테이블" 로 정렬)
- Phase γ' — Drizzle 자산 폐기 (`apps/classbot/{drizzle/, drizzle.config.ts, lib/db/, scripts/seed.ts}`, 의존성)
- Phase η·θ — FE mock 제거가 Playwright spec/prod-verify 에 영향 시 spec 갱신 PR 동봉 또는 선행 (§3.5)

본 plan 은 도메인 시그니처 측면에서 G3·G4 합의 게이트 부재 상태로 Phase α → θ 까지 진입 가능하지만, **위 글로벌 작업 게이트는 각 Phase PR 본문에서 사용자 명시 확인을 받은 뒤에 적용**한다 ("합의 게이트 0건" 결론은 도메인 시그니처에 한정 — 글로벌 작업 게이트는 별도).

---

## 8. 본 plan의 완료 정의

§1 "완료 기준" 7줄 모두 충족 시 — 사용자 명시("archive로 옮겨")가 있을 때만 `proc/archive/2026-05-27_planner-alignment.md` 로 이동.

---

## 9. 다음 단계

본 plan 동의 시 — Phase α 진입. D-Lite (PR #81) 머지로 모노레포 base 가 이미 확정됐으므로 Phase α 는 가벼운 SOT 라인 정리만:

1. **자매 리포 port 충돌 확인** — classbot postgres 5434 ↔ planner 5434. 자매 동시 dev 정책 결정 (사용자 입력)
2. spec §2 본문 SOT 라인 갱신: `src/lib/db/schema.ts` → `apps/classbot/lib/db/schema.ts` (단 1줄, 경로 명시)
3. root `CLAUDE.md` / `AGENTS.md` 에 본 plan §5 PR 진입 예고 cross-link 추가
4. `apps/backend/main.ts` `PORT` 기본값 (4032) 명시
5. Phase α PR 본문에 본 plan §5 진입 의도 + §6.1 리스크 매트릭스 cross-link
6. 1개 PR로 push (Codex Review 통과 후 머지)

Phase β 이후 작업 (NestJS common 차용 → entity 작성 → endpoint 이식 → FE Container/Presenter → mock 제거) 은 §5 단계별 PR 로 분리 진행. 본 plan 진입 여부 — 사용자 응답 대기.
