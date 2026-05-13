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
- [ ] dev 서버 끄고(또는 무관) production URL로 색 검증 재실행
  ```bash
  PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app \
    bun x playwright test color-palette --reporter=line
  ```
- [ ] 8/8 통과 확인 — 어제 localhost 검증과 동일 결과여야
- [ ] production 캡처 저장 위치 분리: `output/live-shots/color-palette-prod/` (로컬과 구분)
  - color-palette.spec.ts의 `OUT_DIR`가 환경에 따라 분기되도록 한 줄 수정 (env `PROD_CAPTURE=1` 시 -prod 디렉토리)
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
- [ ] [classbot.ts ClassBot 타입](src/lib/mock/classbot.ts#L8-L32)에 `greeting: string` 필드 추가
- [ ] cb_001 / cb_002 / cb_003 데이터에 `greeting` 채우기 — 기존 [chat/page.tsx greetingFor](src/app/(student)/classbot/chat/page.tsx#L21-L32)의 인라인 텍스트를 그대로 옮김
- [ ] [chat/page.tsx](src/app/(student)/classbot/chat/page.tsx#L21-L32) `greetingFor` 함수 제거 + `bot.greeting` 직접 사용. fallback은 `bot.greeting ?? \`안녕! ${bot.name}이에요. 무엇을 도와줄까요?\`` 단순화
- [ ] [chat.ts classbotChatGreeting](src/lib/mock/chat.ts#L8) 상수는 backward-compat alias로 변경 — `classBots[0].greeting` 참조하거나 deprecated 주석 + 그대로 보존
- [ ] 봇 선택 chip 3개 전환 시 인삿말 톤이 바뀌는지 라이브 확인 (`/classbot/chat`)
- [ ] Playwright 무회귀 — 23/23 유지

### 완료 기준
- `chat/page.tsx`에 `bot.id ===` 비교 0건
- 봇별 인삿말이 `ClassBot.greeting` 데이터에서 단일 출처로 옴
- PR 1건 dev → main 머지 + production 라이브에서 봇 chip 전환 인삿말 변화 확인

---

## 비고
- 두 작업 모두 작아서 한 사이클(09:30 → 17:30) 안에 완료 가능
- 작업 2가 끝나면 PR #13의 톤 데이터 모델이 인삿말까지 완전 일관 — 다음 봇 추가가 데이터 한 줄로 가능해짐
- 잔여 후보(어제 17:30 보고): 봇 quick prompts 과목별 분리(UX 결정 필요) / Slider variant 확장(dual-thumb, danger thumb) — 본 plan 범위 외
