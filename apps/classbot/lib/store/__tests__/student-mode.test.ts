import { renderHook, act } from '@testing-library/react';
import { useStudentMode, useStudentModeStore } from '../student-mode';

jest.mock('@/lib/mock', () => ({ getMyBots: jest.fn(() => []) }));
import { getMyBots } from '@/lib/mock';

beforeEach(() => { useStudentModeStore.setState({ mode: null }); (getMyBots as jest.Mock).mockReturnValue([]); });

it('defaults to self when the student has no teacher enrollments', () => {
  (getMyBots as jest.Mock).mockReturnValue([]);
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('self');
});
it('defaults to class when the student has teacher enrollments', () => {
  (getMyBots as jest.Mock).mockReturnValue([{ bot: {}, enrollment: {} }]);
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('class');
});
it('setMode overrides the default and toggle flips the resolved mode', () => {
  (getMyBots as jest.Mock).mockReturnValue([{ bot: {}, enrollment: {} }]); // default class
  const { result, rerender } = renderHook(() => useStudentMode());
  act(() => result.current.toggle()); rerender();
  expect(result.current.mode).toBe('self');
  act(() => result.current.setMode('class')); rerender();
  expect(result.current.mode).toBe('class');
});
