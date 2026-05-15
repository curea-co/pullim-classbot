# 2026-05-14 — cb_004 국어 누나 추가 (차분/논리 새 톤)

## 목표
4번째 클래스봇 `cb_004` 국어 누나를 추가. 기존 친근/정중/스파르타와 겹치지 않는 **차분/논리** 새 톤을 도입해 4과목 × 4톤 매트릭스를 채운다.

## 배경
- daily_outcome 2026-05-14 산출물 B. G1 컨펌: "차분/논리 새 톤 — 국어 누나" 결정.
- 어제 (`proc/archive/2026-05-13_chat-tone-and-prod-verify.md`, `2026-05-13_bot-quick-prompts.md`)에서 `ClassBot.greeting` + `ClassBot.quickPrompts` 단일 출처화가 마무리됨 — cb_004 추가는 그 위에 mock 한 줄로 가능한 구조.
- 현재 `src/lib/mock/chat.ts`의 `ReplyKey`는 수학/영어/과학 3과목 + 공통 3 키. 국어는 새 `ReplyKey` 1개 + `repliesByTone`에 차분/논리 분기 + 톤 union 확장 필요.

## 정책
- `ClassBot.tone` union: `'정중' | '친근' | '스파르타' | '차분'` 로 확장 (`'논리'`도 후보였으나 톤 분류라 캐릭터 인상에 가까운 `차분` 채택. 차분 = "감정 톤이 일정, 단계별 분석 위주의 차분한 존댓말").
- 차분 톤 voice 가이드:
  - 존댓말 (정중과 같은 어미)지만 감탄/감정 표현 절제
  - 분석 단계를 1→2→3 또는 가/나/다로 단계화해서 설명
  - 어휘는 비격식/일상보다 "독해/논증/주제/주장" 같은 국어 학습 용어를 정확히 사용
- ReplyKey 신설: `'reading_inference'` (국어 — 비문학 독해/주제 추론 cb_004).
- `chat.ts` `repliesByTone` 에 `차분: repliesAnalytic` 추가 + 6개 ReplyKey 전부 차분 톤 작성.
- 기존 cb_001~003 voice는 건드리지 않음.

## 작업 항목

### A. Type 확장
- [x] `src/lib/mock/classbot.ts` `ClassBot.tone` union에 `'차분'` 추가.
- [x] `src/lib/mock/chat.ts` `ReplyKey` union에 `'reading_inference'` 추가.
- [x] `repliesFriendly`/`repliesFormal`/`repliesSpartan` 에 `reading_inference` 키 6개 보충 (각 톤별 1줄).
- [x] 새 `repliesAnalytic: Record<ReplyKey, string>` 추가 — 차분/단계적 voice, 6 ReplyKey 전부.
- [x] `repliesByTone['차분'] = repliesAnalytic`, `defaultRepliesByTone['차분']` 추가.
- [x] `BotTone` type alias 갱신 — `'친근' | '정중' | '스파르타' | '차분'`.

### B. cb_004 mock 데이터
- [x] `src/lib/mock/classbot.ts` `classBots` 배열에 cb_004 추가:
  - `id: 'cb_004'`
  - `name: '국어 누나'`
  - `avatarEmoji: '👩‍💼'` (정중·분석적 인상 — 영어 누나 👩‍🏫와 구분되게 사무 아바타로 선택)
  - `teacherName: '최국어 선생님'`
  - `organization: '대치프리미엄 수학학원'` (서연 학생 메인 학원과 동일 조직 — 동선 자연스러움)
  - `subject: '국어'`, `grade: '고2'`
  - `tone: '차분'`
  - `greeting`: 차분 톤 — "서연 학생, 안녕하세요. 국어 누나예요. 오늘 비문학 독해 — 주장의 근거 추적 진행했어요. 막힌 문장 단락 번호로 알려주시면 단계별로 풀어드릴게요. Scope L4 — 풀이 단계까지는 같이 잡아드려요."
  - `quickPrompts` 4개:
    - { text: '비문학 주제 어떻게 잡아요?', expectedReplyKey: 'reading_inference' }
    - { text: '오늘 수업 요약해줘요',         expectedReplyKey: 'today_summary' }
    - { text: '6월 모평 대비 뭐 해야 해요?', expectedReplyKey: 'exam_prep' }
    - { text: '저 잘하고 있는 거예요?',       expectedReplyKey: 'reassurance' }
  - `scope: 4`
  - `isLive: false` (혼잡 회피 — cb_001/cb_002만 라이브 유지)
  - `enrolledCount: 16`
- [x] `studentEnrollments` 에 cb_004 항목 추가 — `classroomLabel: '고2 비문학독해 A반'`, `assignedAt: '2026-04-08 17:30'`, `via: '대치프리미엄 수학학원'`, `assignedBy: '최국어 선생님'`.
- [x] `botCurriculum.cb_004`: `[{ id: 'kor-noninfo-arg', label: '비문학 — 주장과 근거', fullPath: '비문학 · 인문/사회 · 주장과 근거', achievementCodes: ['국-비문-1'] }, { id: 'kor-noninfo-theme', label: '비문학 — 주제 추론', fullPath: '비문학 · 주제 추론', achievementCodes: ['국-비문-2'] }]`

### C. e2e 4봇 확장
- [x] `tests/e2e/chat-greeting-by-bot.spec.ts` — cb_004 클릭 → "국어 누나예요" + "단계별로 풀어드릴게요" 노출 검증 추가.
- [x] `tests/e2e/chat-quick-prompts-by-bot.spec.ts` — cb_004 클릭 → "비문학 주제 어떻게 잡아요?" 노출 + 클릭 시 차분 톤 reply 1문장 노출 검증 추가.

### D. 검증
- [x] `bun x tsc --noEmit` 통과 — tone union 확장으로 발생할 좁힘 분기 모두 OK 확인.
- [x] `bun run build` 통과.
- [x] Playwright 회귀 무회귀 — `chat-greeting-by-bot` `chat-quick-prompts-by-bot` 4봇 분기 통과.

### E. 마무리
- [x] dev/main PR 머지 — PR #38 머지 (commit 45e7cf0).
- [x] production: `bunx vercel --prod` 트리거 + prod-verify workflow(2026-05-14 PR #39~#42) 회귀로 prod 4봇 라이브 자동 검증 흡수.

## 정합성 검토 노트
- **톤 union 확장 안전성**: cb_001~003은 `tone` 비교를 안 하고 `bot.tone`을 `pickClassbotReply`로 전달만 함. 좁힘 분기가 `chat.ts` 내부에만 있어 union 확장 시 `repliesByTone['차분']` 등록만 빠뜨리지 않으면 tsc 통과.
- **차분 vs 정중 voice 차이**: 정중(cb_002)은 "괜찮아요!" 류 정서적 추임새 포함, 차분(cb_004)은 추임새 절제 + 분석 단계 명시. quickPrompt 키 매칭 외에 reply 본문에서 voice 분리 명확화.
- **avatar 🎯 vs 👩‍💼**: cb_002 영어 누나가 👩‍🏫 → cb_004 국어 누나는 👩‍💼(사무직 인상, 분석가 메타포)로 시각 분리. 둘 다 "누나" 이름이 겹쳐도 학생 시점에서 과목/avatar로 즉시 구분 가능.
- **enrollmentCount/scope**: 4봇 모두 L3~L4 범위 + 학생 풀에 균등 분산. cb_004는 `isLive: false`로 chat strip의 라이브 dot 표기가 cb_001/cb_002 두 곳만 유지 → 시각 노이즈 통제.

## 완료 기준
- [x] `/classbot/chat` 봇 chip 4개 노출, cb_004 클릭 시 차분 톤 greeting + 국어 quick prompts 라이브.
- [x] e2e 2건이 4봇 분기 모두 검증.
- [x] dev/main PR 머지 — PR #38 머지 (commit 45e7cf0).

## 블로커 처리
- G1 톤 컨펌 완료 (차분/논리 새 톤 — 국어 누나) → blocker 해제.
