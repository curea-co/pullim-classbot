import { getUnitContent } from '../classbot-learning-content';
import { getOfficialTutor } from '../classbot-official';

it('ot_001 every unit has concept + non-empty practice + check with valid correctIndex', () => {
  const t = getOfficialTutor('ot_001')!;
  for (const u of t.curriculum) {
    const c = getUnitContent('ot_001', u.id);
    expect(c).not.toBeNull();
    expect(c!.concept.length).toBeGreaterThan(0);
    expect(c!.practice.length).toBeGreaterThan(0);
    expect(c!.check.length).toBeGreaterThan(0);
    for (const q of [...c!.practice, ...c!.check]) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);  // in range
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  }
});
it('returns null for unknown tutor/unit', () => {
  expect(getUnitContent('ot_001', 'nope')).toBeNull();
  expect(getUnitContent('nope', 'u1')).toBeNull();
});
