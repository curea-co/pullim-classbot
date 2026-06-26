// 컴파일타임 계약 검증 — 런타임 테스트 아님. `tsc --noEmit` 이 통과/실패로 판정한다.
import type { QgenQuizRequest, GeneratedQuestion, QgenQuizResponse, ReplayRequizResponse } from './qgen';

// 유효한 요청(성취기준 기반)
export const validReq: QgenQuizRequest = {
  achievementStandardId: '9수03-01',
  difficulty: 3,
  count: 5,
  format: 'structured',
};

// 유효한 요청(좌표 기반 + seed)
export const validReqByCoords: QgenQuizRequest = {
  subjectCoords: { subjectId: 'math', unitId: 'u-3' },
  difficulty: 2,
  count: 3,
  format: 'structured',
  seedExampleId: 'q-42',
};

// 유효한 문항
export const validQ: GeneratedQuestion = {
  stem: '다음 중 옳은 것은?',
  choices: ['1', '2', '3', '4'],
  answerIndex: 2,
  rationale: '...',
  sourceStandardId: '9수03-01',
};

// 유효한 응답
export const validResp: QgenQuizResponse = { questions: [validQ] };

// format 은 리터럴 'structured' 만 허용 — 잘못된 값은 타입 에러여야 한다
// @ts-expect-error format 은 'structured' 리터럴
export const badFormat: QgenQuizRequest = { difficulty: 1, count: 1, format: 'freeform' };

// 유효한 재응시 응답(정상 생성)
export const validRequiz: ReplayRequizResponse = {
  replayId: 'r-1',
  attemptId: 'a-1',
  questions: [validQ],
  degraded: false,
  generatedAt: '2026-06-26T00:00:00.000Z',
};

// degraded 폴백(mock 으로 대체된 경우)도 동일 형태
export const degradedRequiz: ReplayRequizResponse = {
  replayId: 'r-1',
  attemptId: 'a-2',
  questions: [validQ],
  degraded: true,
  generatedAt: '2026-06-26T00:00:00.000Z',
};
