/**
 * 빠른 칩(Quick Reply) 동적 추천 — 3종 시나리오.
 * 권위: [04 § 9.6](proc/spec/04-ux-flow.md).
 *
 * 1) 대화 시작 (메시지 0건 또는 봇 첫 인사만 있을 때): 봇 정적 quickPrompts (입문 질문)
 * 2) 마지막 봇 발화 기반: 직전 봇 응답의 ReplyKey → 후속 질문 매핑
 * 3) 시간/상황 기반: 새벽·심야 진입 → 웰빙 칩 prepend
 */

import type { ClassbotQuickPrompt, ReplyKey } from './chat';
import type { ClassBot } from './classbot';

/**
 * ReplyKey별 후속 질문 (봇이 그 주제 응답한 직후 학생이 자주 묻는 후속).
 * 각 ReplyKey는 1~3개의 후속 칩을 정의.
 */
const FOLLOWUPS_BY_REPLY: Partial<Record<ReplyKey, ClassbotQuickPrompt[]>> = {
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
  /** 직전 봇 발화의 ReplyKey (forcedKey로 호출된 경우만 알 수 있음) */
  lastBotReplyKey?: ReplyKey;
  /** 현재 시각 (기본: new Date()) — 테스트 주입 가능 */
  now?: Date;
};

/**
 * 컨텍스트에 따라 노출할 빠른 칩 리스트 (최대 3~4개) 반환.
 *
 * 우선순위:
 *   - 야간(22:00~01:59)일 때 항상 첫 칩으로 웰빙 chip prepend
 *   - lastBotReplyKey가 있고 후속 정의되어 있으면 그것 사용
 *   - 그 외에는 봇 정적 quickPrompts
 */
export function getDynamicQuickReplies(ctx: DynamicReplyContext): ClassbotQuickPrompt[] {
  const { bot, turnCount, lastBotReplyKey, now = new Date() } = ctx;
  const hour = now.getHours();
  const isLateNight = hour >= 22 || hour <= 1;

  let base: ClassbotQuickPrompt[];

  if (turnCount > 1 && lastBotReplyKey && FOLLOWUPS_BY_REPLY[lastBotReplyKey]) {
    base = FOLLOWUPS_BY_REPLY[lastBotReplyKey]!;
  } else {
    // 대화 시작 시 봇 정적 quickPrompts (앞 3개만 — 4번째 "저 잘하고 있는…"은 reassurance와 중복)
    base = bot.quickPrompts.slice(0, 3);
  }

  if (isLateNight) {
    // 야간엔 웰빙 칩 첫 자리 prepend (중복 제거)
    const filtered = base.filter(c => c.text !== WELLBEING_NIGHT_CHIP.text);
    return [WELLBEING_NIGHT_CHIP, ...filtered].slice(0, 4);
  }
  return base.slice(0, 3);
}
