import { getSentReplays } from '@/lib/mock';
import { getReplayWeakPoints } from '../classbot-replay-recap';
import { getReplayQuiz } from '../classbot-replay-exam';

it('seeds sent demo replays (math + eng)', () => {
  const ids = getSentReplays().map(r => r.id);
  expect(ids).toContain('rp_demo_math');
  expect(ids).toContain('rp_demo_eng');
});

it('math demo: wrong-quiz weak point @1100 links to a seeded 〈보기〉 exam question', () => {
  const r = getSentReplays().find(x => x.id === 'rp_demo_math')!;
  const wrong = getReplayWeakPoints(r).find(p => p.reason === 'wrong');
  expect(wrong?.atSec).toBe(1100);
  expect(getReplayQuiz('rp_demo_math', 1100)?.boxed).toBeDefined();
});

it('math demo: low-focus weak point @1920 is owned (변곡점) and has no re-attempt quiz', () => {
  const r = getSentReplays().find(x => x.id === 'rp_demo_math')!;
  const lowFocus = getReplayWeakPoints(r).find(p => p.reason === 'low-focus');
  expect(lowFocus?.atSec).toBe(1920);
  expect(getReplayQuiz('rp_demo_math', 1920)).toBeNull();
});

it('eng demo: wrong-quiz weak point @740 links to a seeded passage exam question', () => {
  const r = getSentReplays().find(x => x.id === 'rp_demo_eng')!;
  expect(getReplayWeakPoints(r).some(p => p.atSec === 740 && p.reason === 'wrong')).toBe(true);
  expect(getReplayQuiz('rp_demo_eng', 740)?.passage).toBeDefined();
});
