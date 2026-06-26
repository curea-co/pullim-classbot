// 컴파일타임 계약 검증 — 런타임 테스트 아님. `tsc --noEmit` 이 통과/실패로 판정한다.
import type { ReplayQuestion } from './replay';

// 유효한 문항(영어 빈칸 — 문단형 지문, 5지선다)
export const validPassageQ: ReplayQuestion = {
  subjectLabel: '영어 · 빈칸 추론',
  stem: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
  passage: { paragraphs: ['First paragraph.', 'Second paragraph.'] },
  options: ['cheaper', 'faster', 'more frequent', 'more meaningful', 'more public'],
  answerIndex: 3,
  explanation: '...',
};

// 유효한 문항(수학 〈보기〉 — boxed, 5지선다)
export const validBoxedQ: ReplayQuestion = {
  subjectLabel: '수학 · 도함수의 활용',
  stem: '함수 f(x)에 대한 〈보기〉의 설명 중 옳은 것은?',
  boxed: { lines: ['f(x) = x³ − 6x² + 9x + 1', "f'(x) = 3(x−1)(x−3)"] },
  options: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄱ, ㄴ', 'ㄴ, ㄷ'],
  answerIndex: 2,
  explanation: '...',
};

// subjectLabel 은 필수 — 누락 시 타입 에러여야 한다
// @ts-expect-error subjectLabel 누락
export const badMissingLabel: ReplayQuestion = {
  stem: '...',
  options: ['①', '②', '③', '④', '⑤'],
  answerIndex: 0,
  explanation: '...',
};
