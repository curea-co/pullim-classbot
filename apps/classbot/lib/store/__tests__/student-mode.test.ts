import { renderHook, act } from '@testing-library/react';
import { useStudentMode, useStudentModeStore } from '../student-mode';
import { useClassEnrollmentStore } from '../class-enrollment';
import { CODE_MAP } from '@/lib/mock/class-codes';

/** 로컬 방 하나를 심는다 — 스토어의 데모 코드 `join` 은 계획 PR 4 에서 걷혔다(정본 참여는 훅). */
const seedMathRoom = () => useClassEnrollmentStore.setState({ enrollments: [CODE_MAP['MATH-2024']] });

// 자기주도 보류 — 저장값이 없으면 enrollment 유무와 무관하게 class(교사 수업)로 고정된다.
beforeEach(() => {
  useStudentModeStore.setState({ mode: null });
  useClassEnrollmentStore.setState({ enrollments: [] });
});

it('defaults to class even when the student has no teacher enrollments (자기주도 보류)', () => {
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('class');
});

it('defaults to class when the student has a teacher enrollment', () => {
  act(() => { seedMathRoom(); });
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('class');
});

it('setMode overrides the default and toggle flips the resolved mode', () => {
  act(() => { seedMathRoom(); }); // default class
  const { result, rerender } = renderHook(() => useStudentMode());
  act(() => result.current.toggle()); rerender();
  expect(result.current.mode).toBe('self');
  act(() => result.current.setMode('class')); rerender();
  expect(result.current.mode).toBe('class');
});

it('reports hydrated=true after mount (persist 분기 게이팅용)', () => {
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.hydrated).toBe(true);
});
