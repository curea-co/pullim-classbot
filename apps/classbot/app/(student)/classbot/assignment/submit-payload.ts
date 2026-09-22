/**
 * 화면의 답(전부 문자열) → 정본 제출 본문(`SubmitAssignmentDto.answers`).
 *
 * 정본 대조는 `String(answer).trim() === String(answerKey).trim()` 이다(`assignment.service.ts` `isCorrect`).
 * 그래서 **교사 정답키가 지난 것과 같은 모양**으로 보내야 맞은 답이 맞은 답으로 센다:
 *  - `mc` — 고른 보기 **인덱스(number)**. 교사 정답키도 인덱스다(`dispatch-body.ts`).
 *  - `numeric` — `parseNumericAnswer` 로 **number**. 교사 정답은 `33400` 인데 학생이 `"33,400"` 을 그대로 보내면
 *    `"33,400" !== "33400"` 으로 오답이 된다 — 같은 파서를 지나 `33400` 이 된다. 숫자로 못 읽으면 문자열 그대로
 *    (서버가 오답으로 센다 — 학생이 쓴 것을 지우지는 않는다).
 *  - `short`·`essay` — 공백을 뗀 문자열.
 * 빈 답은 싣지 않는다 — 서버가 미응답을 오답으로 센다(`answers[q.id]` undefined → false).
 *
 * `'use client'` 를 붙이지 않는다 — 순수 변환이라 테스트가 그대로 부른다.
 */

import type { AssignmentQuestion } from '@/lib/mock';
import { parseNumericAnswer } from '@/lib/numeric-answer';

/** 정본이 받는 값 — 인덱스·숫자·문장. */
export type SubmitAnswer = number | string;

/**
 * @param questions - 풀이 화면이 든 문항(유형을 안다)
 * @param answers - 문항 id → 화면 문자열
 * @returns 정본 본문의 `answers`
 */
export function toSubmitPayload(
  questions: readonly Pick<AssignmentQuestion, 'id' | 'type'>[],
  answers: Readonly<Record<string, string>>,
): Record<string, SubmitAnswer> {
  const payload: Record<string, SubmitAnswer> = {};
  for (const q of questions) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed === '') continue;
    if (q.type === 'mc') {
      payload[q.id] = Number(trimmed);
    } else if (q.type === 'numeric') {
      payload[q.id] = parseNumericAnswer(trimmed) ?? trimmed;
    } else {
      payload[q.id] = trimmed;
    }
  }
  return payload;
}
