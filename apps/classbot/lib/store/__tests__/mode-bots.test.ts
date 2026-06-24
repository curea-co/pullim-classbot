import { renderHook, act } from '@testing-library/react';
import { useModeBots } from '../mode-bots';
import { useStudentModeStore } from '../student-mode';
import { useClassEnrollmentStore } from '../class-enrollment';
import { useSelfLearningStore } from '../self-learning';
import { officialTutors } from '@/lib/mock/classbot-official';

const TUTOR = officialTutors[0].id;

beforeEach(() => {
  useStudentModeStore.setState({ mode: null });
  useClassEnrollmentStore.setState({ enrollments: [] });
  useSelfLearningStore.setState({ enrollments: [], goals: [], streak: { count: 0, lastStudyDate: null }, unitProgress: [] });
});

// spec §2 — "각 모드는 자기 목록만": class=교사 배정 봇, self=자기 등록 튜터.
it('class mode returns only teacher-enrollment bots', () => {
  act(() => {
    useStudentModeStore.getState().setMode('class');
    useClassEnrollmentStore.getState().join('MATH-2024');        // cb_001 (teacher)
    useSelfLearningStore.getState().enroll(TUTOR);               // self tutor — must NOT leak
  });
  const { result } = renderHook(() => useModeBots());
  expect(result.current.map(b => b.id)).toEqual(['cb_001']);
});

it('self mode returns only self-enrolled tutors', () => {
  act(() => {
    useStudentModeStore.getState().setMode('self');
    useClassEnrollmentStore.getState().join('MATH-2024');        // teacher — must NOT leak
    useSelfLearningStore.getState().enroll(TUTOR);
  });
  const { result } = renderHook(() => useModeBots());
  expect(result.current.map(b => b.id)).toEqual([TUTOR]);
});

it('class mode with no teacher enrollment is empty even if self tutors exist', () => {
  act(() => {
    useStudentModeStore.getState().setMode('class');
    useSelfLearningStore.getState().enroll(TUTOR);
  });
  const { result } = renderHook(() => useModeBots());
  expect(result.current).toHaveLength(0);
});
