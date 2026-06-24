import { renderHook, act } from '@testing-library/react';
import { useClassEnrollmentStore, useClassEnrollments, useMyClassBots } from '../class-enrollment';
import { resolveClassCode } from '@/lib/mock/class-codes';

beforeEach(() => useClassEnrollmentStore.setState({ enrollments: [] }));

describe('resolveClassCode', () => {
  it('resolves a known code to an enrollment (case-insensitive, trimmed)', () => {
    const e = resolveClassCode('  math-2024 ');
    expect(e).not.toBeNull();
    expect(e!.botId).toBe('cb_001');
    expect(e!.assignedBy).toBe('김수학 선생님');
    expect(e!.classroomLabel).toBeTruthy();
  });

  it('returns null for an unknown code', () => {
    expect(resolveClassCode('NOPE-9999')).toBeNull();
    expect(resolveClassCode('')).toBeNull();
  });
});

describe('useClassEnrollmentStore.join / leave', () => {
  it('join with a valid code adds an enrollment and returns ok', () => {
    const s = () => useClassEnrollmentStore.getState();
    let res: { ok: boolean } | undefined;
    act(() => { res = s().join('MATH-2024'); });
    expect(res!.ok).toBe(true);
    expect(s().enrollments).toHaveLength(1);
    expect(s().enrollments[0].botId).toBe('cb_001');
  });

  it('join is idempotent for the same class', () => {
    const s = () => useClassEnrollmentStore.getState();
    act(() => { s().join('MATH-2024'); s().join('math-2024'); });
    expect(s().enrollments.filter(e => e.botId === 'cb_001')).toHaveLength(1);
  });

  it('join with an unknown code returns an error and adds nothing', () => {
    const s = () => useClassEnrollmentStore.getState();
    let res: { ok: boolean; error?: string } | undefined;
    act(() => { res = s().join('NOPE-9999'); });
    expect(res!.ok).toBe(false);
    expect(res!.error).toBeTruthy();
    expect(s().enrollments).toHaveLength(0);
  });

  it('leave removes the enrollment for a botId', () => {
    const s = () => useClassEnrollmentStore.getState();
    act(() => { s().join('MATH-2024'); });
    act(() => { s().leave('cb_001'); });
    expect(s().enrollments).toHaveLength(0);
  });
});

describe('selectors', () => {
  it('useClassEnrollments + useMyClassBots reflect the store', () => {
    const { result: empty } = renderHook(() => useMyClassBots());
    expect(empty.current).toHaveLength(0);

    act(() => { useClassEnrollmentStore.getState().join('ENG-2024'); });

    const { result: bots } = renderHook(() => useMyClassBots());
    expect(bots.current).toHaveLength(1);
    expect(bots.current[0].bot.id).toBe('cb_002');
    expect(bots.current[0].enrollment.botId).toBe('cb_002');

    const { result: enrollments } = renderHook(() => useClassEnrollments());
    expect(enrollments.current.map(e => e.botId)).toContain('cb_002');
  });
});
