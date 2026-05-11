# 2026-05-07 버튼 어포던스 회귀 정리 (풀림 클래스봇)

> **상태**: 🟢 완료 (2026-05-07, 라이브 검증 통과 — 1건 회귀 fix)
> **명세 권위**: [08-design-system.md § 7.3](../spec/08-design-system.md)
> **부모 plan**: [2026-05-06_button-affordance-q-domain.md](2026-05-06_button-affordance-q-domain.md)
> **분류**: **풀림 클래스봇 도메인 락인 작업** (학생/교사 공용)

## 목표

§ 7.3 위반 사례를 클래스봇 도메인(학생/교사)에서 발견 + 처리. 1차 grep에서는 대부분 정당한 태그·뱃지 사용으로 보이지만 일부 액션 후보가 있음 — **검증 단계 + 발견 시 처리**가 본 plan의 핵심.

## 작업 항목

### Step 1: 회귀 후보 검증

1차 grep 결과 후보:

- [x] **`src/app/(teacher)/teacher/quiz/page.tsx:85`** — 퀴즈 페이지 액션 (회귀 확정)
  - 검증: `<button type="button">`로 quizDrafts 추천 토픽을 클릭해 새 퀴즈 드래프트를 생성하는 **액션**. 형제 primary CTA(line 41 `새 퀴즈`, line 68 `생성`)가 `rounded-lg/xl + text-sm + px-4 py-2`로 동일 위계의 액션. 작은 알약 모양은 § 7.3.2 금지 패턴.
  - 처리: `rounded-lg px-4 py-2.5 text-sm`로 변경 완료.
- [x] **`src/components/builder/step-content.tsx:532`** — `<input>` 필드 (제외 확정)
  - 검증: `<input value={testInput} ...>` 텍스트 입력 필드. § 7.3은 **클릭 가능 요소**(button/link)에 한정. § 13 폼/인풋 별도 컨벤션. **제외**.

다음은 **태그·뱃지로 정당한 사용** 추정 — 처리 X:
- `app/(teacher)/teacher/page.tsx:144` — `h-7 w-7 rounded-full text-xs font-bold text-white` 카운터/번호 뱃지
- `components/classbot/replay-review.tsx:103, 111, 118` — 상태 라벨 (오답/정답 표시)
- `components/classbot/live-quiz-card.tsx:40` — 모노 폰트 카운터

### Step 2: 추가 grep (전수)

- [x] `grep -rn "rounded-full" "src/app/(student)/classbot/" "src/app/(teacher)/" "src/components/classbot/" "src/components/builder/" --include="*.tsx"` 결과를 한 번 더 훑어 액션 누락 확인
  - 추가 후보 검토:
    - `classbot/chat/page.tsx:169` — `classbotQuickPrompts` 빠른 질문 칩. 다중 선택형 chip 패턴(여러 개 횡렬, 클릭 시 즉시 전송) — 표준 chip UX. § 7.3.2의 "태그/뱃지/칩" 카테고리. **제외**.
    - `teacher/templates/page.tsx:98` — 카테고리 필터 (`aria-pressed`, all/bot/lesson/quiz). 세그먼티드 필터 칩 패턴. **제외**.
    - `teacher/settings/page.tsx:252, 461` — 태그 리스트 인라인 "+ 추가" 버튼. 형제 태그(`<span>`)와 동일 시각으로 **태그 리스트의 add affordance**(Material chip-add 패턴). 단일 액션이 아니라 리스트 메타 작업이므로 borderline이지만 plan 후보 외 + 형제 태그와 시각 parity 의도 확인. **제외 (메모만)**.
    - 그 외 모든 `rounded-full` 출현은 카운터 뱃지·상태 라벨·프로그레스 바·토글 thumb·아바타 — 정당한 사용.

### Step 3: 처리 표

| 위치 | 분류 | 처리 |
|---|---|---|
| `teacher/quiz/page.tsx:85` | 액션 회귀 (오답 클러스터 추천 버튼) | **fix**: `rounded-full px-3 py-1.5 text-[11px]` → `rounded-lg px-4 py-2.5 text-sm` (그 외 `bg-white/15 hover:bg-white/25 inline-flex items-center gap-1.5 font-semibold transition-colors` 보존) |
| `builder/step-content.tsx:532` | `<input>` 필드 | **제외** — § 7.3은 클릭 가능 요소 한정 |
| `classbot/chat/page.tsx:169` | quick-prompt chip (다중 횡렬) | **제외** — chip UX 표준 |
| `teacher/templates/page.tsx:98` | 세그먼티드 필터 (`aria-pressed`) | **제외** — 필터 칩 패턴 |
| `teacher/settings/page.tsx:252, 461` | 태그 리스트 인라인 "+ 추가" | **제외** — 형제 태그와 시각 parity 의도 |

### Step 4: 검증

- [x] `pnpm exec tsc --noEmit` 통과
- [x] 라이브 검증 (2026-05-07): `/teacher/quiz` 추천 행 3 버튼 모두 `rounded-lg px-4 py-2.5 text-sm` DOM 확인. `/classbot`, `/classbot/chat` sanity OK (chip group 정당 — siblings 3, `flex flex-wrap gap-1.5`)
- [x] after 캡처 (production build, Chrome headless): [`output/live-shots/2026-05-07_classbot_teacher-quiz_after.png`](../../output/live-shots/2026-05-07_classbot_teacher-quiz_after.png) — 추천 행 3 버튼이 `rounded-lg` 사각 버튼으로 명확히 보임 (극값 판정/변곡점 vs 극값 구분/미분 표기법 매칭). before는 git이 아니라 rollback 불가 — DOM evaluate로 className 직접 비교가 추가 증거 (`hasRoundedLg: true`, `hasTextSm: true`, `hasRoundedFull: false`).
- [x] 콘솔 에러 0건 (`/teacher/quiz`, `/classbot`, `/classbot/chat` 모두 errors=0)

### Step 5: 결과 분기

- [N/A] 회귀 0건이면: plan을 archive로 이동, "검증 완료 — 회귀 없음" 표기 — **회귀 1건 발견 (해당 분기 미적용)**
- [x] 회귀 N건이면: 처리 + 명세 § 7.3.5 갱신 — **회귀 1건 (`teacher/quiz/page.tsx:85`) 처리 완료**. § 7.3.5 갱신은 [`spec-regression-closing` plan](2026-05-07_spec-regression-closing.md)에서 처리 완료 (2026-05-07).

## 락인 규칙

편집 OK: `app/(student)/classbot/*`, `app/(teacher)/*`, `components/classbot/*`, `components/builder/*`
편집 금지: 다른 도메인

## 범위 외

- 풀림 Q (이미 처리), 라이브러리·플래너·shell — 별도 plan
- 클래스봇은 학생/교사 양쪽 영향이라 변경 시 두 페르소나 모두 검증

## 비고

- input 필드의 `rounded-full`은 § 7.3 대상 아님 (액션 어포던스 규칙은 클릭 가능 요소에 한정).
- 커밋 메시지: `fix(classbot): action affordance per 08 § 7.3.3` (회귀 발견 시)
