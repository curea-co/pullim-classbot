/**
 * 출제 폼 — 배점 합계 100점 규칙이 발사를 막는지, 문항 편집이 과제에 실리는지.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { AssignmentForm } from '../assignment-form';
import { useAssignmentStore, getQuestionsForAssignment } from '@/lib/store/assignments';

beforeEach(() => {
  useAssignmentStore.setState({ dispatched: [], drafts: [], submissions: [], lastDispatched: null });
});

function fillTitle() {
  fireEvent.change(screen.getByTestId('title-input'), { target: { value: '배점 규칙 확인 과제' } });
}

it('기본 문항 배점 합은 100점이라 제목만 채우면 발사할 수 있다', () => {
  render(<AssignmentForm />);
  fillTitle();
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

it('배점 합계가 100이 아니면 발사를 막고 이유를 보여 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '10' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('90/100점');
});

it('문항 더하기·배점 고르게 나누기로 다시 100점을 맞출 수 있다', () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('question-add')); // 6문항 · 100점 → 배점 0 인 문항 추가
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();

  fireEvent.click(screen.getByTestId('question-even-split'));
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
});

it('발문을 전부 채워 발사하면 그 문항이 학생 풀이에 그대로 쓰인다', () => {
  render(<AssignmentForm />);
  fillTitle();
  // 기본 5문항 중 1문항만 남기고 발문을 채운다
  for (let i = 4; i >= 1; i--) {
    fireEvent.click(screen.getByRole('button', { name: `${i + 1}번 문항 지우기` }));
  }
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '100' } });
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });
  fireEvent.change(screen.getByTestId('question-option-0-0'), { target: { value: '그대로' } });
  fireEvent.change(screen.getByTestId('question-option-0-1'), { target: { value: '오른다' } });
  fireEvent.click(screen.getByTestId('dispatch-btn'));

  const [dispatched] = useAssignmentStore.getState().dispatched;
  expect(dispatched.questions).toHaveLength(1);
  expect(getQuestionsForAssignment(dispatched)[0]).toMatchObject({
    prompt: '얼음이 녹는 동안 온도는?',
    points: 100,
    type: 'mc',
    answerIndex: 0,
  });
});

it('발문을 다 썼는데 자동 채점 문항 정답이 비면 발사를 막고 문항 번호를 알려 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  // 기본 5문항 중 단답 1문항만 남긴다 — 정답키를 비워 둔 상태
  for (let i = 4; i >= 0; i--) {
    if (i === 2) continue; // 3번(단답)만 남긴다
    fireEvent.click(screen.getByRole('button', { name: `${i + 1}번 문항 지우기` }));
  }
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '100' } });
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('1번 문항 정답');

  // 정답을 채우면 발사가 열린다
  fireEvent.change(screen.getByTestId('question-answer-0'), { target: { value: '그대로' } });
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

it('발문을 비워 두면 문항을 싣지 않고 단원 자동 추출로 남긴다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.click(screen.getByTestId('dispatch-btn'));

  const [dispatched] = useAssignmentStore.getState().dispatched;
  expect(dispatched.questions).toBeUndefined();
  // 폴백이 살아 있어 학생 풀이 화면이 비지 않는다
  expect(getQuestionsForAssignment(dispatched).length).toBeGreaterThan(0);
});

/**
 * 문항 수 상한 — 종전 `문항 수` 슬라이더가 걸던 `min 1 / max 연습 50 · 시험 60` 이
 * 문항 목록 편집기로 바뀌면서 사라져 51·61문항이 그대로 발사되던 결함에 대한 회귀.
 */
function addQuestions(times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByTestId('question-add'));
}

it('연습 과제는 50문항이 상한 — 상한에 닿으면 「문항 더하기」가 잠긴다', () => {
  render(<AssignmentForm />);
  addQuestions(45); // 기본 5문항 + 45 = 50
  expect(screen.getByTestId('question-count').textContent).toContain('50/50문항');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

it('시험 과제는 60문항이 상한 — 모드마다 상한이 다르다', () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('mode-exam'));
  expect(screen.getByTestId('question-count').textContent).toContain('5/60문항');

  addQuestions(55); // 5 + 55 = 60
  expect(screen.getByTestId('question-count').textContent).toContain('60/60문항');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

it('시험에서 51문항을 만든 뒤 연습으로 되돌리면 상한 초과라 발사를 막는다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.click(screen.getByTestId('mode-exam'));
  addQuestions(46); // 5 + 46 = 51 — 시험 상한(60) 안이라 여기까지는 열려 있다
  expect(screen.getByTestId('question-add')).not.toBeDisabled();

  fireEvent.click(screen.getByTestId('mode-practice')); // 상한이 50 으로 내려간다
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('연습 과제는 50문항까지예요');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

it('발문을 일부만 쓰면 발사를 막는다 — 쓴 발문이 조용히 버려지지 않게', () => {
  render(<AssignmentForm />);
  fillTitle();
  // 5문항 중 1번만 발문을 채운다 → toAssignmentQuestions 가 null 을 돌려 전부 버려지던 자리
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '기울기를 구하는 식은?' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('발문은 전부 쓰거나 전부 비워야 해요');

  // 다시 비우면(=전부 비움) 단원 자동 추출 경로라 발사가 열린다
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '' } });
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});
