# 2026-05-27 — pullim-planner 정렬 plan (classbot 도메인 적응)

## 목표

이 리포(`pullim-classbot`)를 자매 리포 [`pullim-planner`](https://github.com/curea-co/pullim-planner) 와 동일한 **bun workspace mini-monorepo + NestJS BE + Container/Presenter FE** 패턴으로 정렬한다. planner가 PR #27(BE 차용 Phase α 머지) + PR #32(Container/Presenter 파일럿 머지) 까지 진행한 두 정렬 plan을 **classbot 도메인 특수성에 적응**시켜 단계화한 문서.

**완료 기준** (이 plan 전체):
- 리포 루트가 `apps/{classbot,backend}/` + `packages/{types,api-client,auth}/` 로 재편 (현 워크트리는 단일 `src/` — base `CLAUDE.md` §1·§3 가 이미 단일 추출본으로 규정하고 있으므로, 본 plan은 권위 문서가 *아직 정의하지 않은* 모노레포 구조를 신규 도입하는 작업임)
- `apps/backend/src/modules/classbot/` 가 spec `2026-05-18_be-api-design.md` **24 테이블** / ~36 endpoint 카탈로그에 대응하는 NestJS 모듈 보유 (Drizzle → TypeORM 완전 대체)
- `apps/classbot/` FE 페이지(학생 14 + 교사 10)가 모두 Container/Presenter 분리 + `features/<domain>/` 컨벤션
- `apps/classbot/` FE는 `@pullim-classbot/api-client` 만 import (mock 직접 import 0건)
- `proc/spec/2026-05-18_be-api-design.md` 갱신: 채택 ORM·API 스타일·디렉토리 구조를 새 결정으로 교체. 동시에 spec §3 응답 컨벤션을 pullim envelope 로 전환
- CLAUDE.md / AGENTS.md / README.md 가 새 모노레포 + Container/Presenter 컨벤션 반영
- `.github/workflows/prod-verify.yml` 은 **정렬 대상 외 — 별 자산으로 보존** (§3.5)

---

## 1. 배경 — 왜 정렬하나

### 1.1 D-Lite (이전 작업) 산출

- ✅ mini-monorepo 의도 (단, 실제 폴더는 아직 단일 `src/` — 본 plan Phase α에서 분리)
- ✅ Jest 셋업 (pullim-planner Phase β common 차용 시 그대로 활용)
- ✅ Drizzle ORM 유지 (Phase γ에서 TypeORM으로 완전 대체)
- ❌ Mock 잔존: `apps/classbot/lib/mock/{persona,family,tutor,classbot,chat,live-content,classbot-dynamic-replies,classbot-greeting,classbot-home-preview,classbot-wellness-bot}.ts` (총 10 파일) — Phase η에서 제거
- ❌ Container/Presenter 미도입 — 14+10 페이지가 모두 page 안에 로직
- ❌ BE 도메인 모듈 미작성 — `src/lib/db/` Drizzle schema만 존재 (Ph1·Ph2 seed 완료, Ph3 read API는 미착수)
- ✅ **`prod-verify.yml`** — production 회귀 자동화. 5개 자매 리포 중 classbot 유일 보유 자산

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
| **권한 모델** | 없음 (단일 사용자) | **`ScopeLevel` 1~5** — base `input/docs-archive/07_풀림_클래스봇_핸드오프.md` (5단계 Scope Guard 정의) + `input/docs-archive/05_풀림_수업방_세부기획.md` (수업방·라이브 Scope 정책) + spec `2026-05-18_be-api-design.md` (entity 스키마)가 SOT. `src/lib/mock/tutor.ts` 가 ScopeLevel 타입 보유. `class_bots.scope`, `live_sessions.scope`, `bot_questions.scope_used`, `assignments.scope_override` 등 다수 entity에 침투 | TypeORM entity 작성 시 `ScopeLevel` 을 `@pullim-classbot/types` 공유 패키지로 승격(Phase γ). 권한 가드는 Phase β에서 `RolesGuard` (pullim의 `JwtAuthGuard`+`RolesGuard` 패턴)을 **scope 기반으로 확장한 `ScopeGuard`** 신설 (mock 헤더 인증 위에 얹음) |
| **mock 출처 분기** | `lib/mock/planner.ts` 가 SOT | `chat.ts` = 원본 `phase1.ts`에서 클래스봇 채팅만 발췌. `tutor.ts` = ScopeLevel만 잔존(본체는 Q 도메인). `family.ts` = type만 (보호자 UI는 사라짐) | Phase η에서 mock 제거 시 chat은 `chat_messages` entity로 이식, tutor는 ScopeLevel만 types 패키지로 승격, family는 spec entity #2 `parent_child_links` 로 흡수 |

### 2.1 builder · replay 의미

- **builder** (`apps/classbot/(teacher)/teacher/builder/page.tsx`, 156줄) = 봇 빌더 (교사 도구). 봇 생성 wizard. `class_bots` + `bot_settings` + `bot_curriculum_units` 3 entity 동시 mutation
- **replay** (학생 `/classbot/replay`, 교사 `/teacher/replay`) = 학생 대화 리플레이. spec entity #13~#16 (`replays`, `replay_bookmarks`, `replay_teacher_questions`, `replay_watch_progress`) 4 entity 단일 feature

builder는 **교사 Phase**, replay는 **학생/교사 양쪽 모두**에 등장 — features 폴더에서는 단일 도메인(`classbot-replay`)으로 두고 학생/교사 Container 두 개를 같은 feature 안에 둔다 (cross-route widget 공유).

---

## 3. 최종 디렉토리 구조 (after)

```
pullim-classbot/
├── apps/
│   ├── classbot/                            # ← 현 src/, public/, next.config.ts 등 통째로
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (student)/classbot/      # 14 페이지
│   │   │   │   └── (teacher)/teacher/       # 10 페이지
│   │   │   ├── components/
│   │   │   │   ├── features/
│   │   │   │   │   ├── classbot-home/       # 학생 홈 (376줄)
│   │   │   │   │   ├── classbot-chat/       # 학생 채팅 (755줄 — 최대 단일 페이지)
│   │   │   │   │   ├── classbot-discover/   # 학생 봇 발견
│   │   │   │   │   ├── classbot-replay/     # 학생+교사 공용 replay
│   │   │   │   │   ├── classbot-assignment/ # 학생 과제 (assignment 3 page + result)
│   │   │   │   │   ├── classbot-wellness/   # 학생 웰빙·감정 체크인
│   │   │   │   │   ├── classbot-live/       # 학생 라이브 시청
│   │   │   │   │   ├── classbot-me/         # 학생 본인 리포트
│   │   │   │   │   ├── classbot-onboarding/ # 학생 온보딩
│   │   │   │   │   ├── teacher-home/        # 교사 홈 (288줄)
│   │   │   │   │   ├── teacher-classbot/    # 교사 내 봇 목록 (288줄)
│   │   │   │   │   ├── teacher-builder/     # 교사 봇 빌더 (156줄)
│   │   │   │   │   ├── teacher-grading/     # 교사 채점
│   │   │   │   │   ├── teacher-replay/      # 교사 replay (classbot-replay 빌려옴 가능)
│   │   │   │   │   ├── teacher-reports/     # 교사 리포트
│   │   │   │   │   └── teacher-assignment/  # 교사 과제 출제
│   │   │   │   ├── shell/                   # 현 shell — 그대로 (글로벌)
│   │   │   │   ├── ui/                      # shadcn 프리미티브 — 그대로
│   │   │   │   ├── brand/                   # 그대로
│   │   │   │   └── shared/                  # (Phase η에서 필요 시) 진짜 순수 뷰만
│   │   │   └── lib/{tokens,utils,...}/
│   │   ├── tests/                           # Playwright — apps/classbot 안으로 이동
│   │   ├── playwright.config.ts
│   │   ├── next.config.ts
│   │   ├── eslint.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json                     # @pullim-classbot/classbot
│   └── backend/                             # ← NestJS 11 신규 (planner와 동일 토대)
│       ├── src/
│       │   ├── common/{bootstrap,filters,guards,interceptors,decorators,dto,swagger,validation-messages,utils,interfaces,infrastructure,constants}/
│       │   ├── config/{database,timezone,swagger}.config.ts
│       │   ├── database/{data-source.ts, database.module.ts, migrations/, seeds/}
│       │   ├── entities/{user.entity.ts, class-bot.entity.ts, classroom.entity.ts, enrollment.entity.ts, live-session.entity.ts, live-quiz.entity.ts, bot-question.entity.ts, replay.entity.ts, replay-bookmark.entity.ts, replay-teacher-question.entity.ts, replay-watch-progress.entity.ts, assignment.entity.ts, assignment-question.entity.ts, grading-item.entity.ts, grading-history.entity.ts, emotion-checkin.entity.ts, wellbeing-snapshot.entity.ts, crisis-alert.entity.ts, report.entity.ts, template.entity.ts, chat-message.entity.ts, bot-curriculum-unit.entity.ts, bot-settings.entity.ts, lesson.entity.ts, parent-child-link.entity.ts, consent-log.entity.ts}/      # spec §2 entity 표 24 테이블 (행 번호는 #1~#26 — #25 templates·#26 chat_messages 포함 시 entity 디렉토리는 26 파일. spec 본문 "총 24 테이블" 이 SOT)
│       │   ├── modules/
│       │   │   ├── identity/                # users + parent_child_links + consent_logs (spec §4.1)
│       │   │   ├── bots/                    # class_bots + classrooms + enrollments + bot_settings + bot_curriculum_units (spec §4.2)
│       │   │   ├── live/                    # lessons + live_sessions + live_quizzes + bot_questions (spec §4.3)
│       │   │   ├── replays/                 # replays + bookmarks + teacher_questions + watch_progress (spec §4.4)
│       │   │   ├── assignments/             # assignments + assignment_questions + chat_messages (spec §4.5)
│       │   │   ├── grading/                 # grading_items + grading_history (spec §4.6)
│       │   │   ├── wellbeing/               # emotion_checkins + wellbeing_snapshots + crisis_alerts (spec §4.7)
│       │   │   ├── reports/                 # reports (spec §4.8)
│       │   │   └── marketplace/             # templates (spec §4.8)
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
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── codex-review.yml
│       └── prod-verify.yml                  # ★ 정렬 대상 외 — 별 자산으로 보존 (§3.5)
├── docker-compose.yml                       # Postgres 그대로 (port 5434, classbot DB 유지)
├── package.json                             # workspace root
├── bun.lock
├── turbo.json                               # 신규
├── tsconfig.base.json                       # 신규
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

**폐기 대상 (Phase α PR에서 제거)**:
- `drizzle/`, `drizzle.config.ts`
- `src/lib/db/` (Drizzle schema)
- `src/app/api/` (있을 경우 — 현재 미작성 상태로 추정, Phase α 진입 시 확인)
- `scripts/seed.ts` (apps/backend TypeORM seed로 재작성)
- 루트 `package.json` 내 `db:generate/migrate/push/studio/seed` 스크립트 + Drizzle·pg 의존성

**port 정책 유지**:
- classbot FE: **3032** (현재 그대로, planner 3030과 분리)
- backend: **4032** (planner 4030과 분리)
- postgres: **5434** (planner 5434와 충돌 — 자매 리포 분리 운영 시 5435 로 변경 검토. Phase α PR 본문에서 사용자 확인)

### 3.5 prod-verify.yml 보존 정책

`.github/workflows/prod-verify.yml` 은 5개 자매 리포 중 classbot 유일 보유 자산이다. 본 정렬 plan은 이 워크플로우를 **건드리지 않는다**:

- 모든 Phase 에서 `.github/workflows/prod-verify.yml` 편집 금지 (`.github/workflows/**` 는 글로벌 작업 범주 — base 가이드 정신 + 자매 리포 `CLAUDE.md` 패턴 모두 사용자 명시 확인을 요구하는 영역)
- 단, **path filter 갱신은 Phase α에서 필요**: 현 `paths` 가 `src/**`, `public/**`, `tests/**` 등을 가리키는데, 모노레포 재편 후에는 `apps/classbot/**` 로 옮겨야 함. → **이 path 갱신은 본 plan 이 자체 예외 선언하지 않는다.** Phase α PR 본문에서 사용자에게 **명시 확인을 요청**하고 (글로벌 작업으로 분류), 승인을 받은 뒤에만 단순 경로 치환을 수행한다 (워크플로우 로직 무변경). 승인 미획득 시 Phase α는 path filter 갱신 없이 머지하고 prod-verify 영향(빌드 트리거 누락)을 PR 본문에 명시한다
- production URL (`https://pullim-classbot.vercel.app`), x-build-sha 검증 메커니즘, Playwright spec 7개 모두 보존
- Phase η (FE mock 제거) 진행 시 Playwright spec 의 `lib/mock` 의존이 깨질 수 있음 → **Phase η PR 본문에서 prod-verify 영향 분석 + 필요 시 spec 갱신 PR을 별도로 분리** (prod-verify 워크플로우 자체는 무변경. spec 파일 편집도 워크플로우 트리거에 영향 주는 작업이므로 PR 본문에서 사용자에게 영향 요약 + 진행 승인 요청)

---

## 4. 변경점 매트릭스

### 4.1 명령어 — bun workspace 패턴

| 현재 | 변경 후 |
|---|---|
| `bun dev` (port 3032) | `bun run dev` (turbo) 또는 `bun run dev:classbot` |
| `bun run build` | `bun run build` (turbo) |
| `bun x tsc --noEmit` | `bun run typecheck` (turbo) |
| `bun run db:up` | `bun run db:up` (root, docker-compose 그대로) |
| (없음) | `bun run dev:backend` — `bun --filter @pullim-classbot/backend start:dev` |
| `bun x playwright test` | `bun --filter @pullim-classbot/classbot test:e2e` (Phase α에서 playwright apps/classbot 안으로 이동) |
| `bun run db:generate` (drizzle-kit) | `bun --filter @pullim-classbot/backend migration:generate -- <Name>` |
| `bun run db:seed` (scripts/seed.ts) | `bun --filter @pullim-classbot/backend seed:run` |

### 4.2 CLAUDE.md / AGENTS.md 갱신 항목

- §1 살아 있는 영역 표 → `apps/classbot/...` 경로로 일괄 치환
- §2 사라진 영역은 그대로 (도메인 추출 사실 자체는 무관)
- 신규 §1.5 (또는 §3) **모노레포 구조** 표 추가 — planner CLAUDE.md §1 패턴
- §5 작업 컨벤션 → 학생/교사 두 그룹 boundary 명시, `features/<domain>/` 컨벤션 추가, `apps/backend/src/{common,config,database}/` = 글로벌 작업 명시
- AGENTS.md → planner AGENTS.md 의 "Container/Presenter 컨벤션" 표 + "cross-feature import 정책" 그대로 차용 (도메인명만 `planner-*` → `classbot-*`, `teacher-*`)

### 4.3 권위 spec 갱신 (`proc/spec/2026-05-18_be-api-design.md`)

| 결정 항목 | 현행 | 갱신 |
|---|---|---|
| ORM | Drizzle 0.36.x | **TypeORM 0.3.x** (Data Mapper) |
| API 스타일 | Next.js API routes | **NestJS 11 — apps/backend** |
| 마이그레이션 | drizzle-kit | typeorm migration:generate |
| 디렉토리 | `src/lib/db/schema.ts` (SOT) | `apps/backend/src/entities/*` (SOT) |
| 응답 컨벤션 (§3) | raw `{ id, ... }` 또는 `{ error: { code, message } }` | **pullim envelope** `{ success, data \| error }` + `ResponseInterceptor`/`HttpExceptionFilter`/`AllExceptionsFilter` 3축 + 도메인 prefix 에러 코드(`BOT_NOT_FOUND`, `LIVE_SESSION_FORBIDDEN`, `SCOPE_VIOLATION`, `COMMON_VALIDATION_FAILED` 등) |
| 인증 (§3, Ph8) | mock `x-user-id` 헤더 | **유지** — `@pullim-classbot/auth` MockAuthProvider 추상화 추가, role(`student`/`teacher`/`parent`) + ScopeLevel(1~5) 가드 |
| Phase 로드맵 (§5) | Ph1~Ph9 | **재진입**: Ph1·Ph2 결과물은 pullim 패턴으로 재작성 (Drizzle 시드 → TypeORM 시드). Ph3~Ph7 = 본 plan Phase γ~η. Ph8·Ph9 보류 (자매 리포 결정 그대로) |

### 4.4 의존성 변경

**`apps/backend/package.json` 추가** (pullim-planner 차용 plan §4.4와 동일):
- `@nestjs/{common,core,platform-express,config,typeorm,swagger,jwt,passport}`
- `typeorm`, `pg`, `class-validator`, `class-transformer`, `nestjs-cls`, `reflect-metadata`
- dev: `@nestjs/cli`, `@nestjs/testing`, `@types/express`, `@types/node`, `ts-node`, `tsconfig-paths`

**루트에서 제거** (apps/classbot은 유지):
- `drizzle-orm`, `drizzle-kit`, `pg`(루트에서), `@types/pg`

**packages/types 추가** (`@pullim-classbot/types`):
- `ScopeLevel` 1~5 + `scopeMeta` Record (현 `lib/mock/tutor.ts` 를 그대로 이식)
- `BotTone` 5종 (`'정중' | '친근' | '스파르타' | '차분' | '열정'`)
- spec §2 entity 표 **24 테이블** (#1~#26 행 — templates·chat_messages 포함) 의 DTO 타입 (BE↔FE 공유)

### 4.5 PR 머지 정책

- 매 PR Codex Review 통과 필수 (자매 리포 룰)
- main 머지 후 prod-verify 워크플로우 자동 트리거 — Vercel 빌드 → x-build-sha polling → Playwright prod hit 7 spec
- **Phase η 진입 전까지 Playwright spec 영향 없음** (mock 제거 전이라 spec 의존성 무변경)
- 본 plan 진행 중 어느 PR도 prod-verify 워크플로우 자체를 편집하지 않음 — path filter 갱신 단 1회(Phase α)만 예외이며, 이마저도 글로벌 작업 분류로 사용자 명시 확인이 선행되어야 함 (§3.5)

---

## 5. PR 분할 (제안 — 7 단계 / 9 PR)

각 단계는 독립 PR로 머지 가능. 이전 단계 머지 → 다음 단계 진입. **학생/교사 페이지 분리**가 정렬의 핵심이라 Phase 2·3은 학생/교사 하위 Phase로 분할.

### Phase α — 모노레포 재편 + Drizzle 자산 폐기 (1 PR)

**목표**: 동작 회귀 없이 구조만 재편. prod-verify 보존.

- `apps/classbot/` 생성, 기존 `src/`, `public/`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `playwright.config.ts`, `tests/`, `components.json` 통째로 이동
- `apps/backend/` 빈 NestJS 부팅 (Hello World controller만)
- `packages/{types,api-client,auth}/` 빈 스캐폴딩 (`src/index.ts` exports만)
- bun workspace 셋업 (`package.json` workspaces 필드, name `@pullim-classbot/*`)
- `turbo.json` 신규 + `tsconfig.base.json` 신규
- **폐기**: `drizzle/`, `drizzle.config.ts`, `src/lib/db/`, `scripts/seed.ts`, 루트 `db:*` 스크립트 일부 (`db:up/down/reset`는 root에 잔존)
- **prod-verify path filter 갱신** (글로벌 작업 — 사용자 명시 확인 필요): `src/**` → `apps/classbot/src/**`, `tests/**` → `apps/classbot/tests/**`, `playwright.config.*` → `apps/classbot/playwright.config.*`. 워크플로우 다른 부분 무변경. Phase α PR 본문에서 사용자에게 path filter 변경 승인 요청 후 적용 (§3.5 참조)
- CLAUDE.md / AGENTS.md / README.md 갱신
- **완료 기준**: `bun run dev` (classbot port 3032) + `bun run dev:backend` (NestJS hello, port 4032) 둘 다 부팅. 기존 라우트(student 14 + teacher 10) 회귀 0. prod-verify 워크플로우 path filter만 갱신, 다음 main push 시 정상 동작 확인.

### Phase β — pullim common 패턴 차용 + ScopeGuard 신설 (1 PR)

**목표**: NestJS 토대 + classbot 권한 모델 1차 셋업.

- `apps/backend/src/common/` 전부 — pullim-planner Phase β 와 동일 (bootstrap·filters·interceptors·decorators·dto·validation-messages·swagger·utils·interfaces(BaseRepositoryInterface)·infrastructure(BaseRepository))
- `apps/backend/src/config/{database,timezone,swagger}.config.ts`
- `apps/backend/src/database/{data-source.ts, database.module.ts, migrations/, seeds/}`
- nestjs-cls 글로벌, AllExceptionsFilter + HttpExceptionFilter + ResponseInterceptor 전역 등록
- **MockAuthGuard** (`x-user-id` 헤더 → fallback `student_001`/`teacher_001` role 분기) — `users.role` 컬럼 조회 후 req.user 주입
- **RolesGuard** — `@Roles('teacher')` 데코레이터로 교사 전용 endpoint 보호 (spec §4.6 grading, §4.2 봇 생성, §4.5 출제 등)
- **ScopeGuard 신설** — `@RequireScope(level)` 데코레이터. `class_bots.scope` 1~5 + `assignments.scope_override`/`live_sessions.scope` 와 매칭. 클래스봇 도메인 특수 가드 (planner에는 없음, **§2.3** 참조)
  - decorator: `apps/backend/src/common/decorators/scope.decorator.ts`
  - guard: `apps/backend/src/common/guards/scope.guard.ts`
  - `@pullim-classbot/auth` 패키지로 ScopeLevel 비교 helper 노출
- `packages/types/src/scope.ts` — `ScopeLevel` + `scopeMeta` 정의 (apps/classbot 의 `lib/mock/tutor.ts` 를 import하던 곳을 types로 전환)
- **완료 기준**: Swagger `/api-docs` 노출, `x-user-id` 헤더 가드 동작, `@RequireScope(3)` 붙은 더미 endpoint가 scope 2 사용자에 403 응답.

### Phase γ — entity 설계 (spec §2 24 테이블) + 마이그레이션 1개 (1 PR)

**목표**: mock 시그니처 ↔ TypeORM entity 매핑 + 첫 마이그레이션. spec §2 entity 표 **24 테이블** (행 #1~#26, templates·chat_messages 포함) 전체 1차 작성.

- `apps/backend/src/entities/` 작성 (spec §2 24 테이블 — entity 디렉토리는 26 파일):
  - Identity 3: `user`, `parent-child-link`, `consent-log`
  - Bot Definition 5: `classroom`, `class-bot`, `enrollment`, `bot-curriculum-unit`, `bot-settings`
  - Live 4: `lesson`, `live-session`, `live-quiz`, `bot-question`
  - Replay 4: `replay`, `replay-bookmark`, `replay-teacher-question`, `replay-watch-progress`
  - Assignment & Chat 3: `assignment`, `assignment-question`, `chat-message`
  - Grading 2: `grading-item`, `grading-history`
  - Wellbeing 3: `emotion-checkin`, `wellbeing-snapshot`, `crisis-alert`
  - Reports & Market 2: `report`, `template`
- DB 스키마는 **현 Drizzle schema와 비트단위 동일**하게 도출 (`pg_dump --schema-only` diff 검증)
- TypeORM 마이그레이션 1개 생성 (현 `drizzle/0000_stiff_ulik.sql` 와 동등)
- seed: `apps/backend/src/database/seeds/` 신설, 기존 `scripts/seed.ts` 의 mock 데이터를 TypeORM repo로 재작성 — 10개 mock 파일 전부 흡수 (persona·family·tutor·classbot·chat·live-content·classbot-greeting·classbot-home-preview·classbot-wellness-bot·classbot-dynamic-replies)
- spec §2 entity 표는 **시그니처 갱신 불요** (entity 컬럼 시그니처는 이미 확정). spec §2 말미 `src/lib/db/schema.ts`가 SOT → `apps/backend/src/entities/*`가 SOT로 한 줄 갱신
- **invariant 검증** (spec §2.주요 invariant): enrollments PK / bot_settings PK / replay_watch_progress PK / emotion_checkins unique(student_id, date) / wellbeing_snapshots PK / enrollments→class_bots ON DELETE CASCADE / replay_bookmarks→replays ON DELETE CASCADE — 모두 TypeORM `@PrimaryColumn` + `@Unique` + `@OneToMany({ onDelete: 'CASCADE' })` 로 표현
- **완료 기준**: `bun --filter @pullim-classbot/backend migration:run` → 기존 Drizzle 스키마와 diff 0. `bun --filter @pullim-classbot/backend seed:run` → users 3행 (학생+교사+학부모) + class_bots 5행 (cb_001~cb_005) + 학생·교사 mock 시그니처 전부 동등.

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

각 페이지의 `'use client'` 제거 + Server Component + `<Suspense><XxxContainer /></Suspense>` 패턴. `src/components/classbot/*` 28개 컴포넌트 중 **학생 라우트가 쓰는 것** 만 `features/classbot-*/components/` 로 이동 (git mv). 교사용은 Phase η-2 까지 잔존.

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
- `teacher/builder/page.tsx` (156줄) → `BuilderContainer` + `BuilderPresenter` + `useBuilderWizard` hook (`src/components/builder/{builder-types.ts, step-content.tsx, step-indicator.tsx}` 흡수)
- `teacher/grading/page.tsx` (147줄) → `TeacherGradingContainer` + `TeacherGradingPresenter`
- `teacher/grading/[id]/page.tsx` (20줄, thin) — 분리 안 함
- `teacher/replay/page.tsx` (126줄) → `TeacherReplayListContainer` (학생 `classbot-replay` 의 widget 빌려옴 — cross-feature import 허용)
- `teacher/replay/[id]/page.tsx` (181줄) → `TeacherReplayDetailContainer` + `TeacherReplayDetailPresenter`
- `teacher/reports/page.tsx` (115줄) → `TeacherReportListContainer` + `TeacherReportListPresenter`
- `teacher/reports/[id]/page.tsx` (138줄) → `TeacherReportDetailContainer` + `TeacherReportDetailPresenter`
- `teacher/assignment/new/page.tsx` (5줄, thin) — 분리 안 함

- `src/components/classbot/*` 28개 중 교사 라우트 의존 widget 전부 `features/teacher-*/components/` 또는 `features/classbot-*/components/` 로 이동
- 빈 `src/components/{classbot,builder}/` 디렉토리 제거
- **완료 기준**: 교사 10 페이지 중 logic 보유 7개 분리. shell·ui·brand 그대로. Playwright 회귀 0.

### Phase θ — FE mock 제거 → `@pullim-classbot/api-client` 전환 (1~2 PR)

**목표**: mock 직접 import 0건 + prod-verify Playwright spec 영향 최소화.

- `apps/classbot/src/components/features/*/containers/*` 안의 `from '@/lib/mock/*'` 전부 `@pullim-classbot/api-client` 호출로 치환
- Server Component 데이터 패칭 패턴 확정 (Server Component fetch vs Route Handler proxy vs Server Action — pullim envelope 분기 한 군데로)
- `chat.ts` mock (원본 phase1.ts 발췌분) → `chat_messages` entity 시드로 흡수 + `POST /api/bots/{id}/chat` (Phase ε 🟠 endpoint)
- mock 10개 파일 자체는 **마지막 PR에서만 제거** (회귀 안전망)
- **prod-verify 영향 검증**: Playwright spec 7개 중 어느 spec이 mock에 의존하는지 사전 확인. 의존 spec이 있으면 해당 spec을 BE 응답 expect로 갱신 (prod-verify 워크플로우 자체는 무변경)
- **완료 기준**: `grep -r "from '@/lib/mock" apps/classbot/src/` 0건. `bun --filter @pullim-classbot/classbot test:e2e` 통과. prod-verify 다음 main push 시 정상 동작.

---

## 6. 리스크 매트릭스 + 사전 결정

### 6.1 리스크 — 자매 리포(planner) 차용 + classbot 추가분

| 리스크 | 영향 | 대응 |
|---|---|---|
| **bun + NestJS 호환성** | NestJS 부팅 실패 시 전체 좌초 | planner 결정 그대로: Phase α 진입 시 30분 spike. 실패 시 backend만 node + pnpm 자동 분기 (사용자 사전 지시) |
| **bun workspace ↔ turbo** | Phase α PR 부풀어오름 | turbo 2.7.x bun 지원. 막히면 root scripts 래핑 |
| **현행 Drizzle 스키마 ↔ TypeORM entity 매핑 정확도** | Phase γ 24 테이블 diff (spec §2 SOT) | `pg_dump --schema-only` 비교 + Phase γ PR diff 보고서 |
| **응답 envelope shape 변경 (raw → pullim envelope)** | Phase δ·ε FE 즉시 영향 없음, Phase θ 폭발 | spec §3 갱신 (Phase β PR 동봉). FE 전환은 Phase θ 한 번에 |
| **prod-verify Playwright spec mock 의존** | Phase θ 머지 시점에 prod-verify 자동 실패 가능 | Phase θ 진입 시 spec 의존성 사전 확인 + 영향 있는 spec 별도 PR로 분리 갱신. **prod-verify 워크플로우 자체는 무변경** (§3.5) |
| **postgres port 5434 자매 리포 충돌** | 두 리포 동시 dev 실행 시 docker-compose 충돌 | Phase α PR 본문에서 사용자 확인 — classbot port를 5435로 변경할지, 자매 리포 동시 실행 안 함을 정책으로 둘지 |
| **학생/교사 mock 시그니처 분리 정도** | Phase γ entity 작성 시 어디까지를 학생/교사 entity로 분할? | spec §2 24 테이블 표가 이미 통합 entity (예: `users.role`) → planner와 동일하게 single-table-role 패턴. Phase γ 시작 시 추가 분리 결정 불요 |
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

**결정 — 옵션 A 자동 채택** (planner G3 게이트 해소 그대로):
- Phase β에서 `ResponseInterceptor` / `HttpExceptionFilter` / `AllExceptionsFilter` + classbot 도메인 `ErrorMessages` 상수
- Phase δ·ε snapshot은 envelope shape로 새로 기록 (byte-equal 목표 폐기)
- spec §3 갱신 패치는 Phase β PR에 동봉

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
- Phase α — root `package.json`/`bun.lock`/`turbo.json`/`tsconfig.base.json` 신규·재편, `CLAUDE.md`/`AGENTS.md`/`README.md` 갱신, `.github/workflows/prod-verify.yml` path filter 갱신, `drizzle/`·`src/lib/db/`·`scripts/seed.ts` 폐기 (§3.5)
- Phase β — `apps/backend/src/{common,config,database}/` 전부 신규 (글로벌 토대), `packages/{types,api-client,auth}/` 공유 패키지 신규
- Phase γ — `apps/backend/src/entities/*` 24 테이블 entity 신규 (도메인 모델 락인)
- Phase η·θ — FE mock 제거가 Playwright spec/prod-verify 에 영향 시

본 plan 은 도메인 시그니처 측면에서 G3·G4 합의 게이트 부재 상태로 Phase α → θ 까지 진입 가능하지만, **위 글로벌 작업 게이트는 각 Phase PR 본문에서 사용자 명시 확인을 받은 뒤에 적용**한다 ("합의 게이트 0건" 결론은 도메인 시그니처에 한정 — 글로벌 작업 게이트는 별도).

---

## 8. 본 plan의 완료 정의

§1 "완료 기준" 7줄 모두 충족 시 — 사용자 명시("archive로 옮겨")가 있을 때만 `proc/archive/2026-05-27_planner-alignment.md` 로 이동.

---

## 9. 다음 단계

본 plan 동의 시 — Phase α 진입. 진입 시 작업 순서:

1. bun + NestJS 30분 spike (§6.1 리스크 1번)
2. **자매 리포 port 충돌 확인** — classbot postgres 5434 ↔ planner 5434. 자매 동시 dev 정책 결정 (사용자 입력)
3. `apps/classbot/` 디렉토리로 현 코드 이동 + import 경로 갱신 + `bun dev` 3032 검증 + `bun x playwright test` 7 spec 회귀 0
4. `apps/backend/` 빈 NestJS 스캐폴딩 + Hello World (port 4032)
5. `packages/{types,api-client,auth}/` 빈 패키지
6. workspace · turbo · tsconfig.base 셋업
7. CLAUDE.md / AGENTS.md / README.md / spec 갱신
8. **폐기**: `drizzle/`, `src/lib/db/`, `scripts/seed.ts`, drizzle 의존성
9. **prod-verify path filter 갱신** (예외 — §3.5)
10. 1개 PR로 묶어 push (Codex Review 통과 후 머지)

본 10단계 진입 여부 — 사용자 응답 대기.
