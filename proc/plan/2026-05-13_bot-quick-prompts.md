# 2026-05-13 — 봇 quick prompts 과목별 분리

## 목표
봇 chip 전환 시 quick prompts도 봇 과목/voice에 맞게 바뀌도록 — cb_001(수학) / cb_002(영어) / cb_003(과학) 각각 자기 과목 prompt 노출. `ClassBot.greeting` 패턴(2026-05-13 chat refactor) 재사용.

## 현재 상태
- [chat.ts:12-17](src/lib/mock/chat.ts#L12) `classbotQuickPrompts` 단일 export — 수학 위주(극값/도함수)
- [chat/page.tsx:149](src/app/(student)/classbot/chat/page.tsx#L149)에서 봇과 무관하게 동일 노출
- 결함: cb_002(영어 누나) 선택 시 "극값 어떻게 찾아요?" 노출 → 어색

## 결정 사항
- **데이터 모델**: `ClassBot.quickPrompts: ClassbotQuickPrompt[]` 필드 직접 박기 (greeting 패턴과 동일). 봇별 voice 자유도 100%.
- **reply key 확장**: 기존 4개 key + 봇별 과목 key 2개 추가 (영어/과학)
  - `blank_inference` — 영어 빈칸 추론
  - `circuit` — 과학 통합과학 (전기회로 또는 개념 복습)
- **톤별 reply data**: 새 key 2개를 친근/정중/스파르타 3 톤 × 2 key = 6개 reply 추가 (자유 질문 매칭에서도 일관)
- **chat/page.tsx**: quickPrompt 클릭 시 `expectedReplyKey` 우선 — pickClassbotReply에 key 파라미터 추가 또는 별도 함수

## 작업 항목

### Phase 1 — 데이터 모델 확장
- [x] [chat.ts](src/lib/mock/chat.ts) `ReplyKey` 타입에 `blank_inference` + `circuit` 추가 + export로 변경
- [x] `repliesFriendly` / `repliesFormal` / `repliesSpartan` 3 톤 × 2 key = 6개 reply 작성
- [x] [pickClassbotReply](src/lib/mock/chat.ts) 키워드 정규식 확장 — `빈칸|추론`, `회로|전기|옴의?\s*법칙` + `forcedKey?: ReplyKey` 파라미터 추가
- [x] 보너스 cleanup: 외부 사용처 0건이던 `classbotChatReplies` / `classbotDefaultReply` 삭제

### Phase 2 — ClassBot 데이터에 quickPrompts 박기
- [x] [classbot.ts ClassBot 타입](src/lib/mock/classbot.ts)에 `quickPrompts: ClassbotQuickPrompt[]` 필드 추가 (필수)
- [x] cb_001 (수학) — `extremum / today_summary / exam_prep / reassurance` + 친근 반말 텍스트
- [x] cb_002 (영어) — `blank_inference / today_summary / exam_prep / reassurance` + 정중 존댓말 텍스트
- [x] cb_003 (과학) — `circuit / today_summary / exam_prep / reassurance` + 스파르타 단호반말 텍스트
- [x] `ClassbotQuickPrompt` 타입은 chat.ts에 유지, classbot.ts에서 `import type` 으로 참조

### Phase 3 — chat/page.tsx 적용
- [x] `classbotQuickPrompts` import 제거 → `bot.quickPrompts.map`
- [x] `send(text, forcedKey?)` 시그니처 확장 + `pickClassbotReply(text, bot.tone, forcedKey)` 위임
- [x] quickPrompt 클릭 시 `expectedReplyKey`를 forcedKey로 전달 — 톤+과목 매칭 일관

### Phase 4 — 검증
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 24 라우트 통과
- [x] **Playwright 26/26** 통과 (회귀 23 + chat-quick-prompts 신규 2 + 기존 chat-greeting 1)
- [x] 신규 spec — 봇 3개 전환 시 prompt 텍스트 변화 + 클릭 시 봇 톤+과목 reply 노출 둘 다 자동 검증

### Phase 5 — 머지 & 배포
- [ ] PR dev 머지 + main 릴리스
- [ ] `bunx vercel --prod` 트리거 → production 라이브 검증
- [ ] plan 체크박스 마무리

## 완료 기준
- chat/page.tsx에 `classbotQuickPrompts` import 0건
- 봇 chip 3개 전환 시 quickPrompt 4개 텍스트가 봇 과목에 맞게 변화 (자동 spec 통과)
- production 라이브에서 봇별 quickPrompt 클릭 reply 검증

## 비고
- Slider variant 확장 / dual-range CSS cleanup은 본 plan 범위 외 — 다음 사이클 후보
