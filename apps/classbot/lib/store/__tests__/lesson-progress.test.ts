import { renderHook } from '@testing-library/react';
import {
  useLessonProgressStore,
  useLessonProgress,
  resolveProgress,
  PHASE_ORDER,
} from '../lesson-progress';
import { todayKey } from '../today-key';

const U = 'student_001';
const B = 'cb_001';
const T = todayKey();

beforeEach(() => useLessonProgressStore.setState({ visited: {} }));

it('markPhase pushes once (dedup) and isolates per user×bot×day', () => {
  const s = () => useLessonProgressStore.getState();
  s().markPhase(U, B, 'concept');
  s().markPhase(U, B, 'concept'); // dup ignored
  s().markPhase(U, B, 'example');
  // 키는 날짜 스코프 — 오늘 키 아래에 쌓인다
  expect(s().visited[`${U}:${B}:${T}`]).toEqual(['concept', 'example']);
  // 다른 봇 / 다른 유저는 격리
  s().markPhase(U, 'cb_002', 'quiz');
  s().markPhase('student_002', B, 'summary');
  expect(s().visited[`${U}:${B}:${T}`]).toEqual(['concept', 'example']);
  expect(s().visited[`${U}:cb_002:${T}`]).toEqual(['quiz']);
  expect(s().visited[`student_002:${B}:${T}`]).toEqual(['summary']);
});

it('different-day key is isolated (오늘 키와 다른 날짜 키는 섞이지 않음)', () => {
  const s = () => useLessonProgressStore.getState();
  s().markPhase(U, B, 'concept');
  // 어제 키를 직접 심어 두어도 오늘 selector/마킹과 섞이지 않는다
  const yesterdayKey = `${U}:${B}:2000-01-01`;
  useLessonProgressStore.setState((st) => ({
    visited: { ...st.visited, [yesterdayKey]: ['concept', 'example', 'quiz', 'summary'] },
  }));
  s().markPhase(U, B, 'example');
  expect(s().visited[`${U}:${B}:${T}`]).toEqual(['concept', 'example']);
  expect(s().visited[yesterdayKey]).toEqual(['concept', 'example', 'quiz', 'summary']);
});

it('current = PHASE_ORDER 최후미 방문 위상 (빈 → concept 폴백)', () => {
  expect(resolveProgress(undefined).current).toBe('concept');
  expect(resolveProgress([]).current).toBe('concept');
  // 순서 무관하게 PHASE_ORDER 기준 최후미
  expect(resolveProgress(['quiz', 'concept']).current).toBe('quiz');
  expect(resolveProgress(['concept', 'example', 'summary']).current).toBe('summary');
});

it('PHASE_ORDER is the 4-step lesson order', () => {
  expect(PHASE_ORDER).toEqual(['concept', 'example', 'quiz', 'summary']);
});

it('useLessonProgress selector reflects the store', () => {
  const { result, rerender } = renderHook(() => useLessonProgress(U, B));
  expect(result.current).toEqual({ visited: [], current: 'concept' });
  useLessonProgressStore.getState().markPhase(U, B, 'concept');
  useLessonProgressStore.getState().markPhase(U, B, 'example');
  rerender();
  expect(result.current).toEqual({ visited: ['concept', 'example'], current: 'example' });
});

it('reset clears only the target user×bot×day key', () => {
  const s = () => useLessonProgressStore.getState();
  s().markPhase(U, B, 'concept');
  s().markPhase(U, 'cb_002', 'quiz');
  s().reset(U, B);
  expect(s().visited[`${U}:${B}:${T}`]).toBeUndefined();
  expect(s().visited[`${U}:cb_002:${T}`]).toEqual(['quiz']);
});

it('persist name is pullim-lesson-progress', () => {
  expect(useLessonProgressStore.persist.getOptions().name).toBe('pullim-lesson-progress');
});
