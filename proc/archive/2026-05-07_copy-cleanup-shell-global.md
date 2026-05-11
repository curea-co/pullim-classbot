# 2026-05-07 카피 정리 — 공유 shell (글로벌)

> **상태**: 🟢 완료 (2026-05-07)
> **명세 권위**: [07-branding.md § 5.2](../spec/07-branding.md) (학술 기호 매핑)
> **부모 plan**: [2026-05-06_copy-cleanup-jargon-and-hanja.md](../archive/2026-05-06_copy-cleanup-jargon-and-hanja.md)
> **분류**: **글로벌 작업** (`components/shell/*` 편집 = 6 도메인 전체 영향)

## 목표

공유 shell의 학술 기호 노출 1건 정리. shell은 모든 도메인 영향이라 신중히.

## 작업 항목

### Step 1: 회귀 사례 처리

학생 UI 노출 1건:

- [x] **`src/components/shell/nav-config.ts:63`**
  - 변경 전: `{ href: '/q/analysis/ability', label: '능력치', icon: Activity, description: 'IRT θ · 단원 마스터리 · 처방' }`
  - 변경 후: `description: '실력 점수 · 단원 정복도 · 처방'`
  - 영향: `app-sidebar.tsx`의 SubNavRow `title=` 속성 (hover 툴팁) — line 266

비노출 1건 (편집 안 함):

- [x] **`src/components/shell/flywheel-note.tsx:9`** (JSDoc 코멘트)
  - 현재: `* 오늘 풀이한 문제는 <strong>풀림 인덱스</strong>의 IRT θ를 갱신해요.`
  - JSDoc 코멘트라 학생 UI 노출 X — **편집 안 함** 확인 완료.

### Step 2: 영향 범위 확인 — 글로벌 작업이므로 신중

- [x] `nav-config.ts`의 `description` 필드가 실제로 노출되는 컴포넌트 추적:
  - **`app-sidebar.tsx:200`** — 최상위 NavItem `title=` (hover native tooltip, non-compact)
  - **`app-sidebar.tsx:266`** — NavSubItem `title=` (hover native tooltip, non-compact) ← 이번 변경 노출 사이트
  - `mobile-drawer.tsx`, `bottom-nav.tsx` — `description` 미참조 (노출 X)
- [x] 표시 위치 캡처 (production build, Chrome headless): [`output/live-shots/2026-05-07_shell-analysis-after.png`](../../output/live-shots/2026-05-07_shell-analysis-after.png) — `/q/analysis/ability` sidebar 정상 렌더. `analysisSection` sub-sub-items는 현재 shell sidebar 레이아웃에서 미노출이므로 native tooltip surface는 잠재 (소스 변경은 `nav-config.ts:63` 정합 + `app-sidebar.tsx:266` `title={compact ? sub.label : sub.description}` 렌더 경로 확인)

### Step 3: 검증

- [x] **§ 6.5 1차 검수**: "실력 점수 · 단원 정복도 · 처방" — 한자어 0건, 학술 기호 0건, 한 번 읽고 의미 잡힘
- [x] `pnpm exec tsc --noEmit` 통과
- [~] 라이브 검증 (2026-05-07): `/q/analysis`, `/q/analysis/ability` 사이드바 DOM dump 결과 — 현재 shell sidebar 레이아웃은 **`analysisSection` sub-sub-items를 렌더하지 않음** (3rd-level nav 미노출). 변경된 `description`은 `app-sidebar.tsx:266` `<Link title=...>` 경로로 들어가지만 surface가 조건부 (sub-item이 sidebar에 보일 때만 native tooltip). 소스 변경 자체는 정합 (`grep` 결과 `IRT θ` 0건, `'실력 점수 · 단원 정복도 · 처방'` 노출 가능). **잠재 노출 surface 추가 audit은 별도 plan 후보** (예: 추후 secondary nav 추가 시).
- [x] 모든 도메인에서 nav 정상 동작 (sanity check) — 13+ 라우트 (`/teacher/quiz`, `/classbot`, `/classbot/chat`, `/library/visual/*`, `/library/storage`, `/planner`, `/planner/onboarding`, `/planner/reports`, `/planner/calendar`, 8 onboarding 페이지) 모두 정상 진입, sidebar 정상 렌더
- [x] 콘솔 에러 0건 — 13+ 라우트 sweep 결과 본 PR 변경 관련 신규 에러 0건 (사전 존재 Clock24 hydration 제외)

### Step 4: 명세 갱신

- [x] [07-branding.md § 5.2](../spec/07-branding.md) "회귀 점검 대상" 표에 shell 처리 추가 — [`spec-regression-closing` plan](2026-05-07_spec-regression-closing.md)에서 신규 헤딩 "회귀 점검 대상 (2026-05-07 시점)" shell 1건 처리 완료
- [x] [03-features-and-ia.md](../spec/03-features-and-ia.md) — nav-config 메타 변경 IA 정합 확인 완료. IA 문서는 architects 언어 (θ, IRT, 능력치)를 internal terminology로 유지 — student-facing UI 카피 (`description` 필드)와 audience 분리. nav-config의 description 변경은 IA 권위에 영향 없음. **편집 불필요.**

## 글로벌 작업 주의사항 (CLAUDE.md)

- shell 편집은 6 도메인 전체 영향. PR 생성 전 **사용자 명시 확인** 필요.
- nav-config 메타 변경은 도메인 boundary를 흔들지 않으면 OK (라우트나 childSlugs 안 건드리니 안전).
- 글로벌 작업이라 `pnpm dev` 라이브에서 모든 도메인 sanity check 권장.

## 범위 외

- Q·플래너·라이브러리·클래스봇 도메인 카피 — 별도 plan
- nav-config의 라우트/childSlugs/label 변경 — IA 작업이라 별도 plan 필요 시
- JSDoc 코멘트 정리 (비노출이라 카피 정책 외)

## 비고

- 단일 라인 변경이지만 글로벌 영향이라 검증 비용이 높음 — 한 PR로 박고 도메인별 sanity check 동봉.
- 커밋 메시지: `fix(shell): nav-config description theta → 실력 점수 per 07 § 5.2`
