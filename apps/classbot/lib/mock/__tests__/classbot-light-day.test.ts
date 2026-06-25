import { isLowConditionDay } from '../classbot-light-day';

it('low when wellbeing score < 60', () => {
  expect(isLowConditionDay({ score: 59, mood: null })).toBe(true);
  expect(isLowConditionDay({ score: 60, mood: null })).toBe(false);
});

it('low when a flag is present, regardless of score', () => {
  expect(isLowConditionDay({ score: 85, flag: 'below-60-3days', mood: null })).toBe(true);
  expect(isLowConditionDay({ score: 85, flag: 'below-40-instant', mood: null })).toBe(true);
});

it('low when today check-in mood >= 3 (그저그래/힘들었어)', () => {
  expect(isLowConditionDay({ score: 90, mood: 3 })).toBe(true);
  expect(isLowConditionDay({ score: 90, mood: 4 })).toBe(true);
  expect(isLowConditionDay({ score: 90, mood: 2 })).toBe(false);
  expect(isLowConditionDay({ score: 90, mood: 1 })).toBe(false);
  expect(isLowConditionDay({ score: 90, mood: null })).toBe(false);
});

it('not low when score ok, no flag, mood ok', () => {
  expect(isLowConditionDay({ score: 75, flag: null, mood: 1 })).toBe(false);
});

it('low if ANY signal trips (good score but low mood)', () => {
  expect(isLowConditionDay({ score: 88, flag: null, mood: 3 })).toBe(true);
});
