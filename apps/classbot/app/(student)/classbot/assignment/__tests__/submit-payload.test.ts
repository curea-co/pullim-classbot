/**
 * 화면 답 → 정본 제출 본문 — 교사 정답키와 **같은 모양**으로 가는지. 서버 대조가 문자열 같음이라
 * `"33,400"` 을 그대로 보내면 `33400` 정답과 어긋난다(리뷰 S1).
 */
import { toSubmitPayload } from '../submit-payload';

const QUESTIONS = [
  { id: 'q_mc', type: 'mc' as const },
  { id: 'q_num', type: 'numeric' as const },
  { id: 'q_short', type: 'short' as const },
  { id: 'q_essay', type: 'essay' as const },
];

it('객관식은 인덱스 number, 수치는 교사 정답키와 같은 파서로 number, 나머지는 공백을 뗀 문자열', () => {
  expect(
    toSubmitPayload(QUESTIONS, { q_mc: '1', q_num: ' 33,400 ', q_short: ' 증발 ', q_essay: '근거는 …' }),
  ).toEqual({ q_mc: 1, q_num: 33400, q_short: '증발', q_essay: '근거는 …' });
});

it('「2.50」·「2.5」는 같은 수치로 간다 — 표기 차이가 정오를 가르지 않는다', () => {
  expect(toSubmitPayload(QUESTIONS, { q_num: '2.50' }).q_num).toBe(2.5);
  expect(toSubmitPayload(QUESTIONS, { q_num: '2.5' }).q_num).toBe(2.5);
});

it('숫자로 못 읽는 수치 답은 학생이 쓴 글자 그대로 간다 — 지우지 않고 서버가 오답으로 센다', () => {
  expect(toSubmitPayload(QUESTIONS, { q_num: '둘' }).q_num).toBe('둘');
});

it('빈 답·공백만인 답은 싣지 않는다 — 서버가 미응답을 오답으로 센다', () => {
  expect(toSubmitPayload(QUESTIONS, { q_mc: '', q_num: '   ', q_short: '답' })).toEqual({ q_short: '답' });
});

it('문항에 없는 키는 무시한다', () => {
  expect(toSubmitPayload(QUESTIONS, { q_ghost: '1' })).toEqual({});
});
