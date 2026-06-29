import { renderHook } from '@testing-library/react';
import { useSessionGoalStore, useSessionProgress } from '../session-goal';
import { todayKey } from '../today-key';

// 키는 호출부에서 `${userId}::${botId}::${YYYY-MM-DD}` 로 조립한다(날짜 스코프 → 매일 자연 reset).
const T = todayKey();
const K = `student_001::cb_001::${T}`;

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

it('keys are isolated per user', () => {
  const s = () => useSessionGoalStore.getState();
  s().mark(K, 'concept');
  const other = `student_002::cb_001::${T}`;
  s().mark(other, 'example');
  expect(s().progress[K]).toMatchObject({ concept: true, example: false });
  expect(s().progress[other]).toMatchObject({ concept: false, example: true });
});

it('different-day key is isolated (오늘 키는 어제 달성과 섞이지 않음)', () => {
  const s = () => useSessionGoalStore.getState();
  // 어제 키가 이미 채워져 있어도 오늘 키는 비어 있는 상태로 시작
  const yesterday = 'student_001::cb_001::2000-01-01';
  s().mark(yesterday, 'concept');
  s().mark(yesterday, 'example');
  s().mark(K, 'quiz');
  expect(s().progress[K]).toMatchObject({ concept: false, example: false, quiz: true });
  expect(s().progress[yesterday]).toMatchObject({ concept: true, example: true, quiz: false });
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
