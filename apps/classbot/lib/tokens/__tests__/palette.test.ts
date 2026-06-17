import { palette } from '../palette';

describe('palette canonical values (CUDS pullim × variant-B)', () => {
  it('primary ramp is the pullim hue-258 OKLCH ramp', () => {
    expect(palette.primary[600]).toBe('oklch(0.524 0.197 258)'); // seed #0362DA
    expect(palette.primary[50]).toBe('oklch(0.972 0.024 258)');
    expect(palette.primary[900]).toBe('oklch(0.364 0.118 258)');
  });
  it('restores CUDS semantic status colors (not blue-narrowed)', () => {
    expect(palette.success[500]).toBe('oklch(0.696 0.170 162)');
    expect(palette.warning[500]).toBe('oklch(0.795 0.184 86)');
    expect(palette.danger[500]).toBe('oklch(0.637 0.237 25)');
    expect(palette.info[500]).toBe('oklch(0.685 0.169 237)');
  });
  it('variant-B radius scale', () => {
    expect(palette.radius).toEqual({ xs: 6, sm: 8, md: 16, lg: 16, xl: 20, '2xl': 28, full: 9999 });
  });
  it('every palette color string is OKLCH or pure white/lemon brand hex', () => {
    const colorVals = [
      ...Object.values(palette.primary), ...Object.values(palette.gray),
      ...Object.values(palette.success), ...Object.values(palette.warning),
      ...Object.values(palette.danger), ...Object.values(palette.info),
    ];
    for (const v of colorVals) expect(v).toMatch(/^oklch\(/);
  });
});
