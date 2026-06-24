import { renderHook, act } from '@testing-library/react';
import { useStudentMode, useStudentModeStore } from '../student-mode';
import { useClassEnrollmentStore } from '../class-enrollment';

// 교사 enrollment 권위는 class-enrollment 스토어 — 기본 모드 해석도 이 스토어를 본다.
beforeEach(() => {
  useStudentModeStore.setState({ mode: null });
  useClassEnrollmentStore.setState({ enrollments: [] });
});

it('defaults to self when the student has no teacher enrollments', () => {
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('self');
});

it('defaults to class when the student has a teacher enrollment', () => {
  act(() => { useClassEnrollmentStore.getState().join('MATH-2024'); });
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('class');
});

it('setMode overrides the default and toggle flips the resolved mode', () => {
  act(() => { useClassEnrollmentStore.getState().join('MATH-2024'); }); // default class
  const { result, rerender } = renderHook(() => useStudentMode());
  act(() => result.current.toggle()); rerender();
  expect(result.current.mode).toBe('self');
  act(() => result.current.setMode('class')); rerender();
  expect(result.current.mode).toBe('class');
});
