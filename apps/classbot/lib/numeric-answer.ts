/**
 * 수치 답 하나를 읽는 규칙 — **교사가 낸 정답키와 학생이 낸 답이 같은 파서를 지난다.**
 *
 * 정본은 `String(answer).trim() === String(answerKey).trim()` 로 대조한다(`assignment.service.ts` `isCorrect`).
 * 교사 정답은 number(`33400`)로 저장되는데 학생 답이 `"33,400"`·`"2.50"` 문자열 그대로 가면 같은 값이 오답이 된다.
 * 그래서 보내는 쪽 둘(`dispatch-body.ts` · `submit-payload.ts`)이 이 함수 하나로 숫자를 만든다.
 *
 * `'use client'` 를 붙이지 않는다 — 순수 함수다.
 */

/**
 * 쉼표·공백을 떼고 유한한 숫자로 읽는다. 못 읽으면 null(`"둘"`·빈 문자열).
 * @param raw - 입력 그대로
 */
export function parseNumericAnswer(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
