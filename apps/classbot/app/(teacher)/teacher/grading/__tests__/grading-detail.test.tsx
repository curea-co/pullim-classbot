/**
 * 채점 확정 배선 — 상세 화면(승인/수정 후 승인) → store → 채점 큐 반영.
 * 확정이 화면 안에서만 바뀌고 사라지던 결함(로컬 useState)에 대한 회귀.
 */

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { GradingDetail } from '../[id]/grading-detail';
import { GradingQueueList } from '../grading-queue';
import { useGradingStore } from '@/lib/store/grading';
import { gradingQueue, overriddenSample, type GradingItem } from '@/lib/mock';
import { gradingStudentName } from '@/lib/mock/classbot-grading-roster';

const item: GradingItem = gradingQueue[0]; // gr_001 — 시드 status 'queue'
const items: GradingItem[] = [...gradingQueue, overriddenSample];
/**
 * 화면에 적히는 이름은 등록 학생 명단 쪽(성 포함)이다 — 채점 시드는 이름만 적혀 있어
 * 학생 목록·상세와 갈린다. spec 11 § 7.1.
 */
const studentName = gradingStudentName(item);

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
  expect(screen.getByText(studentName)).toBeTruthy();

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
  expect(screen.queryByText(studentName)).toBeNull();

  cleanup();
  render(<GradingQueueList items={items} statusFilter="approved" typeFilter="all" />);
  // 시드에도 승인 항목이 있으므로 이 학생 행만 집어 상태를 본다.
  const row = screen.getByText(studentName).closest('a');
  expect(row?.textContent).toContain('승인됨');
});

/** 루브릭 슬라이더는 Base UI 가 숨은 `input[type=range]` 로 렌더한다 — 항목 순서 그대로. */
function rubricSliders(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="range"]'));
}

it('총합은 그대로 두고 항목 배분만 바꿔도 「수정 후 승인」이 열린다', () => {
  const { container } = renderDetail();
  // 시드: 36 / 27 / 14 / 8 = 85. 아직 초안 그대로라 「수정 후 승인」은 잠겨 있다.
  expect(screen.getByRole('button', { name: /수정 후 승인/ }).hasAttribute('disabled')).toBe(true);

  // 1번 −6, 3번 +6 — 총합 85 는 그대로고 배분만 달라진다.
  const sliders = rubricSliders(container);
  fireEvent.change(sliders[0], { target: { value: '30' } });
  fireEvent.change(sliders[2], { target: { value: '20' } });

  // 총합만 비교하던 시절엔 여기서 계속 잠겨 저장할 수 없었다.
  expect(screen.getByRole('button', { name: /수정 후 승인/ }).hasAttribute('disabled')).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: /수정 후 승인/ }));
  const decision = useGradingStore.getState().decisions[item.id];
  expect(decision.kind).toBe('overridden');
  expect(decision.rubric.map((r) => r.score)).toEqual([30, 27, 20, 8]);
  // 총합이 같으니 최종 점수는 초안과 같다 — 바뀐 건 배분뿐이다.
  expect(decision.finalScore).toBe(item.draftScore);
});

it('확정한 뒤에는 루브릭 슬라이더도 잠긴다', () => {
  const { container } = renderDetail();
  expect(rubricSliders(container).every((s) => s.disabled)).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: '그대로 승인' }));

  // 확정 뒤에도 움직이면 슬라이더 안 「최종」과 바깥 최종 점수가 서로 다른 값을 보인다.
  expect(rubricSliders(container).every((s) => s.disabled)).toBe(true);
  expect(screen.getByText(/확정한 채점이라 더 고칠 수 없어요/)).toBeTruthy();
});
