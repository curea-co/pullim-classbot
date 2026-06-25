import { getReplayWeakPoints, FOCUS_THRESHOLD } from '../classbot-replay-recap';
import type { Replay, ReplaySegment } from '@/lib/mock';

function seg(p: Partial<ReplaySegment>): ReplaySegment {
  return { at: '0:00', atSec: 0, ratio: 0, type: 'concept', label: '', ...p } as ReplaySegment;
}
function makeReplay(p: Partial<Replay>): Replay {
  return { segments: [], focusBins: [], ...p } as Replay;
}

it('extracts wrong quiz segments (myAnswer ≠ correctAnswer) as weak points', () => {
  const r = makeReplay({
    segments: [
      seg({ type: 'quiz', atSec: 1100, label: 'Q3 극대·극소', myAnswer: '극소', correctAnswer: '극대' }),
      seg({ type: 'quiz', atSec: 200, label: 'Q1', myAnswer: 'A', correctAnswer: 'A' }), // 정답 → 제외
    ],
    focusBins: [],
  });
  const wp = getReplayWeakPoints(r);
  expect(wp).toHaveLength(1);
  expect(wp[0]).toMatchObject({ reason: 'wrong', atSec: 1100, key: 'q:1100', label: 'Q3 극대·극소' });
});

it('maps low-focus minutes to the nearest concept/attention segment', () => {
  const focusBins = Array.from({ length: 40 }, (_, i) => (i === 32 ? FOCUS_THRESHOLD - 10 : 80));
  const r = makeReplay({
    segments: [seg({ type: 'concept', atSec: 1920, label: '변곡점' })], // 32분 = 1920s
    focusBins,
  });
  const wp = getReplayWeakPoints(r);
  expect(wp.some(p => p.reason === 'low-focus' && p.atSec === 1920 && p.key === 'f:1920')).toBe(true);
});

it('sorts by atSec and caps at 4', () => {
  const segments = [600, 100, 1800, 1200, 300].map((s, i) =>
    seg({ type: 'quiz', atSec: s, label: `Q${i}`, myAnswer: 'x', correctAnswer: 'y' }),
  );
  const wp = getReplayWeakPoints(makeReplay({ segments, focusBins: [] }));
  expect(wp).toHaveLength(4);
  expect(wp.map(p => p.atSec)).toEqual([100, 300, 600, 1200]); // 정렬 후 상위 4
});

it('returns [] when all quizzes correct and focus all high', () => {
  const r = makeReplay({
    segments: [seg({ type: 'quiz', atSec: 100, myAnswer: 'A', correctAnswer: 'A' })],
    focusBins: [90, 85, 95],
  });
  expect(getReplayWeakPoints(r)).toEqual([]);
});
