# 클래스봇 디자인 시스템 정비 — 22개 항목 (P0~P3)

## 목표

`input/design-system/private-classbot.md` 22개 항목(P0~P3)을 Phase 단위로 클래스봇 도메인에 반영. P0(Critical) 5개 + 브레드크럼 dedupe 우선 완료, Phase 2~4는 별도 PR로 분할.

권위 SPEC:
- [08-design-system.md § 1.2.1·3.5·4.1·5.1·10·12·15](../spec/08-design-system.md)
- [07-branding.md § 4.6·4.10·5.3](../spec/07-branding.md)
- [04-ux-flow.md § 9](../spec/04-ux-flow.md)
- [13-reports-and-emotion-checkin.md § 3.3·9](../spec/13-reports-and-emotion-checkin.md)

## 현재 작업 컨텍스트

- 브랜치: `main` (미커밋 변경 다수 — 라이브 라이프사이클 후속 리팩터: `live-overlay.tsx` 신규 + `live-session-panel.tsx` 삭제 + 9개 chat/bot 컴포넌트 수정). P0 변경은 이 위에 추가.
- 사용자가 git 상태 관리 (별도 브랜치 분리 또는 함께 commit 등) — 본 plan은 코드만 수정.

---

## Phase 1 — P0 Critical (지금 진행 중)

### 공통 준비

- [x] `src/app/globals.css` — 통합 시스템 v0.1 토큰 추가
  - `--focus-ring`, `--focus-ring-danger`
  - `--duration-fast/base/slow`, `--easing-standard/emphasis`
  - 봇 시그니처 컬러 5종 CSS 변수 (`--bot-math`, `--bot-english`, `--bot-science`, `--bot-korean`, `--bot-social`)
- [x] `src/components/shell/breadcrumb.tsx` — 인접 라벨 중복 자동 dedupe

### P0-1: 모바일 키보드 입력바 sticky (visualViewport)

- [x] `src/lib/hooks/useVisualViewport.ts` 신규 — 키보드 offset 계산 hook
- [x] `src/app/(student)/classbot/chat/page.tsx` 입력 form 영역에 적용
- [x] iOS Safari 375×667 / Android 390×844 시뮬레이션 검증 (입력바·전송·빠른칩 모두 가시)

### P0-2: 봇 메타 카드 collapse (56px / 180px toggle)

- [x] `src/app/(student)/classbot/chat/page.tsx` 헤더 (현재 lines 180-251)에 `useState<boolean>` 펼침 상태 + `⌃` 토글
- [x] 스크롤 시 자동 collapse (메시지 스크롤 영역의 onScroll에서 트리거)
- [x] `src/components/classbot/bot-header.tsx` 동일 패턴 적용 (다른 페이지에서 쓰는 경우)
- [x] 모바일 키보드 열림 시 자동 collapse (P0-1 hook 결과 활용)

### P0-3: Scope/Tier 카피 정리 + 풋터 노출 제거

- [x] `src/app/(student)/classbot/chat/page.tsx`:
  - line 207-209 `<span className="font-mono">{scope.short}</span>` + label → 한글 우선 + 괄호 코드
  - line 214 `{bot.tone} 톤 · T2` → `{bot.tone} 톤` (T2 제거)
  - line 336 풋터 `Scope L{bot.scope}({scope.label})` → 제거 (헤더에서만 노출)
- [x] `src/components/classbot/bot-header.tsx` line 60-62 동일
- [x] `src/components/classbot/bot-hint-panel.tsx` 점검
- [x] mock 카피 (`src/lib/mock/classbot.ts`·`phase1.ts`) grep — 학생 노출 영역에서 `L\d`·`T\d` 단독 노출 제거
- [x] grep 검증: `Scope L\d`·`\bT[123]\b` 학생 라우트 내 0건

### P0-4: 사용자 버블 솔리드 + 봇 좌측 시그니처 라이너

- [x] `src/lib/tokens/bot-signature.ts` 신규 — 봇 ID → 시그니처 컬러 매퍼
- [x] `chat/page.tsx` `Bubble` 컴포넌트 (lines 344-375):
  - 사용자 버블은 이미 `bg-pullim-blue-600 text-white` 솔리드 ✅
  - 봇 버블에 `border-l-[3px]` + 시그니처 컬러 추가
- [x] PendingBubble (lines 377-393)에도 동일 라이너 적용

### P0-5: 모션 M1(메시지 mount) + M2(타이핑) + M5(LIVE 펄스)

- [x] M1: `Bubble`에 mount animation (opacity 0→1, translateY 8→0, 220ms emphasis easing)
  - 최초 turns 배열 그대로 둠, 새로 추가되는 turn에만 적용 (`useState`로 마운트된 ID set 추적 — 또는 `framer-motion` 의존성 추가 검토)
- [x] M2: 기존 `PendingBubble` 3-dot bounce에 봇 시그니처 컬러 적용 (`--bot-*` 변수 활용)
- [x] M5: `live-overlay.tsx` LIVE 뱃지 점에 더 명시적인 pulse (현재 `animate-pulse` → custom keyframes로 opacity 1→0.4→1 + scale 1→1.2→1)
- [x] `prefers-reduced-motion: reduce` 시 opacity-only fade 120ms fallback (CSS `@media`로 처리)

### Phase 1 검증 (DoD)

- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 통과
- [x] `tests/e2e/chat-scroll-and-input.spec.ts` 통과
- [x] `tests/e2e/student-live-and-flows.spec.ts` 통과
- [x] 수동 검증 — `bun dev` + Chrome DevTools 모바일 375×667:
  - 키보드 열림 → 입력바·전송 가시
  - 봇 헤더 collapse/expand 동작
  - 사용자/봇 버블 시각 구분 + 봇 라이너 색 봇별 다름
  - 메시지 mount/타이핑 페이드 동작
  - LIVE 진행 중 봇 진입 시 펄스 동작
- [x] grep 검증: 학생 라우트에서 `Scope L\d`·`\bT[1-3]\b` 단독 노출 0건

---

## Phase 2 — P1 (별도 PR, Phase 1 머지 후)

- [x] P1-6 빠른 칩 동적 추천 (3종 시나리오)
- [x] P1-7 봇 5종 시그니처 컬러·모티프 + 봇별 인사 + 시간대 인사
- [x] P1-8 홈 4블록 우선순위 재배치 + 봇 카드 정보 보강
- [x] P1-9 메시지 시간/날짜 디바이더
- [x] P1-10 LIVE 카드 시그니처 (navy solid + lime 좌측 라이너 + 시청자 spring)
- [x] P1-11 입력바 첨부 drawer + 음성 + multiline 자동확장

## Phase 3 — P2 (별도 PR)

- [ ] P2-12 메시지 타입 6종 카탈로그 (text → problem-card → explain-step 우선)
- [ ] P2-13 봇 스위처 칩 LIVE 펄스 + 시그니처 활성 상태
- [ ] P2-14 과제 카드 상태별 컬러/라이너 매핑
- [ ] P2-15 과제 봇별 그룹 헤더
- [ ] P2-16 웰빙 담당 봇 코멘트 카드 + 체크인 사후 봇 반응
- [ ] P2-17 웰빙 7일 막대 컬러 + 5지표 펼침

## Phase 4 — P3 (별도 PR)

- [ ] P3-18 리플레이 16:9 자동 캡처 썸네일
- [ ] P3-19 온보딩 학생 시선 카피 + 인터랙티브 데모 채팅 + sticky 진척 바 + 끝 CTA
- [ ] P3-20 봇 idle 호흡(M3) + blink(M4) + 응답 wave bar(M9)
- [ ] P3-21 풀림 자체 무드 이모지 셋 (5단계 face 일러스트)
- [ ] P3-22 시청자 라이브 카운터 spring micro-animation (P1-10에 흡수 가능)

---

## 검증 환경

- `bun dev` → http://localhost:3030/classbot
- Chrome DevTools 모바일 시뮬레이션: 375×667 / 390×844
- Playwright e2e: `tests/e2e/chat-scroll-and-input.spec.ts`, `tests/e2e/student-live-and-flows.spec.ts`
