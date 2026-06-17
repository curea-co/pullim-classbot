# 풀림 클래스봇 — CUDS variant-B 정렬 + 채팅 3열 + product-ready refine (Design)

- 작성일: 2026-06-17
- 상태: 설계 승인 대기 → 승인 후 writing-plans
- 권위 입력: [curea-co/curea-design-system](https://github.com/curea-co/curea-design-system) (CUDS), 로컬 audit (워크플로 `classbot-cuds-understand`, 11 agents)
- 범위: `apps/classbot/` FE 전용 (BE 변경 없음)

## 0. 목표

풀림 클래스봇 전체 UI를 **CUDS variant-B(rounded/calm/learning)** 에 정렬하고, 채팅을 **챗봇 중심 3열**로 개편하며, 학생+교사 **29개 페이지 전부**를 product-ready 수준으로 refine 한다.

## 1. 확정된 결정 (Locked decisions)

| # | 결정 | 값 |
|---|---|---|
| 1 | CUDS 적용 깊이 | **토큰 정렬 + 컴포넌트 벤더링** (외부 패키지 import 안 함 → CLAUDE.md "shadcn 단독" 유지) |
| 2 | Variant | **B** (rounded/calm/learning) |
| 3 | 범위 | 학생+교사 **29개 페이지 전부** |
| 4 | 셸 구조 | **2열 앱 셸 앱-전역 + 채팅 페이지만 3열**(우측 컨텍스트 레일) |
| 5 | 다크모드 | **라이트 우선 + 다크 토큰만 정리**(per-page 다크 QA는 후속) |
| 6 | 색 시스템 | **CUDS semantic 색 복원**(success/warn/danger/info), 레몬 = "attention/CTA" 단일 예약 |
| 7 | CLAUDE.md 충돌 | 토큰 차용·소스 벤더링으로 해소. `apps/classbot/CLAUDE.md`의 "외부 DS 패키지 import 금지" 위반 안 함. 단 컨벤션 문구 갱신은 글로벌 작업으로 별도 처리 |

> **CLAUDE.md 최상위 규칙(PR FE/BE 분리, 리뷰 수렴 위해 단위 분할)** 은 유지한다. 설계는 29면 전부를 다루되, **구현 PR은 계층별로 분할**한다(§7 Phasing). FE 단일 계층이므로 FE/BE 혼합 문제는 없다.

## 2. Foundation — 토큰 레이어 (최우선)

### 2.1 문제 (audit)
- **두 개의 평행한 색 소스가 이미 drift**: `globals.css @theme` 와 `lib/tokens/index.ts` 가 같은 스케일을 손으로 중복 정의하고 불일치(warn = CSS `#B7791F` vs TS `#F59E0B`).
- **하드코딩 hex 85개**가 `lib/tokens/*` 에 누수: `assignment-state.ts` 가 팔레트에 없는 `#0F1A3A`/`#C03B3F`/`#0E8C56`/`#D97706` 를 반환. `bot-signature.ts` 시그니처 hex 2중 정의 + `#1E40AF`(토큰 아님) fallback.
- Pretendard 가 CDN `@import`(render-blocking) 로 로드 — Geist 는 next/font 자체호스팅. 불일치.

### 2.2 해결 원칙
1. **CSS `@theme` = 단일 진실 소스.** `globals.css` 를 CUDS pullim×variant-B OKLCH 로 재작성.
2. **`lib/tokens/*` 는 CSS 에서 재유도**(`var(--*)` 참조 또는 생성된 mirror). 손으로 두 벌 유지 금지.
3. `assignment-state.ts` / `bot-signature.ts` / `tier.ts` 는 **토큰 ref 반환**, magic hex 금지. 상태색은 semantic state 토큰(`--color-state-overdue` 등) 신설.
4. **하나의 명명 타입 스케일** 도입(아래) — `text-[9/10/11/12px]` 일회성 px 전부 제거.
5. Pretendard **`next/font/local` 자체호스팅**.

### 2.3 CUDS pullim × variant-B 토큰 (출처 `/tmp/cuds`, light 기준)

**Primary ramp (pullim 브랜드, hue 258, seed `#0362DA` @600):**
```
--color-primary-50  oklch(0.972 0.024 258)   --color-primary-500 oklch(0.640 0.189 258)
--color-primary-100 oklch(0.940 0.039 258)   --color-primary-600 oklch(0.524 0.197 258)  /* SEED */
--color-primary-200 oklch(0.890 0.069 258)   --color-primary-700 oklch(0.474 0.181 258)
--color-primary-300 oklch(0.820 0.108 258)   --color-primary-800 oklch(0.414 0.154 258)
--color-primary-400 oklch(0.730 0.154 258)   --color-primary-900 oklch(0.364 0.118 258)
                                             --color-primary-950 oklch(0.264 0.083 258)
```
**Secondary (lemon, 절제 사용):** `--color-secondary-500 oklch(0.967 0.197 116)` (#E6FF4C)
**Neutral/gray (hue 286, _base):** 50 `oklch(0.985 0 0)` … 500 `oklch(0.552 0.013 286)` … 950 `oklch(0.141 0.008 286)` (11 stops)
**Semantic status (_base):**
```
success-50 oklch(0.965 0.024 158)  success-500 oklch(0.696 0.170 162)  success-600 oklch(0.596 0.145 163)
warning-50 oklch(0.987 0.026 102)  warning-500 oklch(0.795 0.184 86)   warning-600 oklch(0.681 0.162 76)
danger-50  oklch(0.971 0.013 17)   danger-500  oklch(0.637 0.237 25)   danger-600  oklch(0.577 0.245 27)
info-50    oklch(0.977 0.014 234)  info-500    oklch(0.685 0.169 237)  info-600    oklch(0.588 0.158 241)
```
**Semantic actions:** `action-primary = primary-600`, hover `primary-700`, fg `#fff`; `action-secondary = primary-50`, fg `primary-700`; `focus-ring = primary-600`.
**Surfaces (variant-b):** canvas `oklch(0.985 0.005 240)`, raised `#fff`, sunken `oklch(0.970 0.010 240)`.
**Borders:** subtle `oklch(0.932 0.008 240)`, default `oklch(0.890 0.012 240)`, strong `oklch(0.780 0.020 240)`.
**Radius (variant-b, 브랜드 md→16):** xs 6 · sm 8 · md 16 · lg 16 · xl 20 · 2xl 28 · full 9999.
**Spacing:** 0/2/4/6/8/12/16/20/24/32/40/48/64/80/96 px (`--space-0..14`).
**Type scale:** 2xs 11 · xs 12 · sm 13 · base 14 · md 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36 · 5xl 48.
**Line-height:** body 1.75(브랜드) · h1/display 1.25 · h2 1.3 · h3–h4 1.4 · button/input 1.0.
**Letter-spacing:** body -0.011em · h4 -0.022 · h3 -0.025 · h2 -0.03 · h1 -0.04 · display -0.05.
**Fonts:** sans = Pretendard Variable 우선 스택; display = Noto Serif KR(h1 한정); mono = JetBrains Mono.
**Motion:** instant 100 · fast 200 · normal 300(브랜드 400 calmer) · slow 500; ease.standard `cubic-bezier(0.2,0,0,1)`, emphasized `cubic-bezier(0.3,0,0,1)`.
**Shadow (variant-b soft multi-layer):** sm/md/lg/xl 다층 — audit 기록값 사용.
**Dark:** 동일 ramp, chroma ×0.85 (OLED 진동 방지). 토큰은 유지·정리하되 per-page QA 후속.

### 2.4 명명 타입 스케일(역할)
`display`(h1 serif) · `title`(섹션 h2) · `subtitle` · `body` · `label` · `caption` · `overline`. 모든 chrome/페이지 텍스트를 이 7역할로 매핑. **11px 은 라틴/숫자 micro-label 전용**(⌘K, 카운트, ISO 날짜), 한글 12px floor, 10px 이하 전면 금지.

### 2.5 Korean typography 비협상 기본값 (전 페이지)
`word-break: keep-all` + `overflow-wrap: break-word` 전 한글 컨테이너 / `word-break: break-all` **0건** / 음수 letter-spacing 래더 / line-height ≥1.6 / `font-feature-settings:"ss06" 1` + tabular-nums / `<html lang="ko">` / body 대비 ≥7:1·secondary ≥4.5:1.

### 2.6 CI 게이트 (하드 블로커 2종)
1. `grep -r "word-break: break-all" apps/classbot` → 0 hits.
2. `grep -rE "#[0-9a-fA-F]{6}" apps/classbot/components` → 토큰 파일만 매치.

## 3. App shell — 2열 (확정)

- 기존 2열 `app-shell.tsx` 유지 + **optional `rightRail` 슬롯 추가**(유일한 구조 변경): `hidden lg:flex w-80 border-l` 3번째 컬럼, `lg` 미만 Sheet 로 붕괴. **`/chat` 만 사용.**
- audit 수정: top-level 페이지의 빈 36px breadcrumb 밴드 조건부 제거 / 세 chrome 표면(slate-50·card·card/85) 일원화 / chrome radius 토큰화 / **active-state 일관**(양 nav 레벨 = tinted bg + left accent bar; 현재 parent subtle·child loud solid-blue 불일치) / bottom-nav `env(safe-area-inset-bottom)` / `themeColor` 토큰화 / LIVE 배지 `pullim-anim-live-pulse` 사용(현 raw `animate-pulse`).
- 다크 토글: 헤더/프로필에 1개 진입점 배선(라이트 기본, 토큰 정리).

## 4. Chat — 2열 셸 + 3번째 컨텍스트 레일 (centerpiece)

audit: 현재 채팅 컬럼은 봇 메타 헤더+scope 시간표+teacher-watch 배너+live notice(line 270–378)가 한꺼번에 박혀 **모바일에서 실제 메시지가 한참 아래로** 밀리는 "dark UI 벽".

- **중앙 컬럼 = 메시지 + 입력기 only.** `flex-1 min-h-0` 로 셸 높이 채움(하드코딩 `max-h-520/min-h-360` 박스 제거).
- **우측 레일(desktop) = 컨텍스트**: `BotIdentityCard`(라이트 카드 + 시그니처 accent, 다크 그라데이션 대체), scope 스케줄, watched-by-teacher, live 상태. 모바일 → 1개 collapsible 헤더.
- **좌측 = 기존 사이드바**(봇/채널 레일).
- 다크 slate→blue 그라데이션 헤더 → 라이트 calm 카드. 중복 `LiveBadge` 추출, 경쟁하는 토스트 2개 → sonner 1개로 통합. `bot-header.tsx`(채팅 인라인 헤더의 중복본) → `BotIdentityCard` 로 단일화 후 삭제.
- live 모드: 4개 full-width 카드 스택 → slide+transcript(메인) / quiz+question(레일·sticky strip) 2-region.

## 5. 공유 프리미티브 (중복 제거)

신설/추출: `EmptyState` · `StatTile`/`StatRow` · `BotNote` · `AlertCard` · `BackLink`(6× 중복) · `KpiStat`(동일 함수 중복) · `FilterPills`(3 impl 통합) · `ComingSoonButton`(5파일 opacity 핵 통합 + "v2" 배지) · `LiveBadge`(4× 중복) · `BotIdentityCard` · `Sparkbar`(중복) · `ContextRail` · `TeacherPageShell` · `ScoreDisplay`(rubric/detail 불일치 reconcile).

**CUDS 벤더링**(소스 복사, `cn` 은 앱 것으로 교체):
- charts: `Donut`·`Heatmap`·`Bullet`(pure SVG, dep 0) + `Sparkline`·`Line`·`Bar`(recharts 필요) + `useChartTokens` (키스톤). 차트는 `--chart-*` 토큰 정의 필요.
- layout: `Flex`/`Stack`/`Grid` (`--space-*` 의존 — 정의 확인).
- **nav 컴포넌트는 벤더링 안 함** — 앱이 이미 소유. 패턴(active-state recipe)만 차용.

`read-state.tsx`(현존 최고 품질 빈 상태)를 전 클러스터 빈/에러/게이트 상태의 템플릿으로.

## 6. Per-cluster refine (29면)

### 6.1 student-home + discover + onboarding
- **home**: `space-y-4` 단일 컬럼 → 의도된 반응형 그리드(KPI hero band → `lg:grid-cols-2` bots/new-items → CTA). emerald raw → `pullim-success` 토큰. 빈 봇 슬롯 pad-to-5 → "추가" CTA 1개. 축하형 zero-state. 레몬 글로우 그라데이션 → `.pullim-hero-glow` 유틸.
- **discover/onboarding**: 중앙 `max-w-2xl` 리딩 컬럼. "coming soon" = anticipatory accent(disabled-grey 아님). 인라인 mock 스크린샷 → `components/classbot/` 컴포넌트 추출 + 실 mock 데이터.

### 6.2 student-assignment
- detail/result 데스크톱 `lg:grid-cols-[1fr_320px]`(primary + sticky CTA/meta 레일), list 카드 그리드(reading column ~640px cap).
- accent 축 **1 surface 1개**: group=bot 시그니처, card=state(chip/progress only) — 현재 좌측 border 2종 충돌 제거.
- 토큰 백 `assignment-state` 색맵(하드 hex 5종 제거). 빈 상태 `EmptyState` 추출. mono "debug-panel" meta grid 휴머나이즈. 문항 type enum(`mc`/`essay`) → 친화 한글 라벨.

### 6.3 student-wellness + report + replay
- `me/report`: narrative(gauge+잘한/신경) 좌측 리딩 + KPI/teacher-msg/CTA 우측 레일.
- wellness: check-in CTA hero + gauge 병치(lg), 보조 카드는 레일/quick-links.
- replay: 경쟁하는 그라데이션 hero 2개 → 1개. `Sparkbar`+`heatColor`(verbatim 중복) lib 추출. 사용자 노출 placeholder 문자열 → 배지.
- **crisis: 레몬 → danger/warn 재매핑**(레몬은 positive CTA 예약). `bg-black/40` scrim 토큰화. `window.location.href` → router.

### 6.4 teacher (home/ops/builder + assignment/grading/reports/replay)
- `TeacherPageShell`(back-link+PageHeader+py rhythm+max-width 통일).
- 기존 `[1fr_360px]` grading/report aside → **context-rail 패턴 공식화**.
- **버그 수정**: `grading-row.tsx` confidence ternary 가 양 분기 동일 클래스 반환(신호 소실) → low-confidence = warn 톤.
- 빌더 4개 divergent radio-card 그리드 → `RadioCard` 1개. 5-step form 진행도 텍스트 → 세그먼트 진행바.
- 다크 action slab(`bg-pullim-slate-900`) 완화. `ComingSoonButton` 통합. 모달 scrim 토큰 1종(`bg-pullim-slate-900/60`).
- `reports/[id]` 비-parent 시 좌측 컬럼 공백 → 본문/요약을 좌측에 항상 렌더.

### 6.5 auth (셸 외부 유지)
- **셸 미적용 명시**(향후 셸 롤아웃이 auth 를 감싸지 않도록 spec 에 carve-out).
- `Suspense fallback` 스켈레톤 AuthCard(블랭크 첫 페인트 제거, CLS 안정). `max-w-sm`→`md`. 에러 = 고정 높이 alert 영역(`role="alert"`). 비밀번호 토글 + "비밀번호 찾기"(gated). `min-h-screen`→`min-h-dvh`. 역할 픽커 selected = 색+체크/링(색 단독 금지). 공유 field/Alert 프리미티브 추출. placeholder `teacher@`→`name@pullim.com`.

## 7. Phasing — 구현 PR 분할 (리뷰 수렴 위해)

설계는 29면 전부지만 PR 은 계층별로 분할:
- **PR-1 Foundation**: globals.css 토큰 재작성 + `lib/tokens/*` 재유도 + 타입 스케일 + Pretendard 자체호스팅 + CI 게이트 2종. (시각 회귀 최소, 기반)
- **PR-2 Shell + primitives**: app-shell rightRail 슬롯, chrome 정리, 공유 프리미티브 + CUDS charts/layout 벤더링.
- **PR-3 Chat 3열**: centerpiece.
- **PR-4 Student pages**: home/discover/onboarding/assignment/wellness/report/replay.
- **PR-5 Teacher pages**: home/ops/builder/grading/reports/replay/assignment-form.
- **PR-6 Auth**.

각 PR: `bun typecheck` + `bun lint` + `bun build` + 영향 Playwright spec green. prod-verify(x-build-sha meta, baseURL env 패턴) 깨지 않음.

## 8. Out of scope

- BE/NestJS, packages/* 인터페이스, drizzle 스키마 변경.
- 다크모드 per-page QA(토큰 정리까지만; §1.5).
- i18n / Sentry 도입(금지 유지).
- 새 도메인/라우트 추가.
- `apps/classbot/CLAUDE.md` "shadcn 단독" 문구 갱신(필요 시 글로벌 작업으로 사용자 승인 후 별도).

## 9. 성공 기준

- 29면 전부 variant-B 토큰만 사용(하드 hex 0, CI 게이트 통과).
- 채팅 = 2열 셸 + 우측 컨텍스트 레일, 모바일 단일 컬럼 폴백.
- 공유 프리미티브로 중복(BackLink 6×, KpiStat, LiveBadge 4×, ComingSoonButton 5× 등) 제거.
- Korean typography 비협상 기본값 100% 충족.
- `bun typecheck/lint/build` green, prod-verify green.
