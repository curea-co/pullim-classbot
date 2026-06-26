import { isLowConditionDay } from '../classbot-light-day';

it('low when a flag is present (below-60-3days / below-40-instant)', () => {
  expect(isLowConditionDay({ flag: 'below-60-3days', recentMoods: [] })).toBe(true);
  expect(isLowConditionDay({ flag: 'below-40-instant', recentMoods: [1] })).toBe(true);
});

it('low when the last 3 check-ins are all 힘들었어 (mood 4)', () => {
  expect(isLowConditionDay({ flag: null, recentMoods: [4, 4, 4] })).toBe(true);
});

it('NOT low for a single bad day or 그저그래 (authority: sustained only)', () => {
  expect(isLowConditionDay({ flag: null, recentMoods: [4] })).toBe(false);       // 하루만 힘듦
  expect(isLowConditionDay({ flag: null, recentMoods: [4, 4] })).toBe(false);    // 이틀만
  expect(isLowConditionDay({ flag: null, recentMoods: [3, 3, 3] })).toBe(false); // 그저그래 연속도 X
  expect(isLowConditionDay({ flag: null, recentMoods: [4, 4, 2] })).toBe(false); // 연속 끊김
});

it('not low with no flag and no streak', () => {
  expect(isLowConditionDay({ flag: null, recentMoods: [] })).toBe(false);
  expect(isLowConditionDay({ flag: undefined, recentMoods: [1, 2, 1] })).toBe(false);
});
