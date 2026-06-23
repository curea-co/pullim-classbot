import { renderHook, act } from '@testing-library/react';
import { useSelfLearningStore, useIsEnrolled, useEnrolledTutors } from '../self-learning';
import { officialTutors } from '@/lib/mock/classbot-official';

const A = officialTutors[0].id;
beforeEach(() => useSelfLearningStore.setState({ enrollments: [] }));

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
