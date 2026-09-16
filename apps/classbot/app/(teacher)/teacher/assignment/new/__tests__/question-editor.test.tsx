/**
 * 출제 화면 문항 편집기 — 배점 합계·채점 방식 배지·저장 변환.
 * 채점 방식은 입력 필드가 아니라 유형에서 파생돼야 한다(gradingModeOf 단일 출처).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import {
  QuestionListEditor, PointsTally, createDefaultQuestions, makeQuestion,
  evenlySplitPoints, sumPoints, gradingTally, withPoints,
  missingAnswerNumbers, missingRubricNumbers, rubricWeightMismatchNumbers,
  hasGradableAnswer, maxQuestionsFor,
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

  it('점수 자동 분배는 합을 정확히 100점으로 맞춘다', () => {
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

  /*
    위 테스트는 **정답 아래 보기를 지우는** 경우(인덱스가 당겨지는 쪽)만 덮었다. 정답 자체를
    지우는 경우가 빈 채로 남아, 옆 보기가 조용히 정답이 되는 동작이 「통과」로 고정돼 있었다.
  */
  it('정답인 보기를 지우면 정답이 옆으로 옮겨가지 않고 풀린다', () => {
    render(<Harness initial={[makeQuestion('mc', 100)]} />);
    // 2번 보기를 정답으로 고른 뒤 **그 2번**을 지운다
    fireEvent.click(screen.getByTestId('question-option-correct-0-1'));
    fireEvent.click(screen.getByRole('button', { name: '1번 문항 2번 보기 지우기' }));
    // 어느 보기도 정답이 아니어야 한다 — 종전에는 3번이던 보기가 정답이 됐다
    for (const el of screen.queryAllByTestId(/^question-option-correct-0-/)) {
      expect((el as HTMLInputElement).checked).toBe(false);
    }
  });
});

describe('서술형 채점 기준 — 빈 채로 나가지 못한다', () => {
  /*
    기본 배점은 **문항 배점에서 파생한다**(spec 14 § 3.1 [M2] · § 3.3.1) — 교사가 배점을 따로
    넣지 않아도 바로 쓸 수 있어야 한다. 빈 기준으로 나가는 것은 표시가 아니라 **검증**이 막는다.
  */
  it('기본 기준 배점은 문항 배점에서 파생한다 — 추가 입력 없이 바로 쓸 수 있다', () => {
    const q = makeQuestion('essay', 20);
    expect(q.rubric.every((c) => c.criterion === '')).toBe(true);
    expect(q.rubric.reduce((n, c) => n + c.weight, 0)).toBe(20);
  });

  it('기준을 한 글자도 안 쓰면 문항 번호를 돌려준다 — 정답 검사는 서술형을 보지 않는다', () => {
    const qs = [{ ...makeQuestion('essay', 100), prompt: '설명하시오' }];
    expect(hasGradableAnswer(qs[0])).toBe(true);      // 정답 검사는 통과시킨다
    expect(missingAnswerNumbers(qs)).toEqual([]);      // 그래서 여기선 안 걸린다
    expect(missingRubricNumbers(qs)).toEqual([1]);     // 이쪽이 잡는다
  });

  it('기준 배점 합이 문항 배점과 다르면 잡는다 — 빨간 글씨에 결과가 있어야 한다', () => {
    const base = makeQuestion('essay', 100);
    const qs = [{ ...base, prompt: '설명하시오', rubric: [{ criterion: '근거', weight: 30 }] }];
    expect(rubricWeightMismatchNumbers(qs)).toEqual([1]);
    const ok = [{ ...base, prompt: '설명하시오', rubric: [{ criterion: '근거', weight: 100 }] }];
    expect(rubricWeightMismatchNumbers(ok)).toEqual([]);
  });

  it('빈 기준은 합 불일치로 중복해 세지 않는다 — 이유 하나에 문구 하나다', () => {
    const qs = [{ ...makeQuestion('essay', 100), prompt: '설명하시오' }];
    expect(rubricWeightMismatchNumbers(qs)).toEqual([]);
  });
});

// 저장 변환(정본 본문 모양)은 `dispatch-body.test.ts` 가 본다 — 종전 `toAssignmentQuestions`(로컬 사본 변환)는 PR 6 에서 걷었다.

describe('missingAnswerNumbers', () => {
  it('발문을 안 채운 과제는 따지지 않는다 — 발문이 비면 폼이 그 이유를 먼저 말한다', () => {
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
