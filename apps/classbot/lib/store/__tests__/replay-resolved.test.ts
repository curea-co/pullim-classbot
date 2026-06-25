import { renderHook, act } from '@testing-library/react';
import { useReplayStore, useResolvedWeakPoints } from '../replay';

beforeEach(() => useReplayStore.setState({ resolvedWeakPoints: {} }));

it('resolveWeakPoint adds a key once (idempotent) and accumulates per replay', () => {
  const s = () => useReplayStore.getState();
  act(() => { s().resolveWeakPoint('r1', 'q:1100'); s().resolveWeakPoint('r1', 'q:1100'); });
  expect(s().resolvedWeakPoints['r1']).toEqual(['q:1100']);
  act(() => s().resolveWeakPoint('r1', 'f:1920'));
  expect(s().resolvedWeakPoints['r1']).toEqual(['q:1100', 'f:1920']);
});

it('keeps replays independent', () => {
  const s = () => useReplayStore.getState();
  act(() => { s().resolveWeakPoint('r1', 'q:1'); s().resolveWeakPoint('r2', 'q:2'); });
  expect(s().resolvedWeakPoints['r1']).toEqual(['q:1']);
  expect(s().resolvedWeakPoints['r2']).toEqual(['q:2']);
});

it('useResolvedWeakPoints reflects the store (stable empty for missing)', () => {
  const { result } = renderHook(() => useResolvedWeakPoints('rX'));
  expect(result.current).toEqual([]);
  act(() => useReplayStore.getState().resolveWeakPoint('rX', 'q:300'));
  const { result: after } = renderHook(() => useResolvedWeakPoints('rX'));
  expect(after.current).toEqual(['q:300']);
});
