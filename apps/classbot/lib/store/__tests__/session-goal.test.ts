import { renderHook } from '@testing-library/react';
import { useSessionGoalStore, useSessionProgress } from '../session-goal';

const K = 'student_001::cb_001';

beforeEach(() => useSessionGoalStore.setState({ progress: {} }));

it('mark is idempotent per step', () => {
  const s = () => useSessionGoalStore.getState();
  s().mark(K, 'concept');
  const after1 = s().progress[K];
  s().mark(K, 'concept'); // no-op (idempotent → same ref)
  expect(s().progress[K]).toBe(after1);
  s().mark(K, 'quiz');
  expect(s().progress[K]).toMatchObject({ concept: true, example: false, quiz: true, goalDone: false });
});

it('keys are isolated', () => {
  const s = () => useSessionGoalStore.getState();
  s().mark(K, 'concept');
  s().mark('student_002::cb_001', 'example');
  expect(s().progress[K]).toMatchObject({ concept: true, example: false });
  expect(s().progress['student_002::cb_001']).toMatchObject({ concept: false, example: true });
});

it('useSessionProgress defaults to all-false for missing key', () => {
  const { result } = renderHook(() => useSessionProgress('nope::nope'));
  expect(result.current).toEqual({ concept: false, example: false, quiz: false, goalDone: false });
});

it('setGoalDone and reset', () => {
  const s = () => useSessionGoalStore.getState();
  s().mark(K, 'concept');
  s().setGoalDone(K, true);
  expect(s().progress[K].goalDone).toBe(true);
  s().reset(K);
  expect(s().progress[K]).toBeUndefined();
});

it('persist name is pullim-session-goal', () => {
  expect(useSessionGoalStore.persist.getOptions().name).toBe('pullim-session-goal');
});
