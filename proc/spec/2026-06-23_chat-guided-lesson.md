# 봇 대화 — 봇 주도 가이드 수업 + 리치 챗 (Track B 후속)

- 작성일: 2026-06-23
- 범위: `apps/classbot` FE 단일 (BE 미혼합)
- 권위 기획: `input/docs-archive/07_풀림_클래스봇_핸드오프.md`
- 선행: 봇대화 2단 레이아웃 + 라이브 컴팩트 바 (직전 작업)

## 1. 배경 / 문제

봇 대화(수학이 형 등)의 학습가이드가 "정적 카드 덤프"로 떠 있어 대화와 분리돼 있었다. 또한:

- 챗 UI가 작고 답변이 평문 한 덩어리 → 학습 표현력 낮음
- 버블 경계가 흐릿하고, 보조 텍스트가 `slate-400`/10px 라 가독성 낮음
- 빠른칩이 과목 입문 질문에 머물러 학습 흐름과 무관
- 학습가이드 항목이 링크/상세가 없어 발견성 낮음

## 2. 목표

학습가이드를 **봇이 먼저 이끄는 가이드 수업**으로 대화에 녹여, 개념→예제→이해점검(퀴즈)→연습으로 자연스럽게 이어지게 한다. 리치 텍스트·명확한 버블·상세 모달로 학습 경험과 가독성을 끌어올린다.

## 3. 결정 사항 (사용자 확정)

- 흐름: **봇 주도 가이드 수업** (입장 시 봇이 오늘 개념을 먼저 제시 → 흐름칩으로 진행)
- mock 범위: **5개 봇 전부 풀 데이터**

## 4. 데이터 모델 — 단일 출처

신규 `lib/mock/classbot-lesson.ts` 가 학습 콘텐츠 **권위**.

```ts
interface LessonConcept {
  id: string;
  title: string;        // 개념명
  summary: string;      // 한 줄 요약 (레일/인라인)
  detail: string;       // 모달 본문 (여러 줄, 리치)
  tips: string[];       // 학습 팁
  coreElements: string[]; // 핵심 요소
  formula?: string;
  sampleQuestions: { q: string; a?: string }[]; // 예제 문항
}
interface LessonStep { num: number; label: string; body: string; formula?: string }
interface LessonQuiz { question: string; options: string[]; answerIndex: number; explain: string }
interface BotLesson {
  topic: string;        // 오늘의 개념 묶음 제목
  intro: string;        // 봇 proactive 오프너 (리치)
  keyCallout: string;   // 💡 핵심 한 줄
  concepts: LessonConcept[];
  example: { title: string; steps: LessonStep[] };
  quiz: LessonQuiz;
  summary: string;      // 정리
}
getBotLesson(botId): BotLesson  // 5봇 + fallback
```

- 톤은 봇 페르소나에 맞춤(친근/정중/스파르타/차분/열정).
- `classbot-study.ts` 의 `getChatQuizzes`/`getStudyGuide` 는 lesson 에서 **파생**(concepts → 학습가이드, sampleQuestions/quiz → 연습 퀴즈). 레일·인라인·대화·모달이 한 소스 공유.

## 5. 대화 흐름 (봇 주도)

- 초기 메시지: **인사(기존 `composeFirstGreeting` 유지)** + **수업 오프너 턴**(`lesson-intro` kind: topic + 💡keyCallout).
- 빠른칩 = 흐름 내비:
  - 기본: `[개념 더보기] [예제 풀어줘] [퀴즈 내줘] [다음 개념 →]`
  - 퀴즈 직후: `[해설 보기] [다음 개념 →]`
  - 마지막 개념/요약 후: `[오늘 정리] [시험 대비]`
- 각 칩은 **서로 다른 리치 답변** 생성:
  - 개념 더보기 → `concept` 카드 (요약 + 핵심요소 + 자세히 보기→모달)
  - 예제 풀어줘 → `example` 단계 카드
  - 퀴즈 내줘 → `quiz` 인라인 MCQ (정답/해설)
  - 다음 개념 → concept index 순환, 다음 `concept` 카드
- `concept index` 는 `ChatPanel` 로컬 상태.

## 6. 리치 텍스트 (#2)

- 구조화 메시지 `kind` 확장: `lesson-intro | concept | example | quiz | summary` (+ 기존 `text|problem-card|explain-step`).
- 평문/카드 본문엔 경량 인라인 포매터 `RichText` (`components/classbot/rich-text.tsx`):
  - `**굵게**`, `` `코드` ``, 줄 시작 `- `/`• ` 불릿, `① `/`1) ` 번호, `💡` 콜아웃.
  - 순수 함수 파서 → jest 단위 테스트로 검증.

## 7. 버블 / 가독성 (#1·#3·#5)

- 봇 버블: `bg-pullim-slate-50` + `border-pullim-slate-200` 보더 + 시그니처 좌측 라이너(3px), 패딩 `px-4 py-3`, 본문 **15px**, line-height 여유.
- 학생 버블: 파랑 유지, 패딩 확대.
- 카드/섹션 패딩 상향(p-3 → p-4/5), 메시지 간격 확대(gap-3 → gap-4), 아바타 7→8.
- 보조 텍스트 `slate-400 → slate-500/600`, 읽는 정보엔 micro(10px) 금지(≥12px).

## 8. 학습가이드 모달 (#6)

- 신규 `ConceptModal` (`components/classbot/concept-modal.tsx`, shadcn `ui/dialog`):
  - 섹션: **핵심 개념(detail) · 학습 팁 · 핵심 요소 · 예제 문항**.
  - self-contained `<ConceptModal concept={c}>{trigger}</ConceptModal>` — 어디서든 동일 모달.
- 트리거: 인라인 학습카드 항목 / 우측 레일 항목 / 대화 속 `concept` 카드의 "자세히 보기".

## 9. 색 / 테스트 가드

- 챗 페이지 색 규약 유지: green/amber 금지, blue/slate/위험빨강만. 인라인 퀴즈 정답/오답은 기존 `LiveQuizCard` 패턴(blue/danger).
- e2e:
  - `chat-quick-prompts-by-bot.spec.ts` → 새 흐름칩 + 서로 다른 답변으로 재작성.
  - `chat-greeting-by-bot`(인사 텍스트 유지)·`chat-scroll-and-input`(data-slot 유지)·`student-live-and-flows`·`color-palette` 유지·통과.

## 10. 영향 파일

신규: `lib/mock/classbot-lesson.ts`, `components/classbot/concept-modal.tsx`, `components/classbot/rich-text.tsx`(+테스트).
수정: `app/(student)/classbot/chat/page.tsx`, `lib/mock/chat.ts`, `lib/mock/classbot-dynamic-replies.ts`, `lib/mock/classbot-study.ts`, `components/classbot/chat-study-inline.tsx`, `components/classbot/chat-study-rail.tsx`, `tests/e2e/chat-quick-prompts-by-bot.spec.ts`.

## 11. 비목표 (YAGNI)

- 실제 LLM 연동(여전히 mock·deterministic). v2에서 tool-calling 대체.
- 진도 영속화(서버 저장)·정답 통계 — 데모 mock 범위 밖.
- i18n / Sentry / DS 패키지 도입 금지(앱 규약).
