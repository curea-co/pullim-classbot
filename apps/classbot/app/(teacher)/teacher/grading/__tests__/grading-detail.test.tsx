/**
 * 채점 확정 배선 — 상세 화면(승인/수정 후 승인) → store → 채점 큐 반영.
 * 확정이 화면 안에서만 바뀌고 사라지던 결함(로컬 useState)에 대한 회귀.
 */

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { GradingDetail } from '../[id]/grading-detail';
import { GradingQueueList } from '../grading-queue';
import { useGradingStore } from '@/lib/store/grading';
import { gradingQueue, overriddenSample, type GradingItem } from '@/lib/mock';

const item: GradingItem = gradingQueue[0]; // gr_001 — 시드 status 'queue'
const items: GradingItem[] = [...gradingQueue, overriddenSample];

function renderDetail() {
  return render(<GradingDetail item={item} history={[]} prevId={null} nextId={null} />);
}

beforeEach(() => {
  useGradingStore.setState({ decisions: {} });
  localStorage.clear();
});

it('「그대로 승인」 → AI 초안 그대로 확정(kind=approved) + 승인 배지', () => {
  renderDetail();
  fireEvent.click(screen.getByRole('button', { name: '그대로 승인' }));

  const decision = useGradingStore.getState().decisions[item.id];
  expect(decision.kind).toBe('approved');
  expect(decision.finalScore).toBe(item.draftScore);
  expect(decision.comment).toBe(item.draftComment);
  expect(decision.overrideDelta).toBe(0);
  expect(screen.getByText('승인 완료')).toBeTruthy();
  expect(screen.getByRole('button', { name: '그대로 승인' }).hasAttribute('disabled')).toBe(true);
});

it('의견을 고치고 「수정 후 승인」 → 고친 의견과 함께 kind=overridden 으로 확정', () => {
  renderDetail();
  const textarea = screen.getByLabelText('AI 초안 코멘트');
  fireEvent.change(textarea, { target: { value: '표기 오류를 한 번 더 확인해봐요.' } });
  fireEvent.click(screen.getByRole('button', { name: /수정 후 승인/ }));

  const decision = useGradingStore.getState().decisions[item.id];
  expect(decision.kind).toBe('overridden');
  expect(decision.comment).toBe('표기 오류를 한 번 더 확인해봐요.');
  expect(screen.getByText('수정 후 승인 완료')).toBeTruthy();
});

it('다시 열면 확정 상태와 저장한 의견이 그대로 복원된다', () => {
  useGradingStore.getState().approveWithEdit({
    itemId: item.id,
    finalScore: 14,
    maxScore: item.maxScore,
    comment: '저장된 교사 의견',
    rubric: item.rubric.map((r, i) => (i === 0 ? { ...r, score: r.score - 6 } : r)),
    overrideDelta: 15,
  });

  renderDetail();
  const textarea = screen.getByLabelText('AI 초안 코멘트') as HTMLTextAreaElement;
  expect(textarea.value).toBe('저장된 교사 의견');
  expect(textarea.readOnly).toBe(true);
  expect(screen.getByText('수정 후 승인 완료')).toBeTruthy();
  // 확정본은 다시 확정할 수 없다.
  expect(screen.getByRole('button', { name: '그대로 승인' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: /수정 후 승인/ }).hasAttribute('disabled')).toBe(true);
});

it('채점 큐 — 확정한 항목은 「대기」에서 빠지고 「완료」 필터에 나타난다', () => {
  const { rerender } = render(
    <GradingQueueList items={items} statusFilter="queue" typeFilter="all" />,
  );
  expect(screen.getByText(item.studentName)).toBeTruthy();

  act(() => {
    useGradingStore.getState().approve({
      itemId: item.id,
      finalScore: item.draftScore,
      maxScore: item.maxScore,
      comment: item.draftComment,
      rubric: item.rubric,
    });
  });

  rerender(<GradingQueueList items={items} statusFilter="queue" typeFilter="all" />);
  expect(screen.queryByText(item.studentName)).toBeNull();

  cleanup();
  render(<GradingQueueList items={items} statusFilter="approved" typeFilter="all" />);
  // 시드에도 승인 항목이 있으므로 이 학생 행만 집어 상태를 본다.
  const row = screen.getByText(item.studentName).closest('a');
  expect(row?.textContent).toContain('승인됨');
});
