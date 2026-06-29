/**
 * 빠른 칩(Quick Reply) 동적 추천 — 3종 시나리오.
 * 권위: [04 § 9.6](proc/spec/04-ux-flow.md).
 *
 * 1) 대화 시작 (메시지 0건 또는 봇 첫 인사만 있을 때): 봇 정적 quickPrompts (입문 질문)
 * 2) 마지막 봇 발화 기반: 직전 봇 응답의 ReplyKey → 후속 질문 매핑
 * 3) 시간/상황 기반: 새벽·심야 진입 → 웰빙 칩 prepend
 */

import { LESSON_FLOW_KEYS, type ClassbotQuickPrompt, type QuickReplyKey } from './chat';
import type { ClassBot } from './classbot';

/**
 * 빠른 칩 시각 종류 (A7).
 * - guide: 봇 주도 수업 단계 칩(개념/예제/퀴즈/다음) — 시그니처 좌측 라이너 강조
 * - ask: 자유 질문·웰빙·요약 등 — 중립 outline
 */
export type QuickReplyChipKind = 'guide' | 'ask';

/**
 * 칩 응답키 → 시각 종류. 수업 흐름키(LESSON_FLOW_KEYS)면 guide, 그 외(today_summary/exam_prep/
 * reassurance/extremum 등)는 ask.
 */
export function quickReplyChipKind(key: QuickReplyKey): QuickReplyChipKind {
  return (LESSON_FLOW_KEYS as readonly string[]).includes(key) ? 'guide' : 'ask';
}

/**
 * 봇 주도 가이드 수업 — 기본 흐름칩 (개념 → 예제 → 퀴즈 → 다음 개념).
 * 각 칩은 서로 다른 리치 답변(구조화 메시지)을 생성한다.
 */
export const LESSON_FLOW: ClassbotQuickPrompt[] = [
  { text: '개념 더보기', expectedReplyKey: 'lesson_concept' },
  { text: '예제 풀어줘', expectedReplyKey: 'lesson_example' },
  { text: '퀴즈 내줘', expectedReplyKey: 'lesson_quiz' },
  { text: '다음 개념 →', expectedReplyKey: 'lesson_next' },
];

/**
 * 흐름키/응답키별 후속 칩 — 봇 발화 직후 자연스러운 다음 단계.
 * 각 후속 칩도 서로 다른 답변으로 이어진다.
 */
const FOLLOWUPS_BY_REPLY: Partial<Record<QuickReplyKey, ClassbotQuickPrompt[]>> = {
  lesson_concept: [
    { text: '예제 풀어줘', expectedReplyKey: 'lesson_example' },
    { text: '퀴즈 내줘',   expectedReplyKey: 'lesson_quiz' },
    { text: '다음 개념 →', expectedReplyKey: 'lesson_next' },
  ],
  lesson_example: [
    { text: '퀴즈 내줘',   expectedReplyKey: 'lesson_quiz' },
    { text: '개념 더보기', expectedReplyKey: 'lesson_concept' },
    { text: '다음 개념 →', expectedReplyKey: 'lesson_next' },
  ],
  lesson_quiz: [
    { text: '다음 개념 →', expectedReplyKey: 'lesson_next' },
    { text: '오늘 정리',   expectedReplyKey: 'today_summary' },
    { text: '시험 대비',   expectedReplyKey: 'exam_prep' },
  ],
  lesson_next: [
    { text: '개념 더보기', expectedReplyKey: 'lesson_concept' },
    { text: '예제 풀어줘', expectedReplyKey: 'lesson_example' },
    { text: '퀴즈 내줘',   expectedReplyKey: 'lesson_quiz' },
  ],
  extremum: [
    { text: '극값 예제 더 보여줘', expectedReplyKey: 'today_summary' },
    { text: '부호 변화 표 그리기', expectedReplyKey: 'extremum' },
    { text: '오늘 수업 요약',     expectedReplyKey: 'today_summary' },
  ],
  blank_inference: [
    { text: '논리 접속사 예시',   expectedReplyKey: 'blank_inference' },
    { text: '5~7번 유형 차이',    expectedReplyKey: 'blank_inference' },
    { text: '오늘 수업 요약',     expectedReplyKey: 'today_summary' },
  ],
  circuit: [
    { text: '직렬·병렬 헷갈려',   expectedReplyKey: 'circuit' },
    { text: '옴의 법칙 예제',     expectedReplyKey: 'circuit' },
    { text: '오늘 수업 요약',     expectedReplyKey: 'today_summary' },
  ],
  reading_inference: [
    { text: '주제 추론 예제',     expectedReplyKey: 'reading_inference' },
    { text: '주장 vs 반박 구조',  expectedReplyKey: 'reading_inference' },
    { text: '오늘 수업 요약',     expectedReplyKey: 'today_summary' },
  ],
  social_inference: [
    { text: '입장 매트릭스 예시', expectedReplyKey: 'social_inference' },
    { text: '근거 분리 더 해보기', expectedReplyKey: 'social_inference' },
    { text: '오늘 수업 요약',     expectedReplyKey: 'today_summary' },
  ],
  today_summary: [
    { text: '내일 수업 미리보기', expectedReplyKey: 'exam_prep' },
    { text: '복습 자료 추천',     expectedReplyKey: 'reassurance' },
  ],
  exam_prep: [
    { text: '오답정복 시작',     expectedReplyKey: 'reassurance' },
    { text: '저 잘하고 있어요?', expectedReplyKey: 'reassurance' },
  ],
  reassurance: [
    { text: '내일도 봇이랑 가요', expectedReplyKey: 'today_summary' },
  ],
};

/** 야간/새벽 시간대에 노출되는 웰빙 진입 칩 */
const WELLBEING_NIGHT_CHIP: ClassbotQuickPrompt = {
  text: '오늘 컨디션 안 좋아',
  expectedReplyKey: 'reassurance',
};

export type DynamicReplyContext = {
  bot: ClassBot;
  /** 메시지 turn 수 (봇 인사 1건 포함) */
  turnCount: number;
  /** 직전 봇 발화의 응답키 (forcedKey로 호출된 경우만 알 수 있음) */
  lastBotReplyKey?: QuickReplyKey;
  /** 현재 시각 (기본: new Date()) — 테스트 주입 가능 */
  now?: Date;
};

/**
 * 컨텍스트에 따라 노출할 빠른 칩 리스트 (최대 3~4개) 반환.
 *
 * 우선순위:
 *   - 야간(22:00~01:59)일 때 항상 첫 칩으로 웰빙 chip prepend
 *   - lastBotReplyKey가 있고 후속 정의되어 있으면 그것 사용
 *   - 그 외에는 봇 주도 가이드 수업 흐름칩(개념→예제→퀴즈→다음 개념)
 *
 * `bot` 은 야간 웰빙 분기 등 향후 봇별 분기를 위해 유지(현재 흐름칩은 봇 공통).
 */
export function getDynamicQuickReplies(ctx: DynamicReplyContext): ClassbotQuickPrompt[] {
  const { turnCount, lastBotReplyKey, now = new Date() } = ctx;
  const hour = now.getHours();
  const isLateNight = hour >= 22 || hour <= 1;

  let base: ClassbotQuickPrompt[];

  if (turnCount > 1 && lastBotReplyKey && FOLLOWUPS_BY_REPLY[lastBotReplyKey]) {
    base = FOLLOWUPS_BY_REPLY[lastBotReplyKey]!;
  } else {
    // 대화 시작 — 봇이 이끄는 수업 흐름칩
    base = LESSON_FLOW;
  }

  if (isLateNight) {
    // 야간엔 웰빙 칩 첫 자리 prepend (중복 제거)
    const filtered = base.filter(c => c.text !== WELLBEING_NIGHT_CHIP.text);
    return [WELLBEING_NIGHT_CHIP, ...filtered].slice(0, 4);
  }
  return base.slice(0, 4);
}
