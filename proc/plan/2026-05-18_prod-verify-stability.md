# 2026-05-18 — prod-verify 5/16 flake mitigation

## 목표
2026-05-16 03:54 KST(UTC 5/15 23:54) schedule run에서 단발성 실패한 [mobile-and-focus.spec.ts:56](../../tests/e2e/mobile-and-focus.spec.ts) 의 `toBeFocused` 어설션을 보강하여, 동일 SHA 자동 재실행으로 green 되는 패턴(flake)을 제거한다.

출처: [daily_outcome/2026-05-18.md](../../daily_outcome/2026-05-18.md) C 항목 분기 — daily_outcome 본 plan A·B와 함께 [proc/plan/2026-05-18_slider-live-and-cb005-and-prod-verify.md](2026-05-18_slider-live-and-cb005-and-prod-verify.md) 의 C 섹션을 분기 처리하는 후속 plan.

## 배경

### 사건 타임라인
| KST | event | conclusion | run | SHA |
|---|---|---|---|---|
| 2026-05-16 08:54 | schedule | **failure** | [25946983757](https://github.com/curea-co/pullim-classbot/actions/runs/25946983757) | 9e81cd2 |
| 2026-05-17 08:52 | schedule | success | [25976214013](https://github.com/curea-co/pullim-classbot/actions/runs/25976214013) | 9e81cd2 (동일) |
| 2026-05-18 08:56 | schedule | success | [26006452463](https://github.com/curea-co/pullim-classbot/actions/runs/26006452463) | 9e81cd2 (동일) |

코드 변경 0건. 같은 SHA에서 자동 재실행만으로 green → **flake**. stale build 아님, 실제 회귀 아님.

### 실패 케이스
- spec: [tests/e2e/mobile-and-focus.spec.ts:56](../../tests/e2e/mobile-and-focus.spec.ts) — `키보드 Tab 포커스 가시성 / 과제 발사 폼 — 제목 input Tab 진입 시 focus-visible 활성`
- 어설션: `await titleInput.focus(); await expect(titleInput).toBeFocused();`
- timeout 5000ms, locator는 9회 resolve(즉 element는 존재) 했으나 focus 상태가 inactive로 잡혀 실패
- 추정 원인: production CDN 응답 + hydration 타이밍 레이스 — `goto` 직후 `focus()` 호출 시점에 React가 아직 input의 onFocus 핸들러를 attach 못한 상태에서 focus event가 사라짐

### 1건 실패 = 31/32 (96.9%) → 누적 시 신뢰도 침식
3일에 1번씩 모르고 fail이 떨어지는 schedule run은 17:30 보고 노이즈를 늘림. flake 제거 비용은 낮으니 지금 처리.

## 작업 항목

### A. mobile-and-focus.spec.ts:56 보강
- [x] `goto` 옵션에 `waitUntil: 'networkidle'` 명시 — 기본 `load` 보다 hydration 완료에 더 가깝게 대기
- [x] `focus()` 이전에 `await expect(titleInput).toBeVisible()` 게이트 — 엘리먼트가 실제로 interactive 가능 상태가 될 때까지 대기
- [x] `toBeFocused` timeout 10초로 확장 — CDN 응답 지터 흡수

### B. 다른 toBeFocused 패턴 점검
- [x] [tests/e2e/mobile-and-focus.spec.ts](../../tests/e2e/mobile-and-focus.spec.ts) 내 `toBeFocused` 사용처는 line 60 1건만 — 추가 위험 없음. grep으로 검증 완료.

### C. 회귀 모니터링
- [ ] 본 PR 머지 + prod-verify schedule 1회(2026-05-19 08:56 KST 예정) green 확인
- [ ] 1주 추적: 2026-05-19~25 7일 schedule run 모두 green이면 flake 제거 확정. fail 1건이라도 추가되면 mitigation 부족 → 후속 plan

## 검증
- `bun x tsc --noEmit` clean
- `bun run build` 16 라우트 정상
- mitigation 적용 후 같은 spec이 schedule/dispatch에서 5회 연속 green이면 마감
