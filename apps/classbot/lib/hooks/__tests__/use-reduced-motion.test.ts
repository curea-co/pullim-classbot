import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from '../use-reduced-motion';

type Listener = (e: Partial<MediaQueryListEvent>) => void;

/** matchMedia mock — matches 값과 change 리스너 구독/해제를 추적. */
function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  let matches = initialMatches;
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: jest.fn((_: string, cb: Listener) => listeners.add(cb)),
    removeEventListener: jest.fn((_: string, cb: Listener) => listeners.delete(cb)),
  };
  window.matchMedia = jest.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    mql,
    listeners,
    set(next: boolean) {
      matches = next;
      listeners.forEach(cb => cb({ matches: next }));
    },
  };
}

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  jest.restoreAllMocks();
});

it('reduce 매체 미충족이면 false', () => {
  mockMatchMedia(false);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
});

it('reduce 매체 충족이면 true', () => {
  mockMatchMedia(true);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(true);
});

it('change 이벤트를 구독해 값이 갱신된다', () => {
  const media = mockMatchMedia(false);
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
  act(() => media.set(true));
  expect(result.current).toBe(true);
});

it('언마운트 시 리스너를 해제한다', () => {
  const media = mockMatchMedia(false);
  const { unmount } = renderHook(() => useReducedMotion());
  expect(media.listeners.size).toBe(1);
  unmount();
  expect(media.listeners.size).toBe(0);
  expect(media.mql.removeEventListener).toHaveBeenCalled();
});
