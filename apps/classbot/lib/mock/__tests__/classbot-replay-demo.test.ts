import { demoReplays } from '../classbot-replay-demo';
import { getReplayWeakPoints } from '../classbot-replay-recap';
import { getReplayQuiz } from '../classbot-replay-exam';

const byId = (id: string) => demoReplays.find(r => r.id === id)!;

it('exposes sent demo replays (math + eng)', () => {
  expect(demoReplays.map(r => r.id)).toEqual(expect.arrayContaining(['rp_demo_math', 'rp_demo_eng']));
  expect(demoReplays.every(r => r.status === 'sent')).toBe(true);
});

it('math demo: wrong-quiz weak point @1100 links to a seeded 〈보기〉 exam question', () => {
  const wrong = getReplayWeakPoints(byId('rp_demo_math')).find(p => p.reason === 'wrong');
  expect(wrong?.atSec).toBe(1100);
  expect(getReplayQuiz('rp_demo_math', 1100)?.boxed).toBeDefined();
});

it('math demo: low-focus weak point @1920 is owned (변곡점) and has no re-attempt quiz', () => {
  const lowFocus = getReplayWeakPoints(byId('rp_demo_math')).find(p => p.reason === 'low-focus');
  expect(lowFocus?.atSec).toBe(1920);
  expect(getReplayQuiz('rp_demo_math', 1920)).toBeNull();
});

it('eng demo: wrong-quiz weak point @740 links to a seeded passage exam question', () => {
  expect(getReplayWeakPoints(byId('rp_demo_eng')).some(p => p.atSec === 740 && p.reason === 'wrong')).toBe(true);
  expect(getReplayQuiz('rp_demo_eng', 740)?.passage).toBeDefined();
});
