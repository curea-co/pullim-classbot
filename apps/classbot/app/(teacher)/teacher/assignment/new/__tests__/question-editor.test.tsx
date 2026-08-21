/**
 * 출제 화면 문항 편집기 — 배점 합계·채점 방식 배지·저장 변환.
 * 채점 방식은 입력 필드가 아니라 유형에서 파생돼야 한다(gradingModeOf 단일 출처).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import {
  QuestionListEditor, PointsTally, createDefaultQuestions, makeQuestion,
  evenlySplitPoints, sumPoints, gradingTally, toAssignmentQuestions, withPoints,
  missingAnswerNumbers, isPartiallyAuthored, maxQuestionsFor,
  MAX_QUESTIONS_EXAM, MAX_QUESTIONS_DEFAULT, TOTAL_POINTS, type DraftQuestion,
} from '../question-editor';

function Harness({ initial }: { initial: DraftQuestion[] }) {
  const [questions, setQuestions] = useState(initial);
  return (
    <>
      <PointsTally questions={questions} />
      <QuestionListEditor questions={questions} onChange={setQuestions} />
    </>
  );
}

describe('기본 문항', () => {
  it('첫 진입 문항 배점 합은 100점', () => {
    expect(sumPoints(createDefaultQuestions())).toBe(TOTAL_POINTS);
  });

  it('배점 고르게 나누기는 합을 정확히 100점으로 맞춘다', () => {
    const three = [makeQuestion('mc', 0), makeQuestion('short', 0), makeQuestion('essay', 0)];
    expect(sumPoints(evenlySplitPoints(three))).toBe(TOTAL_POINTS); // 34 + 33 + 33
    const seven = Array.from({ length: 7 }, () => makeQuestion('mc', 0));
    expect(sumPoints(evenlySplitPoints(seven))).toBe(TOTAL_POINTS);
  });

  it('서술형 배점을 바꾸면 채점 기준 가중치 합도 따라 맞춰진다', () => {
    const essay = withPoints(makeQuestion('essay', 20), 30);
    expect(essay.rubric.reduce((s, c) => s + c.weight, 0)).toBe(30);
  });

  it('채점 방식 집계는 유형에서만 갈린다', () => {
    const tally = gradingTally([makeQuestion('mc', 20), makeQuestion('numeric', 30), makeQuestion('essay', 50)]);
    expect(tally.auto).toEqual({ count: 2, points: 50 });
    expect(tally.teacher).toEqual({ count: 1, points: 50 });
  });
});

describe('QuestionListEditor', () => {
  it('유형을 서술형으로 바꾸면 채점 방식 배지가 바뀐다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    expect(screen.getByTestId('question-grading-0').textContent).toContain('자동 채점');

    fireEvent.change(screen.getByTestId('question-type-0'), { target: { value: 'essay' } });
    expect(screen.getByTestId('question-grading-0').textContent).toContain('선생님이 채점');

    fireEvent.change(screen.getByTestId('question-type-0'), { target: { value: 'numeric' } });
    expect(screen.getByTestId('question-grading-0').textContent).toContain('자동 채점');
  });

  it('배점을 고치면 상단 합계가 실시간으로 따라오고 모자란 만큼 알린다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    expect(screen.getByTestId('points-tally').textContent).toContain('100점에 딱 맞아요');

    fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '80' } });
    const tally = screen.getByTestId('points-tally');
    expect(tally.textContent).toContain('20점 모자라요');
  });

  it('배점이 100점을 넘으면 넘은 만큼 알린다', () => {
    render(<Harness initial={[makeQuestion('mc', 100), makeQuestion('short', 0)]} />);
    fireEvent.change(screen.getByTestId('question-points-1'), { target: { value: '20' } });
    expect(screen.getByTestId('points-tally').textContent).toContain('20점 넘었어요');
  });

  it('한 문항 배점은 0~100 밖으로 나가지 않는다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '120' } });
    expect((screen.getByTestId('question-points-0') as HTMLInputElement).value).toBe('100');
    fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '-5' } });
    expect((screen.getByTestId('question-points-0') as HTMLInputElement).value).toBe('0');
  });

  it('문항이 하나면 지우기 버튼이 잠긴다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    expect(screen.getByRole('button', { name: '1번 문항 지우기' })).toBeDisabled();
  });

  it('객관식 보기를 지우면 정답 표시가 따라 이동한다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    // 2번 보기를 정답으로 → 1번 보기 삭제 → 정답은 여전히 같은 보기(이제 1번)
    fireEvent.click(screen.getByTestId('question-option-correct-0-1'));
    fireEvent.click(screen.getByRole('button', { name: '1번 문항 1번 보기 지우기' }));
    expect((screen.getByTestId('question-option-correct-0-0') as HTMLInputElement).checked).toBe(true);
  });
});

describe('toAssignmentQuestions', () => {
  it('발문이 하나라도 비면 null — 단원 RAG 자동 추출 규약을 유지한다', () => {
    const drafts = createDefaultQuestions();
    expect(toAssignmentQuestions('as_user_1', drafts)).toBeNull();

    const partly = drafts.map((q, i) => (i === 0 ? { ...q, prompt: '첫 문항' } : q));
    expect(toAssignmentQuestions('as_user_1', partly)).toBeNull();
  });

  it('전부 채우면 배점·정답·채점 기준을 그대로 실어 보낸다', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('mc', 40), prompt: '객관식', options: ['가', '', '나', '다'], answerIndex: 2 },
      { ...makeQuestion('numeric', 30), prompt: '수치', answerKey: ' 33400 ' },
      {
        ...makeQuestion('essay', 30),
        prompt: '서술',
        rubric: [{ criterion: '근거를 썼어요', weight: 20 }, { criterion: '', weight: 10 }],
      },
    ];
    const questions = toAssignmentQuestions('as_user_1', drafts)!;

    expect(questions).toHaveLength(3);
    expect(questions.map((q) => q.points)).toEqual([40, 30, 30]);
    expect(questions[0].id).toBe('as_user_1_q1');
    // 빈 보기는 버리고 정답은 텍스트를 따라간다 ('나' = 새 인덱스 1)
    expect(questions[0].options).toEqual(['가', '나', '다']);
    expect(questions[0].answerIndex).toBe(1);
    expect(questions[1].answerKey).toBe('33400');
    // 문구를 비운 기준은 저장하지 않는다
    expect(questions[2].rubric).toEqual([{ criterion: '근거를 썼어요', weight: 20 }]);
  });

  it('고른 정답 보기가 비어 있으면 정답을 싣지 않는다 — 0번으로 되돌리지 않는다', () => {
    const drafts: DraftQuestion[] = [
      // 3번 보기(비어 있음)를 정답으로 골라 둔 상태
      { ...makeQuestion('mc', 100), prompt: '객관식', options: ['가', '나', '', ''], answerIndex: 2 },
    ];
    const questions = toAssignmentQuestions('as_user_1', drafts)!;

    expect(questions[0].options).toEqual(['가', '나']);
    // '가'가 정답으로 둔갑하면 안 된다 — 자동 채점 진실값이 조용히 뒤바뀐다
    expect(questions[0].answerIndex).toBeUndefined();
  });
});

describe('missingAnswerNumbers', () => {
  it('발문을 안 채운 과제는 따지지 않는다 — 단원 RAG 자동 추출 규약', () => {
    expect(missingAnswerNumbers(createDefaultQuestions())).toEqual([]);
    expect(missingAnswerNumbers([])).toEqual([]);
  });

  it('정답을 안 정한 자동 채점 문항 번호를 집어낸다', () => {
    const drafts: DraftQuestion[] = [
      // 1번: 고른 보기가 비었다
      { ...makeQuestion('mc', 25), prompt: '객관식', options: ['가', '나', '', ''], answerIndex: 2 },
      // 2번: 정답키가 비었다
      { ...makeQuestion('short', 25), prompt: '단답', answerKey: '  ' },
      // 3번: 수치 정답키가 비었다
      { ...makeQuestion('numeric', 25), prompt: '수치', answerKey: '' },
      // 4번: 서술형은 선생님이 채점하므로 정답키가 없어도 된다
      { ...makeQuestion('essay', 25), prompt: '서술' },
    ];
    expect(missingAnswerNumbers(drafts)).toEqual([1, 2, 3]);
  });

  it('남은 보기가 둘 미만인 객관식도 막는다', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('mc', 100), prompt: '객관식', options: ['가', '', '', ''], answerIndex: 0 },
    ];
    expect(missingAnswerNumbers(drafts)).toEqual([1]);
  });

  it('정답을 다 정하면 빈 배열', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('mc', 50), prompt: '객관식', options: ['가', '나', '', ''], answerIndex: 1 },
      { ...makeQuestion('numeric', 50), prompt: '수치', answerKey: '33400' },
    ];
    expect(missingAnswerNumbers(drafts)).toEqual([]);
  });
});

describe('문항 수 상한 (spec 14 §5.1)', () => {
  it('시험은 60, 연습·오답정복은 50', () => {
    expect(maxQuestionsFor('exam')).toBe(MAX_QUESTIONS_EXAM);
    expect(maxQuestionsFor('practice')).toBe(MAX_QUESTIONS_DEFAULT);
    expect(maxQuestionsFor('wrong-conquest')).toBe(MAX_QUESTIONS_DEFAULT);
    expect(MAX_QUESTIONS_EXAM).toBe(60);
    expect(MAX_QUESTIONS_DEFAULT).toBe(50);
  });
});

describe('발문 부분 작성', () => {
  const authored = { ...makeQuestion('mc', 50), prompt: '쓴 발문' };
  const blank = makeQuestion('short', 50);

  it('일부만 쓴 상태를 잡아낸다 — 이 상태로 발사하면 쓴 발문이 버려진다', () => {
    expect(isPartiallyAuthored([authored, blank])).toBe(true);
    // 실제로 버려지는지도 함께 고정한다
    expect(toAssignmentQuestions('a1', [authored, blank])).toBeNull();
  });

  it('전부 쓰거나 전부 비운 상태는 부분 작성이 아니다', () => {
    expect(isPartiallyAuthored([authored, { ...blank, prompt: '이것도 씀' }])).toBe(false);
    expect(isPartiallyAuthored([blank, blank])).toBe(false);
    expect(isPartiallyAuthored([])).toBe(false);
  });
});
