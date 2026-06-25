import { getReplayQuiz } from '../classbot-replay-exam';

it('returns a seeded English passage item for a known (replayId, atSec)', () => {
  const q = getReplayQuiz('rp_demo_eng', 740);
  expect(q).not.toBeNull();
  expect(q!.passage).toBeDefined();
  expect(q!.passage!.paragraphs.length).toBeGreaterThan(0);
  expect(q!.options.length).toBeGreaterThanOrEqual(2);
  expect(q!.answerIndex).toBeGreaterThanOrEqual(0);
  expect(q!.answerIndex).toBeLessThan(q!.options.length);
  expect(q!.subjectLabel).toBeTruthy();
  expect(q!.explanation).toBeTruthy();
});

it('returns a math item with a 〈보기〉 box (no passage)', () => {
  const q = getReplayQuiz('rp_demo_math', 1100);
  expect(q).not.toBeNull();
  expect(q!.boxed).toBeDefined();
  expect(q!.passage).toBeUndefined();
});

it('returns null for an unknown key', () => {
  expect(getReplayQuiz('nope', 999)).toBeNull();
});
