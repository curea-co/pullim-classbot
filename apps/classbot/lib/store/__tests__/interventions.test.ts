import { act, renderHook } from '@testing-library/react';
import {
  useInterventionStore,
  useMyInterventions,
  useUnreadCount,
  useAssignmentComment,
  useRemindedStudentIds,
} from '../interventions';

const base = { botId: 'cb_001', studentId: 's1' } as const;

beforeEach(() => useInterventionStore.setState({ events: [] }));

it('send — id/createdAt 자동 부여, readAt=null 로 쌓인다', () => {
  act(() => {
    useInterventionStore.getState().send({
      ...base, type: 'remind', assignmentId: 'as_1', message: "'도함수' 과제가 아직 제출 전이에요",
    });
  });
  const [e] = useInterventionStore.getState().events;
  expect(e.id).toBeTruthy();
  expect(e.createdAt).toBeTruthy();
  expect(e.readAt).toBeNull();
  expect(e.type).toBe('remind');
});

it('markRead — readAt 이 채워진다(멱등)', () => {
  act(() => useInterventionStore.getState().send({ ...base, type: 'crisis', message: '힘내!' }));
  const id = useInterventionStore.getState().events[0].id;
  act(() => useInterventionStore.getState().markRead(id));
  const read = useInterventionStore.getState().events[0].readAt;
  expect(read).toBeTruthy();
  act(() => useInterventionStore.getState().markRead(id)); // 멱등
  expect(useInterventionStore.getState().events[0].readAt).toBe(read);
});

it('useMyInterventions — 내 것만 최신순, 타 학생 제외', () => {
  act(() => {
    useInterventionStore.getState().send({ ...base, type: 'remind', assignmentId: 'as_1', message: 'a' });
    useInterventionStore.getState().send({ ...base, type: 'comment', assignmentId: 'as_1', message: 'b' });
    useInterventionStore.getState().send({ botId: 'cb_001', studentId: 's2', type: 'remind', assignmentId: 'as_1', message: 'x' });
  });
  const { result } = renderHook(() => useMyInterventions('s1'));
  expect(result.current).toHaveLength(2);
  expect(result.current[0].message).toBe('b'); // 최신 먼저
});

it('useUnreadCount — 읽으면 줄어든다', () => {
  act(() => {
    useInterventionStore.getState().send({ ...base, type: 'remind', assignmentId: 'as_1', message: 'a' });
    useInterventionStore.getState().send({ ...base, type: 'crisis', message: 'b' });
  });
  expect(renderHook(() => useUnreadCount('s1')).result.current).toBe(2);
  act(() => useInterventionStore.getState().markRead(useInterventionStore.getState().events[0].id));
  expect(renderHook(() => useUnreadCount('s1')).result.current).toBe(1);
});

it('useAssignmentComment — 해당 과제·학생의 comment 최신 1건, 없으면 null', () => {
  expect(renderHook(() => useAssignmentComment('as_1', 's1')).result.current).toBeNull();
  act(() => {
    useInterventionStore.getState().send({ ...base, type: 'comment', assignmentId: 'as_1', message: '첫' });
    useInterventionStore.getState().send({ ...base, type: 'comment', assignmentId: 'as_1', message: '최신' });
    useInterventionStore.getState().send({ ...base, type: 'remind', assignmentId: 'as_1', message: '리마인드' });
  });
  expect(renderHook(() => useAssignmentComment('as_1', 's1')).result.current?.message).toBe('최신');
  expect(renderHook(() => useAssignmentComment('as_2', 's1')).result.current).toBeNull();
});

it('useRemindedStudentIds — 과제별 remind 수신 학생 집합(학생 단위 dedup, Codex #184 R2)', () => {
  expect(renderHook(() => useRemindedStudentIds('as_1')).result.current.size).toBe(0);
  act(() => {
    useInterventionStore.getState().send({ ...base, type: 'remind', assignmentId: 'as_1', message: 'a' });
    useInterventionStore.getState().send({ botId: 'cb_001', studentId: 's2', type: 'remind', assignmentId: 'as_1', message: 'a' });
    useInterventionStore.getState().send({ ...base, type: 'comment', assignmentId: 'as_1', message: 'c' }); // remind 아님
  });
  const set = renderHook(() => useRemindedStudentIds('as_1')).result.current;
  expect([...set].sort()).toEqual(['s1', 's2']);
  expect(renderHook(() => useRemindedStudentIds('as_2')).result.current.size).toBe(0);
});
