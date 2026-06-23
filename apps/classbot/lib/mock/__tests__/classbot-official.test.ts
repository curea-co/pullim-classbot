import { officialTutors, getOfficialTutors, getOfficialTutor } from '../classbot-official';

it('exposes ≥3 official tutors, each ClassBot-shaped with a curriculum', () => {
  expect(getOfficialTutors().length).toBeGreaterThanOrEqual(3);
  for (const t of officialTutors) {
    expect(t.id).toMatch(/^ot_/);          // official-tutor id namespace
    expect(typeof t.name).toBe('string');
    expect(typeof t.subject).toBe('string');
    expect(t.greeting.length).toBeGreaterThan(0);
    expect(t.quickPrompts.length).toBe(4);  // chat panel contract
    expect(t.isLive).toBe(false);           // official tutors are not live-class
    expect(t.curriculum.length).toBeGreaterThanOrEqual(3);
    t.curriculum.forEach((u, i) => expect(u.order).toBe(i + 1)); // 1-based ordered
  }
});
it('getOfficialTutor resolves by id and returns undefined for misses', () => {
  expect(getOfficialTutor(officialTutors[0].id)?.id).toBe(officialTutors[0].id);
  expect(getOfficialTutor('nope')).toBeUndefined();
});
