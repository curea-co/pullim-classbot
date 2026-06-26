import { renderHook, act } from '@testing-library/react';
import { useLightDayStore, useLightDayOn, useLightDayActions } from '../light-day';

beforeEach(() => useLightDayStore.setState({ enabledDate: null }));

it('enable(today) turns light mode on for that day only (next day off)', () => {
  act(() => useLightDayStore.getState().enable('2026-06-26'));
  expect(renderHook(() => useLightDayOn('2026-06-26')).result.current).toBe(true);
  expect(renderHook(() => useLightDayOn('2026-06-27')).result.current).toBe(false); // 다음 날 자동 off
});

it('disable turns it off', () => {
  act(() => useLightDayStore.getState().enable('2026-06-26'));
  act(() => useLightDayStore.getState().disable());
  expect(renderHook(() => useLightDayOn('2026-06-26')).result.current).toBe(false);
});

it('useLightDayActions enables and disables', () => {
  const { result } = renderHook(() => useLightDayActions());
  act(() => result.current.enable('2026-06-26'));
  expect(useLightDayStore.getState().enabledDate).toBe('2026-06-26');
  act(() => result.current.disable());
  expect(useLightDayStore.getState().enabledDate).toBeNull();
});
