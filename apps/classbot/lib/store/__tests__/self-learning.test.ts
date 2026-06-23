import { renderHook, act } from '@testing-library/react';
import { useSelfLearningStore, useIsEnrolled, useEnrolledTutors, useGoals, useIsGoal, useStreak, useUnitProgress } from '../self-learning';
import { officialTutors } from '@/lib/mock/classbot-official';

const A = officialTutors[0].id;
beforeEach(() => useSelfLearningStore.setState({ enrollments: [], goals: [], streak: { count: 0, lastStudyDate: null } }));

it('enroll adds once (idempotent) and unenroll removes', () => {
  act(() => { useSelfLearningStore.getState().enroll(A); useSelfLearningStore.getState().enroll(A); });
  expect(useSelfLearningStore.getState().enrollments.filter(e => e.tutorId === A)).toHaveLength(1);
  act(() => useSelfLearningStore.getState().unenroll(A));
  expect(useSelfLearningStore.getState().enrollments).toHaveLength(0);
});
it('useIsEnrolled + useEnrolledTutors reflect the store', () => {
  const { result: enrolled } = renderHook(() => useIsEnrolled(A));
  expect(enrolled.current).toBe(false);
  act(() => useSelfLearningStore.getState().enroll(A));
  const { result: tutors } = renderHook(() => useEnrolledTutors());
  expect(tutors.current.map(t => t.id)).toContain(A);
});

const T = officialTutors[0]; const U0 = T.curriculum[0].id;

it('addGoal is idempotent on (tutor,unit); removeGoal removes', () => {
  useSelfLearningStore.setState({ goals: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => { s().addGoal(T.id, U0); s().addGoal(T.id, U0); });
  expect(s().goals.filter(g => g.tutorId === T.id && g.unitId === U0)).toHaveLength(1);
  act(() => s().removeGoal(T.id, U0));
  expect(s().goals).toHaveLength(0);
});
it('recordStudyToday: increments on consecutive days, resets after a gap', () => {
  useSelfLearningStore.setState({ goals: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => s().recordStudyToday('2026-06-23'));
  expect(s().streak).toEqual({ count: 1, lastStudyDate: '2026-06-23' });
  act(() => s().recordStudyToday('2026-06-23'));            // same day → no change
  expect(s().streak.count).toBe(1);
  act(() => s().recordStudyToday('2026-06-24'));            // next day → +1
  expect(s().streak.count).toBe(2);
  act(() => s().recordStudyToday('2026-06-27'));            // gap → reset to 1
  expect(s().streak.count).toBe(1);
});

const TID='ot_001', UID='u_test';
it('completeStep marks steps; completing check bumps streak + marks done', () => {
  useSelfLearningStore.setState({ unitProgress: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => s().completeStep(TID, UID, 'concept'));
  expect(s().unitProgress[0]).toMatchObject({ tutorId: TID, unitId: UID, concept: true, practice: false, check: false });
  act(() => s().completeStep(TID, UID, 'check', '2026-06-23')); // check → streak bump
  expect(s().unitProgress[0].check).toBe(true);
  expect(s().streak.count).toBe(1);
});
