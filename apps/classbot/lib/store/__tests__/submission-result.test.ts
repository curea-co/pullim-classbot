/**
 * 제출 결과 스토어 — 저장하지 않는다. 세션 안에서 과제별 마지막 제출을 들고, persist 미들웨어가 없다.
 */
import { renderHook } from '@testing-library/react';
import { useSubmissionResult, useSubmissionResultStore } from '../submission-result';

const submission = {
  submissionId: 'sub_1', assignmentId: 'asg_1', studentId: 'sub-s1', scorePercent: 80,
  gradedAt: '2026-09-16T09:00:00.000Z', submittedAt: '2026-09-16T09:00:00.000Z',
};

beforeEach(() => {
  useSubmissionResultStore.setState({ results: {} });
});

it('record 한 결과를 과제 id 로 되읽는다 — 다시 record 하면 덮는다', () => {
  useSubmissionResultStore.getState().record('asg_1', { submission, answers: { q_1: 1 } });
  const { result, rerender } = renderHook(() => useSubmissionResult('asg_1'));
  expect(result.current?.submission.scorePercent).toBe(80);
  expect(result.current?.answers).toEqual({ q_1: 1 });

  useSubmissionResultStore.getState().record('asg_1', { submission: { ...submission, scorePercent: null }, answers: {} });
  rerender();
  expect(result.current?.submission.scorePercent).toBeNull();
});

it('제출하지 않은 과제는 undefined', () => {
  const { result } = renderHook(() => useSubmissionResult('asg_nope'));
  expect(result.current).toBeUndefined();
});

it('localStorage 에 쓰지 않는다 — persist 가 없다', () => {
  useSubmissionResultStore.getState().record('asg_1', { submission, answers: {} });
  expect('persist' in useSubmissionResultStore).toBe(false);
  expect(Object.keys(window.localStorage).some((k) => k.includes('submission'))).toBe(false);
});
