/**
 * 출제 화면의 문항(`DraftQuestion`) → 정본 본문의 문항(`DispatchAssignmentQuestionBody`).
 *
 * 2026-09-16 계획 §05 R6 「본문에 `questions[]` 를 실어 `assignment_questions` 까지 한 트랜잭션. FE 가 지금
 * 안 보내고 있을 뿐」— 그 「안 보내고 있던」 자리가 이 파일이다. 규칙은 서버 검증(`assertAnswerKeyValid`)을
 * 그대로 따른다:
 *  - **발문은 전부 있어야 한다.** 종전의 「전부 비우면 단원 RAG 자동 추출」 규약은 정본에 없다 — 정본은
 *    `questions` 최소 1개, 각 `prompt` 비어 있지 않음을 요구한다. 시드 문항 폴백도 함께 걷었다.
 *  - `mc`: 빈 보기는 버리되 정답은 **글자**로 따라간다(인덱스가 밀려 오답이 되지 않게). `answerKey` 는 number.
 *  - `numeric`: `answerKey` 는 유한한 number — 문자열이면 서버가 400 이라 `invalidNumericAnswerNumbers` 가 먼저 막는다.
 *  - `short`: `answerKey` 는 공백을 뗀 문자열.
 *  - `essay`: `answerKey` 없음. **배점·채점 기준(루브릭)은 정본에 칸이 없어 싣지 못한다** — 편집기의 배점은
 *    화면 안 규칙(합 100)으로만 남고, 서버 채점은 자동 채점 문항을 균등하게 센다(`computeScore`).
 *
 * `'use client'` 를 붙이지 않는다 — 순수 변환이라 테스트가 그대로 부른다.
 */

import type { DispatchAssignmentQuestionBody } from '@/lib/api/classbot-dto';
import { parseNumericAnswer } from '@/lib/numeric-answer';
import type { DraftQuestion } from './question-editor';

// 학생 제출(`submit-payload.ts`)과 **같은 파서**다 — 정답과 답이 다른 규칙으로 숫자가 되면 같은 값이 오답이 된다.
export { parseNumericAnswer };

/**
 * 수치 문항인데 정답이 숫자로 읽히지 않는 문항 번호(1-based) — 내기를 막는 근거.
 * 정답이 비어 있는 것은 `missingAnswerNumbers` 가 따로 말하므로 여기서는 **적혀 있는데 숫자가 아닌 것**만 센다.
 */
export function invalidNumericAnswerNumbers(questions: DraftQuestion[]): number[] {
  return questions.flatMap((q, i) => {
    if (q.type !== 'numeric') return [];
    const key = q.answerKey.trim();
    if (key === '') return [];
    return parseNumericAnswer(key) === null ? [i + 1] : [];
  });
}

/**
 * 편집 중 문항 전부 → 정본 문항 배열. 발문·정답 검증은 폼이 먼저 한다(`questionBlockedReason`) —
 * 여기서는 모양만 옮기고, 검증을 우회해 들어온 빈 정답은 **싣지 않는다**(0번 보기를 정답으로 둔갑시키지 않는다).
 * @param questions - 출제 화면의 문항
 * @returns 정본 본문의 `questions`
 */
export function toDispatchQuestions(questions: DraftQuestion[]): DispatchAssignmentQuestionBody[] {
  return questions.map((q, i) => {
    const base: DispatchAssignmentQuestionBody = {
      order: i,
      type: q.type,
      prompt: q.prompt.trim(),
    };
    if (q.type === 'mc') {
      const trimmed = q.options.map((o) => o.trim());
      const answerText = trimmed[q.answerIndex] ?? '';
      const options = trimmed.filter((o) => o.length > 0);
      base.options = options;
      const answerIndex = answerText.length > 0 ? options.indexOf(answerText) : -1;
      if (answerIndex >= 0) base.answerKey = answerIndex;
      return base;
    }
    if (q.type === 'short') {
      const key = q.answerKey.trim();
      if (key) base.answerKey = key;
      return base;
    }
    if (q.type === 'numeric') {
      const n = parseNumericAnswer(q.answerKey);
      if (n !== null) base.answerKey = n;
      return base;
    }
    return base;
  });
}
