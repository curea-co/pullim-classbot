# 클래스봇 디자인 시스템 정비 — Phase 4 (P3-18~P3-22) 착수 plan

## 목표

[2026-05-19 design-system-overhaul plan](./2026-05-19_classbot-design-system-overhaul.md) Phase 4 (P3 5개 항목) 중 우선순위 1개를 결정하고 별도 PR로 머지. Phase 1~3 (P0~P2 17개)이 5/22 PR #77까지 모두 완료된 상태에서 마지막 phase 착수.

권위 SPEC:
- [08-design-system.md § 12 (모션 카탈로그 M1~M10)](../spec/08-design-system.md#L628-L635)
- [04-ux-flow.md § 9 (온보딩)](../spec/04-ux-flow.md)
- [13-reports-and-emotion-checkin.md § 9 (웰빙)](../spec/13-reports-and-emotion-checkin.md)

## 현재 상태

- Phase 3 마감: 2026-05-22 — PR #75(P2-15) + PR #77(P2-16+P2-17) main 머지 ✅
- 남은 작업: Phase 4 P3-18 ~ P3-22 5개 (모두 미착수)
- prod-verify 5/19 이후 stale (Vercel deploy 자체 정지) — 별도 트랙으로 분리, 본 phase 진행과 독립

---

## 후보 비교 (5개 → 1개 추천)

| 항목 | 임팩트 | 복잡도 | 외부 의존 | 작업 범위 | 추천 순위 |
|---|---|---|---|---|---|
| **P3-18** 리플레이 16:9 자동 캡처 썸네일 | 중 (리플레이 발견성) | 중상 (frame capture 메커니즘) | 없음 (정적 mock 가능) | replay 페이지 카드 + 캡처 hook | 3 |
| **P3-19** 온보딩 (학생 시선 카피 + 인터랙티브 데모 + sticky 진척 바 + 끝 CTA) | 상 (첫 진입 경험) | 상 (4 sub-feature) | 없음 | `/classbot/onboarding` 단일 페이지 리워크 | 2 |
| **P3-20** 봇 idle 호흡(M3) + blink(M4) + 응답 wave bar(M9) | 상 (봇 등장 화면 전반) | **중** (CSS animation 3종) | **없음** | chat/live/홈 봇 표시 컴포넌트 + globals.css 토큰 | **1** ⭐ |
| **P3-21** 풀림 자체 무드 이모지 셋 (5단계 face 일러스트) | 중 (브랜드 정체성) | 상 (일러스트 자산 5종) | **있음 (디자이너)** | wellness check-in + 봇 반응 자산 교체 | 5 |
| **P3-22** 시청자 라이브 카운터 spring micro-animation | 미세 | 저 | 없음 (P1-10 흡수 가능) | live-overlay 카운터 1곳 | 4 (별도 PR 불필요 가능성) |

---

## 추천: P3-20 (봇 idle 호흡 M3 + blink M4 + 응답 wave bar M9)

### 선정 근거

1. **외부 의존 0** — 일러스트(P3-21)·디자이너 자산 불필요. CSS keyframes + Tailwind 토큰만으로 닫힘.
2. **광범위 ROI** — 봇이 등장하는 거의 모든 화면(chat·live·assignment·홈)에 적용되는 모션 → 단일 PR로 클래스봇 전체 "생동감" 인상 변경.
3. **기반 재사용** — Phase 1 P0-5에서 이미 M1·M2·M5 모션 + `prefers-reduced-motion: reduce` fallback 패턴이 globals.css에 도입됨. 동일 패턴 확장만 필요.
4. **작업 단위 작음** — CSS animation 3종 (`@keyframes m3-breath`, `m4-blink`, `m9-wave-bar`) + 적용 컴포넌트 식별 + LIVE 상태 분기.
5. **SPEC 명확** — [08 § 12 M3/M4/M9](../spec/08-design-system.md#L628-L635)에 정확한 수치 정의되어 있음 (M3 scale 1.0↔1.03 + opacity 1↔0.92 / 3.2s loop / ease-in-out, M4 eye-mask scaleY 1→0.1→1 / 140ms / 4–7s 랜덤 간격, M9 봇 액센트 컬러 wave bar 3px 좌→우 1회 / 320ms / easing-emphasis).

### 작업 범위 (예상 변경 파일)

- [ ] `src/app/globals.css` — `@keyframes m3-breath`, `m4-blink`, `m9-wave-bar` 추가 + `prefers-reduced-motion: reduce` 정적 정지 분기
- [ ] `src/components/classbot/bot-header.tsx` — 봇 아바타에 M3 idle 호흡 적용 (LIVE 봇만, 대기 봇은 정적)
- [ ] `src/app/(student)/classbot/chat/page.tsx` 봇 아바타 렌더 영역 — M3 + M4 적용 (chat은 항상 활성 상태이므로 LIVE 게이트 불필요)
- [ ] `src/app/(student)/classbot/chat/page.tsx` `PendingBubble` 또는 봇 응답 직전 영역 — M9 wave bar 컴포넌트 신규 + 봇 시그니처 컬러 (`--bot-*` 토큰) 사용
- [ ] `src/components/classbot/live-overlay.tsx` 봇 표시 영역 — M3 (LIVE 상태 → 활성)
- [ ] `src/app/(student)/classbot/page.tsx` 봇 카드 그리드 — LIVE 상태 봇만 M3 (M5 LIVE 펄스와 같이 작동)

### 비범위 (의도적 제외)

- 모바일 키보드 열림 시 M3 정지 분기 — P0-1 visualViewport hook 결과 활용 가능하나, 첫 PR에서는 단순화. 후속 issue로 분리.
- LIVE 봇 식별 정책 — `bot.live === true` mock 필드를 가정. mock 미정의 시 mock 추가는 본 PR 범위.

---

## 완료 기준 (DoD)

- [ ] `bun x tsc --noEmit` 통과
- [ ] `bun run build` 통과 (정적 30 라우트 유지)
- [ ] `tests/e2e/chat-scroll-and-input.spec.ts` 통과
- [ ] `tests/e2e/student-live-and-flows.spec.ts` 통과
- [ ] 수동 검증 — `bun dev` + Chrome DevTools 모바일 375×667:
  - chat 봇 아바타 호흡 (3.2s loop) 가시 / 비-LIVE 화면 봇 정적
  - blink 4–7s 랜덤 간격 동작
  - 메시지 전송 후 응답 시작 직전 wave bar 1회 (320ms) 동작 + 봇 시그니처 컬러 일치
  - LIVE 페이지 봇 아바타 M3 활성
  - DevTools "Emulate CSS prefers-reduced-motion: reduce" → 모두 정적 정지
- [ ] `proc/plan/2026-05-19_classbot-design-system-overhaul.md` Phase 4 P3-20 체크박스 [x] 업데이트

---

## 게이트키퍼 확인 필요

- **G4 (FE)** | P3-20 모션 정책 — LIVE 봇만 M3 적용 vs 모든 봇 M3 적용 결정. SPEC § 12은 "LIVE 봇만, 대기 봇은 정적"로 명시되어 있어 SPEC 충실 진행 의도이나, chat 화면(항상 활성)에서 LIVE 게이트가 직관적인지 합의 필요.
- **G1 (대표)** | Phase 4 후속 우선순위 — P3-20 머지 후 다음 픽 (P3-19 vs P3-18) 사전 합의. P3-22는 P1-10에 흡수 처리(별도 PR 불필요)로 처리 의향 확인.

---

## 검증 환경

- `bun dev` → http://localhost:3030/classbot
- Chrome DevTools 모바일 시뮬레이션: 375×667 / 390×844
- DevTools "Rendering" 패널 → "Emulate CSS prefers-reduced-motion: reduce"
- Playwright e2e: `tests/e2e/chat-scroll-and-input.spec.ts`, `tests/e2e/student-live-and-flows.spec.ts`

---

## 사후 메모 (2026-05-26 18:30)

P3-20 착수 전 **production 배포 정상화 선행 필요**:
- production이 commit `#68 (44bc5a09)` 이후 11일째 Vercel deploy 안 됨 (`x-build-sha` meta stuck). main HEAD가 `f6372d2`인데도 production은 11일 전 SHA 그대로.
- 그 사이 머지된 11개 PR(#69~#77 + 본일 commits)이 모두 production 미반영.
- prod-verify workflow의 SHA polling timeout 메시지는 [PR #78](https://github.com/curea-co/pullim-classbot/pull/78)에서 진단 가능하게 개선.
- **사용자/G3 영역**: Vercel 콘솔 Deployments 점검 → 빌드 실패/paused 해소 → prod-verify rerun으로 main HEAD 반영 확인.
- 그 후 G4 모션 정책 합의(LIVE 봇만 M3 vs 전체 봇 M3) 진행 가능.
