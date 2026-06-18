import { heatColor } from '../heat-color';
it('buckets focus score to heat vars (floor is heat-1, not heat-0)', () => {
  expect(heatColor(95)).toBe('var(--color-pullim-heat-5)');
  expect(heatColor(85)).toBe('var(--color-pullim-heat-4)');
  expect(heatColor(72)).toBe('var(--color-pullim-heat-3)');
  expect(heatColor(60)).toBe('var(--color-pullim-heat-2)');
  expect(heatColor(10)).toBe('var(--color-pullim-heat-1)');
  expect(heatColor(0)).toBe('var(--color-pullim-heat-1)');
});
