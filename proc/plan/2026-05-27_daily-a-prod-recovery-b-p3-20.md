# 2026-05-27 daily — A(production 정상화) + B(P3-20 모션 구현)

## 출처
- [daily_outcome/2026-05-27.md](../../daily_outcome/2026-05-27.md) 09:30 약속 A·B
- [proc/plan/2026-05-26_classbot-design-phase4.md](./2026-05-26_classbot-design-phase4.md) § P3-20 작업 범위

---

## A — Vercel production 정상화

### 현재 상태 (2026-05-27 정찰)
- main HEAD: `e7f165e` (어제 18:53 — plan archive 이동, **코드 변경 없음**)
- Production `x-build-sha`: `c52e1e6` (어제 우리가 vercel deploy로 올린 commit)
- e7f165e는 docs-only라 production은 functional 동일. SHA만 1 commit 뒤.
- 5/27 00:03 KST schedule prod-verify run `26482326027` → **failure** (1m35s, polling 스킵된 schedule trigger라 Playwright spec에서 fail로 추정)
- **근본 원인 미해결**: GitHub ↔ Vercel webhook 끊김 6일째 — Vercel 콘솔 직접 조작 필요 (사용자/G3 영역)

### 작업
- [ ] A-1: `vercel deploy --prod` 재실행 → production SHA = `e7f165e`
- [ ] A-2: prod-verify schedule run `26482326027` fail 로그 분석 — Playwright spec 어디서 깨졌는지
- [ ] A-3: 필요 시 V15 home 변경에 따른 spec 수정 (별도 fix)
- [ ] A-4: `gh workflow run prod-verify.yml --ref main` 즉시 trigger → success 확인

### 완료 기준
- `gh run list --branch main --workflow=prod-verify.yml` 최신 run success
- `curl ... | grep x-build-sha` = main HEAD SHA 텍스트 일치

### 비범위
- GitHub-Vercel webhook 재연결 (사용자/G3 Vercel 콘솔 영역)

---

## B — P3-20 모션 구현 (M3 호흡 + M4 blink + M9 wave bar)

### 권위
- [phase4 plan § 작업 범위](./2026-05-26_classbot-design-phase4.md)
- spec [08-design-system § 12 M3/M4/M9](../spec/08-design-system.md) 수치
- M3: scale 1.0↔1.03 + opacity 1↔0.92 / 3.2s loop / ease-in-out
- M4: eye-mask scaleY 1→0.1→1 / 140ms / 4–7s 랜덤 간격
- M9: 봇 액센트 컬러 wave bar 3px 좌→우 1회 / 320ms / easing-emphasis

### V15 충돌 검토 (홈은 5/26 V15 재구성됨)
- 홈 봇 strip: [page.tsx:230 BotChip](../../src/app/(student)/classbot/page.tsx) `h-11 w-11` 아바타 — M3 적용 (LIVE 봇만)
- chat 메인 봇 헤더: [chat/page.tsx:288](../../src/app/(student)/classbot/chat/page.tsx) — M3 + M4 (chat 항상 활성)
- chat 메시지 옆 봇 아바타: chat/page.tsx:585 — M3만 (M4는 메인 헤더에만)
- PendingBubble: chat/page.tsx:715 — M9 wave bar 컴포넌트 신규
- live-overlay, bot-header도 적용

### 작업
- [ ] B-1: `src/app/globals.css` keyframes 3종 + utility class + `@media (prefers-reduced-motion: reduce)` fallback
  - `@keyframes pullim-bot-breath` / `.pullim-anim-bot-breath`
  - `@keyframes pullim-bot-blink` / `.pullim-anim-bot-blink` (animation-delay로 봇별 4–7s 랜덤 — JS 또는 CSS calc)
  - `@keyframes pullim-wave-bar` / `.pullim-anim-wave-bar`
- [ ] B-2: 컴포넌트 적용
  - [components/classbot/bot-header.tsx](../../src/components/classbot/bot-header.tsx) — M3 (LIVE 분기)
  - [chat/page.tsx](../../src/app/(student)/classbot/chat/page.tsx) line 288 — M3 + M4
  - chat/page.tsx line 585 — M3
  - chat/page.tsx PendingBubble (line 715) — M9 wave bar 신규 div
  - [classbot/page.tsx](../../src/app/(student)/classbot/page.tsx) BotChip (line 230) — M3 (LIVE 분기)
  - [components/classbot/live-overlay.tsx](../../src/components/classbot/live-overlay.tsx) 봇 표시 — M3 (LIVE 활성)
- [ ] B-3: `bun x tsc --noEmit` + `bun run build`
- [ ] B-4: 수동 검증 `bun dev` + DevTools 모바일 375×667
- [ ] B-5: `prefers-reduced-motion: reduce` 정적 정지 확인
- [ ] B-6: PR 생성 + main 머지

### 비범위
- 모바일 키보드 열림 시 M3 정지 — 후속 issue (P0-1 visualViewport hook 활용 별건)
- 봇별 M3 동기화 vs 비동기 — 단순화 위해 CSS animation 동일 시작점 (시각적 통일감)

### 결정 (G4 사전 합의 전 잠정)
- M3 적용 범위: **chat 메인 봇은 항상 활성, 그 외(홈 BotChip / live-overlay)는 LIVE 봇만**
- 근거: phase4 plan에 SPEC 충실 명시
- PR review에서 G4 검토

---

## 작업 순서
1. A-1: vercel deploy 즉시 (~3분)
2. A-2: schedule fail 로그 분석 (병렬, ~5분)
3. B-1: globals.css keyframes (~10분)
4. B-2: 컴포넌트 적용 (~20분)
5. B-3: tsc + build (~3분)
6. B-6: PR 생성
7. A-4: prod-verify workflow_dispatch trigger + success 확인
8. daily_outcome 17:30 보고 update

## 후속 (오늘 외)
- GitHub-Vercel webhook 재연결 (사용자 영역)
- Phase 4 P3-21 / P3-19 / P3-18 / P3-22 후속 우선순위 합의 (G1)
