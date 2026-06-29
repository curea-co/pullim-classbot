import { renderHook } from '@testing-library/react';
import {
  useMisconceptionStore,
  useMisconceptionCounts,
  usePendingCoachTag,
  COACH_THRESHOLD,
} from '../misconception';
import { DISTRACTOR_META, type DistractorTag } from '@/lib/mock/classbot-distractor';

const U = 'student_001';
const TAG: DistractorTag = 'confuse-max-min';

beforeEach(() => useMisconceptionStore.setState({ counts: {}, coached: {} }));

it("record ignores 'correct' and falsy tags (불변)", () => {
  const s = () => useMisconceptionStore.getState();
  s().record(U, 'correct');
  s().record(U, undefined);
  expect(s().counts[U]).toBeUndefined();
});

it('record accumulates per-tag and threshold(2) gates pending coach tag', () => {
  const s = () => useMisconceptionStore.getState();
  s().record(U, TAG);
  // 1회 — 아직 임계 미만 → null
  expect(
    renderHook(() => usePendingCoachTag(U)).result.current,
  ).toBeNull();
  s().record(U, TAG);
  // 2회 도달 → 그 태그 반환
  expect(s().counts[U][TAG]).toBe(COACH_THRESHOLD);
  expect(renderHook(() => usePendingCoachTag(U)).result.current).toBe(TAG);
});

it('markCoached suppresses the tag (null after coaching)', () => {
  const s = () => useMisconceptionStore.getState();
  s().record(U, TAG);
  s().record(U, TAG);
  s().markCoached(U, TAG);
  s().markCoached(U, TAG); // idempotent
  expect(s().coached[U]).toEqual([TAG]);
  expect(renderHook(() => usePendingCoachTag(U)).result.current).toBeNull();
});

it('useMisconceptionCounts reflects the store and isolates per user', () => {
  const s = () => useMisconceptionStore.getState();
  s().record(U, TAG);
  s().record('student_002', 'plug-x-not-fx');
  const { result } = renderHook(() => useMisconceptionCounts(U));
  expect(result.current).toEqual({ [TAG]: 1 });
  // 다른 유저는 격리
  expect(s().counts['student_002']).toEqual({ 'plug-x-not-fx': 1 });
});

it('reset clears only the target user', () => {
  const s = () => useMisconceptionStore.getState();
  s().record(U, TAG);
  s().markCoached(U, TAG);
  s().record('student_002', TAG);
  s().reset(U);
  expect(s().counts[U]).toBeUndefined();
  expect(s().coached[U]).toBeUndefined();
  expect(s().counts['student_002']).toEqual({ [TAG]: 1 });
});

it('persist name is pullim-misconception', () => {
  expect(useMisconceptionStore.persist.getOptions().name).toBe('pullim-misconception');
});

it('every DistractorTag except correct is in DISTRACTOR_META', () => {
  const tags: DistractorTag[] = [
    'confuse-max-min', 'plug-x-not-fx', 'sign-no-change', 'same-direction',
    'example-vs-contrast', 'ignore-connective', 'wrong-formula-parallel', 'add-vs-multiply',
    'average-not-sum', 'jump-to-conclusion', 'one-side-only', 'literal-word-match', 'over-detail',
  ];
  for (const t of tags) {
    expect(DISTRACTOR_META[t as Exclude<DistractorTag, 'correct'>]).toBeDefined();
    expect(DISTRACTOR_META[t as Exclude<DistractorTag, 'correct'>].tag).toBe(t);
  }
  // META 키 집합이 정확히 그 13종(correct 제외)인지
  expect(Object.keys(DISTRACTOR_META).sort()).toEqual([...tags].sort());
});
