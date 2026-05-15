# 2026-05-15 — Chat scroll·input 폴리싱 (sticky-to-bottom + multiline input)

> 09:30 형식 brief — 다음 사이클 산출물 1건. 어제(2026-05-14) 17:30 보고 "내일 후보 3건" 중 G1 우선순위 합의로 선정.

## 목표
`/classbot/chat`의 두 가지 UX 마찰을 한 사이클에 폴리싱한다.

1. **Sticky-to-bottom scroll** — 사용자가 위로 거슬러 올라간 상태일 때 새 메시지가 도착해도 강제 auto-scroll 하지 않음. "새 메시지" 안내 배너 후, 사용자가 명시적으로 누르거나 직접 내려가면 다시 sticky 복귀.
2. **Multiline input + 전송 가드** — 단일 라인 `<input>` → auto-expanding `<textarea>`. Enter=전송, Shift+Enter=줄바꿈. 빈 입력·whitespace-only 입력은 전송 버튼 disabled로 시각화 (현재는 pending만 disabled).

추출본 클래스봇 단일 도메인 범위. 공유 셸·UI 프리미티브는 read-only.

## 배경
- 출처: [daily_outcome/2026-05-14.md](../../daily_outcome/2026-05-14.md) 17:30 "내일 이어서 할 일" 2번 + [daily_outcome/2026-05-15.md](../../daily_outcome/2026-05-15.md) 09:30 산출물 B.
- 현재 [src/app/(student)/classbot/chat/page.tsx](../../src/app/(student)/classbot/chat/page.tsx):
  - line 75-77: `useEffect`가 `turns`/`pending` 변경마다 `scrollTo({ top: scrollHeight, behavior: 'smooth' })` 무조건 호출 → 위로 올려도 끌려 내려감
  - line 171-175: 단일 `<input name="q">` — `Shift+Enter` 줄바꿈 안 됨, 장문 입력 시 한 줄로 잘려 보임
  - line 178: 전송 버튼 `disabled={pending}` 만 — 빈 문자열·whitespace에도 클릭 가능 (실제 `send()` 가 `text.trim()` 으로 가드는 하나 시각 신호 없음)
- 기존 e2e: chat 관련 spec(`tests/e2e/chat-greeting-by-bot.spec.ts`, `chat-quick-prompts-by-bot.spec.ts`)은 갱신 0건 — UX 회귀 커버리지 비어 있음.

## 정책

### 정책 1 — Sticky-to-bottom (이미 표준화된 패턴)
- 스크롤 거리 기반 sticky 판정: `scrollHeight - scrollTop - clientHeight < threshold(80px)` 이면 sticky.
- 새 메시지/`pending` 도착 시:
  - sticky 상태 → auto-scroll
  - sticky 아님 → auto-scroll 억제 + "새 메시지" 배너 노출 (절대 위치, 채팅 영역 하단 중앙)
- 배너 클릭 → 최하단으로 스크롤 + sticky 복귀.
- 사용자가 직접 최하단까지 내려가면 배너 자동 dismiss + sticky 복귀.

### 정책 2 — Multiline input + 전송 가드
- `<input>` → `<textarea rows={1}>` + JS로 `scrollHeight` 따라 height 자동 조정 (max 4줄 ~= 6rem).
- 키바인딩:
  - `Enter` (no modifier) → form submit
  - `Shift+Enter` → 줄바꿈 (브라우저 기본 동작 허용)
  - IME composition 중 Enter → submit 차단 (한글 입력 끝까지 보존)
- 전송 버튼 disabled 조건: `pending || !value.trim()` → form state로 관리 (현재는 비제어 폼이라 제어 폼으로 전환 필요).
- placeholder·width·radius 등 시각 토큰은 기존 그대로(`rounded-full` → multiline 자연스럽게 보이게 `rounded-2xl` 검토, 디자인 일관성 확인 1라인 안에서).

### 비범위(이번 사이클 제외)
- Virtual keyboard 안전성(`position: fixed` / `resizeObserver` / iOS Safari `viewport` 대응) — 실 모바일 디바이스 테스트 필요해 별도 사이클로 분리. 본 사이클은 데스크톱·모바일 웹뷰 공통 동작만 확보.
- 메시지 그룹핑·timestamp 등 정보 밀도 폴리싱 — UX 디자인 별도 의사결정 필요.

## 작업 항목

### A. Sticky-to-bottom scroll
- [x] [src/app/(student)/classbot/chat/page.tsx](../../src/app/(student)/classbot/chat/page.tsx) `ChatPanel`:
  - `stickyRef = useRef<boolean>(true)` 초기 true
  - `handleScroll` → `STICKY_THRESHOLD=80` 안이면 stickyRef.current=true + 배너 자동 dismiss, 아니면 false
  - `useEffect([turns, pending])` 분기 — sticky면 `scrollToBottom('smooth')`, 아니면 `setShowNewMessageBanner(true)`
- [x] "새 메시지" 배너 — `<button data-slot="new-message-banner" aria-label="새 메시지로 이동">`, scrollRef wrapper에 `absolute bottom-3 left-1/2 -translate-x-1/2` sticky positioning. 클릭 → `scrollToBottom() + setShowNewMessageBanner(false)`.
- [x] sticky 복귀 — `handleScroll`에서 임계값 안 진입 시 `setShowNewMessageBanner(false)` 즉시 호출

### B. Multiline input + 전송 가드
- [x] 동일 파일 form 부분:
  - `<input>` → `<textarea ref={textareaRef} rows={1}>` 교체, 제어 폼(`value/setValue`) 전환
  - `handleKeyDown` — Enter + `!shiftKey + !nativeEvent.isComposing` → `submit() + preventDefault()`. Shift+Enter 기본 동작 허용.
  - `handleTextareaInput` — `el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_PX) + 'px'` (96px = 6rem max)
  - 전송 버튼 disabled — `pending || !value.trim()`
  - submit 후 `setValue('') + height = 'auto'` 리셋
- [x] 시각 토큰 — `rounded-full` → `rounded-2xl`, `resize-none`, `leading-relaxed`, `style={{ maxHeight }}` 인라인 안전핀

### C. e2e 신규
- [x] [tests/e2e/chat-scroll-and-input.spec.ts](../../tests/e2e/chat-scroll-and-input.spec.ts) 신설 — 4 시나리오 전부 통과:
  - sticky off → 배너 노출 + scrollTop 보존
  - 배너 클릭 → 최하단 복귀 (distanceFromBottom<80) + 배너 hidden
  - Enter 전송 / Shift+Enter 줄바꿈 (`textarea value === 'b\nc'`, 새 student bubble 생성 안 됨)
  - 빈 입력 / whitespace-only → 전송 버튼 disabled
  - BASE는 `PLAYWRIGHT_BASE_URL` env 의존 — prod 회귀 자동 커버

### D. 검증
- [x] `bun x tsc --noEmit` 통과 (output 0)
- [x] `bun run build` 통과 — 라우트 수 변경 없음
- [x] `bun x playwright test tests/e2e/chat-scroll-and-input.spec.ts` 로컬 green (4 passed, 21.1s)
- [x] `bun x playwright test` 전체 회귀 green — 32 passed (기존 28 + 신규 4, 24.9s)
- [ ] 수동 dogfooding — `/classbot/chat`에서 quick prompt 5회 + 위로 스크롤 + 배너 클릭 + Shift+Enter 줄바꿈 1회 (PR 머지 전 PM 수동 1회)

### E. 머지
- [x] PR dev/main — [PR #45](https://github.com/curea-co/pullim-classbot/pull/45) 머지 (commit e78c828)
- [x] PR 머지 후 `bunx vercel --prod` 수동 배포 — deployment `dpl_GdaesKX5WkBgjdjDibRYjSTK5swN`, alias https://pullim-classbot.vercel.app
- [x] prod-verify workflow dispatch — [run 25897774539](https://github.com/curea-co/pullim-classbot/actions/runs/25897774539) green (32 spec production hit 통과, 신규 4 + 기존 28)

## 검증 (요약)
- `/classbot/chat` 위로 스크롤 후 quick prompt 전송 시 자동 스크롤되지 않고 배너 노출
- textarea가 1~4줄까지 height 자동 확장, Shift+Enter 줄바꿈 보존
- 빈 입력에서 전송 버튼 disabled
- 신규 e2e + 기존 e2e 전부 통과 (로컬 + prod-verify)

## 다음 사이클 첫 액션 (1줄)
**[src/app/(student)/classbot/chat/page.tsx](../../src/app/(student)/classbot/chat/page.tsx) `ChatPanel`의 `useEffect([turns, pending])` 블록부터 sticky 판정 분기로 교체 시작.**
