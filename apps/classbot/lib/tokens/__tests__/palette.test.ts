import { palette } from '../palette';
import { pullimBlue, pullimSemantic } from '../index';

describe('palette canonical values (Pullim DS hex)', () => {
  it('primary ramp is the Pullim brand hex ramp', () => {
    expect(palette.primary[600]).toBe('#2854D8'); // ★ Pullim brand CTA
    expect(palette.primary[50]).toBe('#EEF3FF');
    expect(palette.primary[900]).toBe('#070F2C');
  });
  it('semantic status colors match Pullim DS hex', () => {
    expect(palette.success[600]).toBe('#0E8C56');
    expect(palette.warning[600]).toBe('#D97706'); // cta-bg (AA on white)
    expect(palette.danger[600]).toBe('#C03B3F');
    expect(palette.lemon.base).toBe('#E6FF4C');
  });
  it('Pullim DS radius scale', () => {
    expect(palette.radius).toEqual({ sm: 8, md: 14, lg: 20, pill: 9999 });
  });
  it('every color string is a 6-digit hex (DS is hex-authored)', () => {
    const colorVals = [
      ...Object.values(palette.primary), ...Object.values(palette.gray),
      ...Object.values(palette.success), ...Object.values(palette.warning),
      ...Object.values(palette.danger), ...Object.values(palette.info),
    ];
    for (const v of colorVals) expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

it('index.ts derives from palette (single source)', () => {
  expect(pullimBlue[600]).toBe(palette.primary[600]);
  expect(pullimSemantic.success).toBe(palette.success[600]);
  expect(pullimSemantic.warn).toBe(palette.warning[600]);
});
