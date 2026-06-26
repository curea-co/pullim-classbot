# Classbot 웰빙 깊이 — 가벼운 모드 (Light Day) Design Spec

> Phase 1 / 웰빙 깊이 첫 스펙. 브레인스토밍 합의안(2026-06-26).

## 1. 목표 (Goal)

웰빙을 "기분 트래커" → "**돌봄 루프**"로 깊이 있게: 컨디션이 낮은 날 학생이 **가벼운 모드**를 선택하면
홈의 "오늘 할 일 / 오늘의 한 가지"가 실제로 가벼워진다(핵심 1개 + 나머지 접기 + 부드러운 카피).
"선생님이 만든 교실이 내 컨디션까지 본다" = 교사 주도 제품의 차별화.

## 2. 핵심 결정 (브레인스토밍 확정)

- **opt-in 제안.** 자동으로 학습을 바꾸지 않는다 — 저조 신호 시 넛지 + 버튼으로 학생이 선택.
- **교사 과제는 숨기지 않고 접기만.** class 모드에서 가장 급한 1개만 강조, 나머지는 접어두되 펼치기 가능.
- **그날 하루 opt-in 유지, 다음 날 자동 해제.** 날짜 키 persist.
- **트리거 = 저조 신호.** 오늘 score<60 OR flag OR 오늘 체크인 mood≥3 (둘 중 하나).
- **class + self 둘 다** 지원.

## 3. 성공 기준

- 저조 신호가 있는 날 홈 상단에 가벼운 모드 넛지가 뜬다.
- [가볍게 가기] → 오늘 할 일이 핵심 1개 + 나머지 접힘으로 바뀌고, [평소대로 보기]로 되돌릴 수 있다.
- 다음 날 다시 열면 가벼운 모드는 꺼져 있다(날짜 키).
- 저조 신호가 없으면 넛지가 뜨지 않는다. 기존 prod-verify e2e green.

## 4. 제약 (Constraints)

- mock 구동. 기존 웰빙 데이터(`WellbeingSnapshot.score/flag/components`, 체크인 `mood: 1..4`) 재사용.
- `components/**` hex 금지(토큰만), `text-[Npx]` 금지, 44px 터치, focus-visible, **학생 라우트 green/amber 금지**(넛지는 blue/slate/lemon).
- persist 스토어 → hydration 게이트(#144 `useStoresHydrated`)로 넛지/라이트 상태 플래시 방지.
- 가벼운 모드는 **렌더만 바꾼다** — 과제 데이터/완료 상태를 변형하지 않는다(접기/우선순위만).

## 5. 신호 & 상태 (데이터)

**저조 신호 (순수):**
```ts
// score<60 || !!flag || (mood!=null && mood>=3)
isLowConditionDay(input: { score: number; flag?: string | null; mood: EmotionMood | null }): boolean
```
- `useLowConditionToday(studentId): boolean` — 오늘 snapshot(getWellbeingTrend 마지막) + 오늘 체크인 mood(daysAgo 0)를 모아 `isLowConditionDay` 호출.

**가벼운 모드 상태:**
- `lib/store/light-day.ts` (persist `pullim-light-day`) — `{ enabledDate: string | null }` + `enable(today)` / `disable()`.
- selector `useLightDayOn(today: string): boolean` (= enabledDate===today), `useLightDayActions()`.
- 날짜 비교라 다음 날 자동 off. `today`는 호출부에서 `new Date()...`(app code 허용)로 주입(테스트 결정성).

## 6. 유닛 / 컴포넌트

| 유닛 | 책임 | PR |
|---|---|---|
| `lib/mock/classbot-light-day.ts` (신규) | `isLowConditionDay`(순수) + `useLowConditionToday`(hook) | A |
| `lib/store/light-day.ts` (신규) | persist 상태 + enable/disable + selectors | A |
| `components/classbot/home/light-day-nudge.tsx` (신규) | 저조 신호 넛지 배너 + [가볍게 가기]. props `{ onEnable }` | A |
| `components/classbot/home/todo-panel.tsx` (수정) | `light?: boolean` — true면 핵심 1개 + 나머지 접기(펼치기) + [평소대로 보기] | B |
| `app/(student)/classbot/page.tsx` (수정, class) | 넛지/라이트 상태 배선 — 저조&!on → 넛지, on → TodoPanel light | B |
| `components/classbot/self-home-placeholder.tsx` (수정, self) | 넛지 배선 — on이면 오늘의 한 가지 + 부드러운 카피 + [평소대로] | B |

## 7. 데이터 흐름

```
WellbeingSnapshot(score/flag) + 오늘 체크인 mood
        │  isLowConditionDay → low?
        ▼
홈: low && !lightOn → LightDayNudge ──[가볍게 가기]──▶ lightDay.enable(today)
                                                          │
                                                          ▼
        lightOn → TodoPanel(light): 핵심 1개 + 나머지 접기 ──[평소대로 보기]──▶ disable()
        (다음 날: enabledDate≠today → 자동 off)
```

## 8. UX / 디자인

- **LightDayNudge**: 차분한 배너(blue/slate, 또는 lemon 곁들임 — amber/green 금지) — "오늘 컨디션이 무거워 보여요. 가볍게 갈까요?" + [가볍게 가기]. 44px·focus-visible·토큰.
- **TodoPanel light**: 핵심 1개(가장 급한 incomplete — 오늘>D-1>그외) 크게 + "나머지 N개 · 펼치기"(클릭 시 전체) + 부드러운 카피 + [평소대로 보기]. 과제 데이터 불변(렌더만).
- **self 오늘의 한 가지**: 그대로 1개 + 부드러운 카피 + [평소대로 보기].
- **hydration**: 라이트 상태/넛지는 `useStoresHydrated`(light-day store) 후에만 렌더 — 플래시/SSR 불일치 방지. (홈은 이미 `useStudentMode().hydrated` 게이트)

## 9. 테스트

- `isLowConditionDay`: score 경계(<60/≥60) / flag / mood(≥3, <3, null) 조합 (순수 단위).
- light-day store: enable/disable, 날짜 경계(어제 enabledDate → 오늘 off) (단위).
- `LightDayNudge`: 렌더 + [가볍게 가기] → onEnable 호출 (RTL).
- (B) TodoPanel light: 핵심 1개만 + 펼치기 + [평소대로] → 콜백 (RTL).
- UI: Playwright walkthrough(저조 신호 시 넛지 → 가볍게 → 1개 → 평소대로).

## 10. 검증

typecheck · lint+design-gates(0 error) · jest · build(CI). Playwright: 저조 신호 홈 → 넛지 → [가볍게 가기] → 오늘 할 일 1개+접힘 → [평소대로 보기] 복귀.

## 11. PR 계획 (단위-PR 규칙)

- **PR-A (foundation):** `isLowConditionDay`+`useLowConditionToday`, light-day 스토어, `LightDayNudge` 컴포넌트 + 단위/RTL 테스트. (UI 배선 없음 → diff 작고 리뷰 수렴 쉬움)
- **PR-B (wiring):** TodoPanel light 모드 + class/self 홈 배선 + (가능 시) Playwright.

## 12. 범위 밖 (후속)

난이도 자동 하향(문항 난이도), 교사 알림(care loop 양면), 스트릭 보호, 크로스-기기 동기화.
