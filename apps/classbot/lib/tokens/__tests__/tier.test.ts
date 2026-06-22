import { aiTierMeta } from '../tier';
import { palette } from '../palette';

it('tier colors come from the primary ramp (no inline hex)', () => {
  expect(aiTierMeta.T1.color).toBe(palette.primary[400]);
  expect(aiTierMeta.T2.color).toBe(palette.primary[600]);
  expect(aiTierMeta.T3.color).toBe(palette.primary[700]);
  for (const t of Object.values(aiTierMeta)) {
    expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(t.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
  }
});
