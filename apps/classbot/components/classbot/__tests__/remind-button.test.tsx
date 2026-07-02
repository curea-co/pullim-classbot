import { render, screen, fireEvent, act } from '@testing-library/react';
import { RemindButton } from '../remind-button';
import { useInterventionStore } from '@/lib/store/interventions';
import { useAssignmentStore, type Submission } from '@/lib/store/assignments';
import { classRoster } from '@/lib/mock';

const A = { assignmentId: 'as_1', botId: 'cb_001', title: '도함수 마무리' };

const sub = (studentId: string): Submission => ({
  id: `sub_${studentId}`, assignmentId: 'as_1', studentId,
  submittedAt: '2026-07-02T09:00:00Z', answers: {}, scorePercent: 80,
});

beforeEach(() => {
  useInterventionStore.setState({ events: [] });
  useAssignmentStore.setState({ submissions: [] });
});

it('미제출 N명 표시 — 제출자는 카운트에서 빠진다', () => {
  act(() => useAssignmentStore.setState({ submissions: [sub('s1'), sub('s2')] }));
  render(<RemindButton {...A} />);
  const n = classRoster.length - 2;
  expect(screen.getByRole('button', { name: new RegExp(`미제출 ${n}명 리마인드`) })).toBeTruthy();
});

it('클릭 → 미제출 학생별 remind 이벤트(제목 포함 문구) + 버튼 "리마인드 보냄" 비활성', () => {
  act(() => useAssignmentStore.setState({ submissions: [sub('s1')] }));
  render(<RemindButton {...A} />);
  fireEvent.click(screen.getByRole('button', { name: /리마인드/ }));

  const events = useInterventionStore.getState().events;
  expect(events).toHaveLength(classRoster.length - 1);
  expect(events.every((e) => e.type === 'remind' && e.assignmentId === 'as_1')).toBe(true);
  expect(events[0].message).toContain('도함수 마무리');
  expect(events.some((e) => e.studentId === 's1')).toBe(false); // 제출자 제외

  const btn = screen.getByRole('button', { name: /리마인드 보냄/ });
  expect(btn.hasAttribute('disabled')).toBe(true);
});

it('학생 단위 dedup — 이미 받은 학생은 제외하고 새 미제출자에게만 재발송 가능 (Codex #184 R2)', () => {
  // 대상 3명(s3·s4·s5): s3 는 이미 리마인드 수신, s4 는 제출 → 남은 발송 대상은 s5 뿐
  act(() => {
    useAssignmentStore.setState({ submissions: [sub('s4')] });
    useInterventionStore.getState().send({
      type: 'remind', botId: 'cb_001', studentId: 's3', assignmentId: 'as_1', message: 'x',
    });
  });
  render(<RemindButton {...A} targetStudentIds={['s3', 's4', 's5']} />);
  fireEvent.click(screen.getByRole('button', { name: /미제출 1명 리마인드/ }));
  const reminded = useInterventionStore.getState().events.filter((e) => e.type === 'remind');
  expect(reminded.map((e) => e.studentId).sort()).toEqual(['s3', 's5']); // s3 중복 없음
});

it('현재 미제출자 전원이 이미 수신했으면 "리마인드 보냄" 비활성', () => {
  act(() => {
    useAssignmentStore.setState({ submissions: [sub('s4')] });
    for (const id of ['s3', 's5']) {
      useInterventionStore.getState().send({
        type: 'remind', botId: 'cb_001', studentId: id, assignmentId: 'as_1', message: 'x',
      });
    }
  });
  render(<RemindButton {...A} targetStudentIds={['s3', 's4', 's5']} />);
  expect(screen.getByRole('button', { name: /리마인드 보냄/ }).hasAttribute('disabled')).toBe(true);
});

it('부분 대상 과제는 대상 학생만 리마인드한다 (Codex #184)', () => {
  act(() => useAssignmentStore.setState({ submissions: [sub('s3')] }));
  render(<RemindButton {...A} targetStudentIds={['s3', 's4', 's5']} />);
  // 대상 3명 중 s3 제출 → 미제출 2명(s4·s5)만
  fireEvent.click(screen.getByRole('button', { name: /미제출 2명 리마인드/ }));
  const ids = useInterventionStore.getState().events.map((e) => e.studentId).sort();
  expect(ids).toEqual(['s4', 's5']);
});

it('전원 제출이면 렌더하지 않는다', () => {
  act(() => useAssignmentStore.setState({ submissions: classRoster.map((r) => sub(r.id)) }));
  const { container } = render(<RemindButton {...A} />);
  expect(container.firstChild).toBeNull();
});
