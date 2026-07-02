import { render, screen, fireEvent, act } from '@testing-library/react';
import { SubmissionStatusPanel } from '../submission-status-sheet';
import { useInterventionStore } from '@/lib/store/interventions';
import {
  useAssignmentStore, getQuestionsForAssignment, type Submission,
} from '@/lib/store/assignments';
import type { Assignment } from '@/lib/mock';

// practice 모드 새 과제는 as_today 시드 문항으로 fallback — 오답률 파생이 결정적.
const A = {
  id: 'as_x', botId: 'cb_001', title: '도함수 마무리', mode: 'practice', questionCount: 2,
  subject: '수학Ⅱ', grade: '고2', scope: '도함수', chapterFrom: '', chapterTo: '',
  achievementCodes: [], difficulty: 3, source: 'teacher-assigned', assignedBy: '수학이 형',
  assignedAt: '방금 발사', dueLabel: '오늘 23:59', dDay: '오늘', completedCount: 0, state: 'todo',
} as unknown as Assignment & { targetStudentIds?: string[] };

const questions = () => getQuestionsForAssignment(A);

/** 문항 전부 오답인 답안 */
const allWrong = () =>
  Object.fromEntries(questions().map((q) => [q.id, q.type === 'mc' ? '99' : 'x']));
/** 문항 전부 정답인 답안 */
const allRight = () =>
  Object.fromEntries(
    questions().map((q) => [q.id, q.type === 'mc' ? String(q.answerIndex) : '충분히 긴 서술 답안']),
  );

const sub = (studentId: string, answers: Record<string, string>, score = 50): Submission => ({
  id: `sub_${studentId}`, assignmentId: 'as_x', studentId,
  submittedAt: '2026-07-02T09:00:00Z', answers, scorePercent: score,
});

beforeEach(() => {
  useInterventionStore.setState({ events: [] });
  useAssignmentStore.setState({ submissions: [], dispatched: [] });
});

it('대상 학생별 제출/미제출 상태를 렌더한다', () => {
  act(() => useAssignmentStore.setState({ submissions: [sub('s1', allRight(), 90)] }));
  render(<SubmissionStatusPanel assignment={{ ...A, targetStudentIds: ['s1', 's2'] }} />);
  expect(screen.getByText('서연')).toBeTruthy(); // s1
  expect(screen.getByText('90%')).toBeTruthy(); // 제출 점수
  expect(screen.getByText('미제출')).toBeTruthy(); // s2 민준
});

it('제출자 행 [코멘트] → 입력 → 보내기 → comment 이벤트 발신', () => {
  act(() => useAssignmentStore.setState({ submissions: [sub('s1', allRight(), 90)] }));
  render(<SubmissionStatusPanel assignment={{ ...A, targetStudentIds: ['s1'] }} />);
  fireEvent.click(screen.getByRole('button', { name: /코멘트/ }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '오답 정리 훌륭했어요!' } });
  fireEvent.click(screen.getByRole('button', { name: '보내기' }));

  const events = useInterventionStore.getState().events;
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: 'comment', studentId: 's1', assignmentId: 'as_x', message: '오답 정리 훌륭했어요!',
  });
});

it('오답률 높은 문항 재발사 — 복습 과제 dispatch + 오답자에게 requiz 이벤트', () => {
  // s1 전부 오답(오답률 기여), s2 전부 정답 → 오답 문항 존재, 재발사 대상은 s1 만
  act(() =>
    useAssignmentStore.setState({
      submissions: [sub('s1', allWrong(), 0), sub('s2', allRight(), 100)],
    }),
  );
  render(<SubmissionStatusPanel assignment={{ ...A, targetStudentIds: ['s1', 's2'] }} />);
  fireEvent.click(screen.getByRole('button', { name: /재발사/ }));

  const dispatched = useAssignmentStore.getState().dispatched;
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0].title).toBe('복습: 도함수 마무리');
  expect(dispatched[0].mode).toBe('wrong-conquest');
  expect(dispatched[0].targetStudentIds).toEqual(['s1']); // 오답자만

  const requiz = useInterventionStore.getState().events.filter((e) => e.type === 'requiz');
  expect(requiz).toHaveLength(1);
  expect(requiz[0].studentId).toBe('s1');
  expect(requiz[0].assignmentId).toBe(dispatched[0].id); // 새 과제로 딥링크
});

it('제출이 없으면 재발사 버튼 미노출', () => {
  render(<SubmissionStatusPanel assignment={{ ...A, targetStudentIds: ['s1'] }} />);
  expect(screen.queryByRole('button', { name: /재발사/ })).toBeNull();
});
