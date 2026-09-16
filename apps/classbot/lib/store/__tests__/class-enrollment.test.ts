/**
 * class-enrollment — 계획 PR 4 뒤에 남은 것: 로컬 방의 목록과 나가기.
 * 데모 코드 `join`·`resolveClassCode`·카탈로그 브리지 `useMyClassBots` 는 호출부와 함께 걷혔다
 * (스토어 머리주석). 참여는 `hooks/api/classroom.ts` 의 정본 훅이 진다.
 */
import { renderHook, act } from '@testing-library/react';
import { useClassEnrollmentStore, useClassEnrollments } from '../class-enrollment';
import { CODE_MAP } from '@/lib/mock/class-codes';

const MATH = CODE_MAP['MATH-2024'];
const ENG = CODE_MAP['ENG-2024'];

beforeEach(() => useClassEnrollmentStore.setState({ enrollments: [] }));

describe('useClassEnrollmentStore.leave', () => {
  it('removes the enrollment for a botId and keeps the others', () => {
    const s = () => useClassEnrollmentStore.getState();
    act(() => useClassEnrollmentStore.setState({ enrollments: [MATH, ENG] }));

    act(() => s().leave('cb_001'));

    expect(s().enrollments.map((e) => e.botId)).toEqual(['cb_002']);
  });

  it('is a no-op for an unknown botId', () => {
    const s = () => useClassEnrollmentStore.getState();
    act(() => useClassEnrollmentStore.setState({ enrollments: [MATH] }));

    act(() => s().leave('cb_999'));

    expect(s().enrollments).toEqual([MATH]);
  });
});

describe('selectors', () => {
  it('useClassEnrollments reflects the store', () => {
    const { result } = renderHook(() => useClassEnrollments());
    expect(result.current).toHaveLength(0);

    act(() => useClassEnrollmentStore.setState({ enrollments: [ENG] }));

    expect(result.current.map((e) => e.botId)).toEqual(['cb_002']);
  });
});
