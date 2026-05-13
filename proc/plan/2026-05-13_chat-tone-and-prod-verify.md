# 2026-05-13 — production 색 검증 종결 + chat 인삿말 tone 기반 refactor

## 목표
1. 어제 머지된 색 스펙트럼 축소(PR #21/#22)가 production에 반영됐는지 라이브 Playwright로 확정 + 캡처 보존
2. `chat/page.tsx` 인삿말 hardcoded botId 분기를 `bot.tone` 기반으로 정돈 — PR #13의 톤 데이터 모델 일관성 확보

---

## 작업 1 — production 색 검증 종결

### 배경
- 어제 폴링 task `bowefadnm`이 production에서 `bg-pullim-warn` 사라짐을 감지하고 완료 신호 — 즉 사용자가 Vercel 대시보드 manual trigger 완료
- Playwright config는 어제 `PLAYWRIGHT_BASE_URL` env로 baseURL override 가능하게 수정해 둠

### 작업 항목
- [x] production 캡처 저장 위치 분리: `output/live-shots/color-palette-prod/` (로컬과 구분)
  - [color-palette.spec.ts](tests/e2e/color-palette.spec.ts) `OUT_DIR`가 `PROD_CAPTURE=1` env 시 `-prod` 디렉토리로 분기 (PR #23에 포함)
- [x] [playwright.config.ts](playwright.config.ts) `PLAYWRIGHT_BASE_URL` env override 지원 (PR #23에 포함)
- [ ] production URL로 색 검증 재실행 — **Vercel edge cache HIT(age 21시간)으로 옛 버전 잔류**. 폴링 task `bvp8asby6`가 캐시-버스팅 query param으로 1분 간격 확인 중. 사용자 대시보드 redeploy/cache purge 트리거 대기.
  ```bash
  PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app \
    PROD_CAPTURE=1 bun x playwright test color-palette --reporter=line
  ```
- [ ] 8/8 통과 확인 (캐시 무효화 후)
- [ ] 캡처 8장 중 teacher/classbot + student/wellness 시각 확인 — blue 그라데이션 위계 정상
- [ ] 검증 통과 시 PR #21 / #22 본문에 production 검증 완료 댓글 추가 (선택)

### 완료 기준
production에서 success/warn hue 검출 0건 + 캡처 8장 보존

---

## 작업 2 — chat 인삿말 봇 tone 기반 refactor

### 현재 구조 (2026-05-13 시점)
- [chat/page.tsx:21-32](src/app/(student)/classbot/chat/page.tsx#L21-L32) `greetingFor(bot)` — `bot.id === 'cb_001/002/003'` 하드코딩 분기 + else fallback
- 각 분기에 인삿말 문자열 + 학생 이름 "서연" + Scope 레벨 + 봇 voice 묶여서 인라인
- cb_001 인삿말은 [chat.ts](src/lib/mock/chat.ts) `classbotChatGreeting` 상수 참조 (다른 봇은 인라인)
- PR #13에서 `bot.tone: '친근' | '정중' | '스파르타'` 필드 + `repliesByTone` / `defaultRepliesByTone` 패턴 도입 완료

### 문제
- 새 봇(cb_004+) 추가 시 `greetingFor`에 if 추가 + 인삿말 인라인 필요 — 톤 데이터 모델과 어긋남
- cb_001 인삿말만 분리, 나머지 인라인 — 일관성 깨짐

### 리팩토링 방향 (재검토 후 결정 — 2026-05-13)

> **재검토 — 톤별 인삿말 템플릿 vs 봇별 인삿말 데이터**
>
> 톤별 템플릿 (PR #13 repliesByTone 패턴 그대로):
> - 장점: 톤 데이터 모델 일관 (PR #13 reply와 동일 구조)
> - 단점: 같은 톤 봇 2개가 같은 인삿말, 봇별 voice 자유도 손실. 봇 이름 받침 처리(이야/예요)도 까다로움. 결국 봇 데이터에 `selfIntro`/`context`/`scopePromise` 슬롯을 박아야 자연스러워지는데, 그 시점에 인삿말 통째로 박는 거랑 비용 같음.
>
> 봇별 인삿말 데이터 (`bot.greeting: string`):
> - 장점: 봇 voice 자유도 100%. 받침/이모지/캐릭터 어미 모두 봇 작성자 권한.
> - 단점: 데이터 한 필드 추가. 단 톤 일관성은 봇 데이터를 채울 때 봇 작성자가 책임 (정중 봇이면 존댓말 인삿말).
> - reply 영역은 키워드 기반이라 톤 매핑이 자연스럽고, greeting은 캐릭터 한 줄 voice라 봇별 데이터가 더 적합 — 두 영역이 다른 책임.
>
> **결정**: `ClassBot.greeting: string` 필드 추가. 봇 ID 하드코딩 제거 목적 달성 + voice 자유도 보존.

### 작업 항목 (확정)
- [x] [classbot.ts ClassBot 타입](src/lib/mock/classbot.ts)에 `greeting: string` 필드 추가
- [x] cb_001 / cb_002 / cb_003 데이터에 `greeting` 채우기 — 기존 인라인 텍스트 그대로 이전
- [x] [chat/page.tsx](src/app/(student)/classbot/chat/page.tsx) `greetingFor` 함수 제거 + `bot.greeting` 직접 사용
- [x] [chat.ts classbotChatGreeting](src/lib/mock/chat.ts) 상수 삭제 (외부 import 0건 확인 후)
- [x] 봇 chip 3개 전환 인삿말 톤 변화 — 자동 검증 spec [chat-greeting-by-bot.spec.ts](tests/e2e/chat-greeting-by-bot.spec.ts) 신규 추가
- [x] Playwright **24/24** 통과 (회귀 15 + 색 검증 8 + chat greeting 신규 1)

### 완료 기준
- [x] `chat/page.tsx`에 `bot.id ===` 비교 **0건** 달성
- [x] 봇별 인삿말이 `ClassBot.greeting` 데이터에서 단일 출처
- [x] PR #23 (dev) + PR #24 (main) 머지 완료
- [ ] Production 라이브에서 봇 chip 전환 인삿말 변화 확인 — Vercel 캐시 무효화 후

---

## 비고
- 두 작업 모두 작아서 한 사이클(09:30 → 17:30) 안에 완료 가능
- 작업 2가 끝나면 PR #13의 톤 데이터 모델이 인삿말까지 완전 일관 — 다음 봇 추가가 데이터 한 줄로 가능해짐
- 잔여 후보(어제 17:30 보고): 봇 quick prompts 과목별 분리(UX 결정 필요) / Slider variant 확장(dual-thumb, danger thumb) — 본 plan 범위 외
