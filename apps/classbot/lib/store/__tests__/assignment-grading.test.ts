/**
 * 자동 채점 — 배점 가중 · 정답 대조 회귀.
 *
 * 이전 결함 3건을 못으로 박아 둔다:
 *  ① 문항 수 균등 배분(배점 무시)
 *  ② 단답을 길이 ≥ 3자로만 보고 0.7점 부여(정답키 미대조)
 *  ③ numeric 이 분기에서 빠져 항상 0점
 */

import { computeMockScore, isQuestionCorrect, getQuestionsForAssignment } from '@/lib/store/assignments';
import { gradingModeOf, type Assignment, type AssignmentQuestion } from '@/lib/mock';

function q(partial: Partial<AssignmentQuestion> & Pick<AssignmentQuestion, 'id' | 'type' | 'points'>): AssignmentQuestion {
  return { assignmentId: 'as_t', order: 1, prompt: '문항', ...partial };
}

describe('gradingModeOf — 유형에서 파생', () => {
  it('mc · short · numeric 은 자동, essay 만 교사 채점', () => {
    expect(gradingModeOf({ type: 'mc' })).toBe('auto');
    expect(gradingModeOf({ type: 'short' })).toBe('auto');
    expect(gradingModeOf({ type: 'numeric' })).toBe('auto');
    expect(gradingModeOf({ type: 'essay' })).toBe('teacher');
  });
});

describe('computeMockScore — 배점 가중', () => {
  it('① 배점이 다르면 점수도 배점을 따른다 (균등 배분 아님)', () => {
    const questions = [
      q({ id: 'a', type: 'mc', points: 70, options: ['x', 'y'], answerIndex: 0 }),
      q({ id: 'b', type: 'mc', points: 30, options: ['x', 'y'], answerIndex: 1 }),
    ];
    // 70점짜리만 정답 → 70점 (문항 수 균등이면 50점이 나왔다)
    expect(computeMockScore(questions, { a: '0', b: '0' })).toBe(70);
    // 30점짜리만 정답 → 30점
    expect(computeMockScore(questions, { a: '1', b: '1' })).toBe(30);
  });

  it('배점이 없는 옛 데이터는 균등 배분으로 폴백', () => {
    const legacy = [
      { id: 'a', assignmentId: 'as_t', order: 1, type: 'mc', prompt: '', options: ['x', 'y'], answerIndex: 0 },
      { id: 'b', assignmentId: 'as_t', order: 2, type: 'mc', prompt: '', options: ['x', 'y'], answerIndex: 0 },
    ] as unknown as AssignmentQuestion[];
    expect(computeMockScore(legacy, { a: '0', b: '1' })).toBe(50);
  });
});

describe('computeMockScore — 단답 정답 대조', () => {
  const questions = [q({ id: 'a', type: 'short', points: 100, answerKey: '증발' })];

  it('② 길이만 긴 오답은 0점 (예전엔 3자 이상이면 0.7점)', () => {
    expect(computeMockScore(questions, { a: '기화 아닌가요' })).toBe(0);
  });

  it('정답이면 만점 — 앞뒤 공백·띄어쓰기 차이는 정답으로 본다', () => {
    expect(computeMockScore(questions, { a: '증발' })).toBe(100);
    expect(computeMockScore(questions, { a: '  증발 ' })).toBe(100);
  });

  it('여러 값 답안도 띄어쓰기 차이를 흡수한다', () => {
    const multi = [q({ id: 'a', type: 'short', points: 100, answerKey: '0, 2' })];
    expect(computeMockScore(multi, { a: '0,2' })).toBe(100);
    expect(computeMockScore(multi, { a: '0, 3' })).toBe(0);
  });

  it('영문 대소문자 차이도 정답으로 본다', () => {
    const en = [q({ id: 'a', type: 'short', points: 100, answerKey: 'Derivative' })];
    expect(computeMockScore(en, { a: 'derivative' })).toBe(100);
  });
});

describe('computeMockScore — numeric', () => {
  const questions = [q({ id: 'a', type: 'numeric', points: 100, answerKey: '33400' })];

  it('③ 정답이면 만점 (예전엔 분기에 없어 항상 0점)', () => {
    expect(computeMockScore(questions, { a: '33400' })).toBe(100);
  });

  it('자릿수 쉼표·소수 표기 차이를 흡수한다', () => {
    expect(computeMockScore(questions, { a: '33,400' })).toBe(100);
    expect(computeMockScore([q({ id: 'a', type: 'numeric', points: 100, answerKey: '2' })], { a: '2.0' })).toBe(100);
  });

  it('값이 다르면 0점', () => {
    expect(computeMockScore(questions, { a: '3340' })).toBe(0);
  });
});

describe('computeMockScore — 자동 채점 대상 밖', () => {
  it('서술형은 분자·분모 모두에서 빠진다 (교사 채점 대상)', () => {
    const questions = [
      q({ id: 'a', type: 'mc', points: 50, options: ['x', 'y'], answerIndex: 0 }),
      q({ id: 'b', type: 'essay', points: 50, rubric: [{ criterion: '근거를 썼어요', weight: 50 }] }),
    ];
    // 자동 문항(50점) 하나를 맞혔으니 자동 채점 구간은 만점
    expect(computeMockScore(questions, { a: '0', b: '길게 쓴 서술 답안' })).toBe(100);
    expect(computeMockScore(questions, { a: '1', b: '길게 쓴 서술 답안' })).toBe(0);
  });

  it('정답키가 비어 판정할 수 없는 문항도 집계에서 빠진다', () => {
    const questions = [
      q({ id: 'a', type: 'mc', points: 50, options: ['x', 'y'], answerIndex: 0 }),
      q({ id: 'b', type: 'short', points: 50 }),
    ];
    expect(computeMockScore(questions, { a: '0', b: '아무 말' })).toBe(100);
  });

  it('자동 채점할 문항이 없으면 0점(미채점)', () => {
    expect(computeMockScore([q({ id: 'b', type: 'essay', points: 100 })], { b: '답안' })).toBe(0);
    expect(computeMockScore([], {})).toBe(0);
  });

  it('무응답은 오답 — 자동 문항 배점만큼 깎인다', () => {
    const questions = [
      q({ id: 'a', type: 'mc', points: 50, options: ['x', 'y'], answerIndex: 0 }),
      q({ id: 'b', type: 'short', points: 50, answerKey: '증발' }),
    ];
    expect(computeMockScore(questions, { a: '0' })).toBe(50);
  });
});

describe('isQuestionCorrect', () => {
  it('교사 채점·판정 불가 문항은 null 로 오답과 구분한다', () => {
    expect(isQuestionCorrect(q({ id: 'a', type: 'essay', points: 10 }), '답안')).toBeNull();
    expect(isQuestionCorrect(q({ id: 'a', type: 'short', points: 10 }), '답안')).toBeNull();
    expect(isQuestionCorrect(q({ id: 'a', type: 'mc', points: 10, options: ['x'] }), '0')).toBeNull();
    expect(isQuestionCorrect(q({ id: 'a', type: 'short', points: 10, answerKey: '증발' }), '기화')).toBe(false);
  });
});

describe('getQuestionsForAssignment — 문항 해석 우선순위', () => {
  const base = {
    id: 'as_user_1', botId: 'cb_001', title: '테스트', scope: '', subject: '', grade: '',
    chapterFrom: '', chapterTo: '', achievementCodes: [], questionCount: 2, difficulty: '중',
    mode: 'practice', source: 'teacher-assigned', assignedBy: '봇', assignedAt: '',
    dueLabel: '', dDay: '오늘', completedCount: 0, state: 'todo', solveHref: '',
  } as unknown as Assignment;

  it('교사가 직접 넣은 문항이 mock 시드보다 우선한다 (order 정렬)', () => {
    const authored = [
      q({ id: 'x2', type: 'short', points: 50, order: 2, answerKey: 'b', prompt: '둘째' }),
      q({ id: 'x1', type: 'mc', points: 50, order: 1, options: ['a'], answerIndex: 0, prompt: '첫째' }),
    ];
    const got = getQuestionsForAssignment({ ...base, questions: authored });
    expect(got.map((item) => item.id)).toEqual(['x1', 'x2']);
  });

  it('문항이 없으면 mode 시드로 폴백한다 (BE 동기화·옛 과제 보호)', () => {
    const got = getQuestionsForAssignment(base);
    expect(got).toHaveLength(2);
    expect(got.every((item) => item.assignmentId === 'as_today')).toBe(true);
  });
});
