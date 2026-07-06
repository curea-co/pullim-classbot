import { dayKeyOf, todayKey } from '../today-key';

describe('today-key', () => {
  it('dayKeyOf → 로컬 YYYY-MM-DD (zero-padded)', () => {
    // 로컬 자정 기준 — 월/일 zero-padding 확인.
    expect(dayKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKeyOf(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('todayKey === dayKeyOf(now) — 위임 일치', () => {
    expect(todayKey()).toBe(dayKeyOf(new Date()));
  });
});
