import { renderHook } from '@testing-library/react';
import {
  useProficiencyStore,
  useConceptStats,
  useDueWeaknesses,
  useMasteryPct,
  DUE_DELAY_MS,
  CLEAR_STREAK,
  type ConceptStat,
} from '../proficiency';

const U = 'student_001';
const B = 'cb_001';
const C = 'c2';
const KEY = `${B}:${C}`;

beforeEach(() => useProficiencyStore.setState({ byUser: {} }));

function stat(): ConceptStat | undefined {
  return useProficiencyStore.getState().byUser[U]?.concepts[KEY];
}

it('wrong → wrong++/streak=0/dueAt≤now+10분 + weakness upsert', () => {
  const s = () => useProficiencyStore.getState();
  const before = Date.now();
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: false });
  const st = stat()!;
  expect(st.wrong).toBe(1);
  expect(st.correct).toBe(0);
  expect(st.streak).toBe(0);
  expect(st.dueAt).toBeGreaterThan(before);
  expect(st.dueAt).toBeLessThanOrEqual(Date.now() + DUE_DELAY_MS);
  const w = s().byUser[U].weaknesses;
  expect(w).toHaveLength(1);
  expect(w[0].key).toBe(`q:${B}:${C}`);
  expect(w[0].source).toBe('quiz');
});

it('연속 정답 2회 → weakness 제거', () => {
  const s = () => useProficiencyStore.getState();
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: false });
  expect(s().byUser[U].weaknesses).toHaveLength(1);
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true }); // streak 1
  expect(s().byUser[U].weaknesses).toHaveLength(1);
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true }); // streak 2 → clear
  expect(s().byUser[U].weaknesses).toHaveLength(0);
  expect(stat()!.streak).toBe(CLEAR_STREAK);
  expect(stat()!.dueAt).toBe(0);
});

it('reset→재제출 시 새 시도로 카운트(이중 오염 없음)·정답 전환 반영', () => {
  // store 는 매 제출을 독립 호출로 받는다(컴포넌트 recordedRef 가 제출 1회당 1호출 보장).
  // 오답 한 번 → 다시 풀기 → 정답 한 번: 시도 누적은 정확히 2, 정답률 전환.
  const s = () => useProficiencyStore.getState();
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: false });
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true });
  const st = stat()!;
  expect(st.wrong).toBe(1);
  expect(st.correct).toBe(1);
  expect(useMasteryPct(st)).toBe(0.5);
});

it('addReplayWeakness upsert(idempotent key) + clearWeakness', () => {
  const s = () => useProficiencyStore.getState();
  const input = { botId: B, replayId: 'rp1', atSec: 120, conceptId: C, label: '극값 판정' };
  s().addReplayWeakness(U, input);
  s().addReplayWeakness(U, input); // same key → upsert, no dup
  const w = s().byUser[U].weaknesses;
  expect(w).toHaveLength(1);
  expect(w[0].key).toBe('r:rp1:120');
  expect(w[0].source).toBe('replay');
  s().clearWeakness(U, 'r:rp1:120');
  expect(s().byUser[U].weaknesses).toHaveLength(0);
});

it('review 정답: replay 약점(r: key)은 recordQuizResult 만으로는 안 지워지고 clearWeakness(key) 로만 해소', () => {
  // Codex#164 finding#2 — review-card 가 약점 key 를 스레딩 → InlineQuiz 가 정답 시 clearWeakness(key) 호출.
  // recordQuizResult 는 q:botId:conceptId 만(streak≥2) 지우므로 replay 약점은 stat 기록만으로 절대 해소되지 않는다.
  const s = () => useProficiencyStore.getState();
  s().addReplayWeakness(U, { botId: B, replayId: 'rp9', atSec: 42, conceptId: C, label: '극값 판정' });
  const rKey = 'r:rp9:42';
  expect(s().byUser[U].weaknesses.map(w => w.key)).toEqual([rKey]);

  // 정답을 연속 2회 기록해도(streak 충족) replay 약점은 남는다 — recordQuizResult 는 q: key 만 본다.
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true });
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true });
  expect(stat()!.streak).toBe(CLEAR_STREAK);
  expect(s().byUser[U].weaknesses.map(w => w.key)).toEqual([rKey]); // 여전히 잔존

  // review 흐름의 정답 처리가 호출하는 clearWeakness(key) 로만 해소.
  s().clearWeakness(U, rKey);
  expect(s().byUser[U].weaknesses).toHaveLength(0);
});

it('useDueWeaknesses: due≤now 만, 오래된 due 우선 정렬, now 주입', () => {
  const now = 1_000_000;
  useProficiencyStore.setState({
    byUser: {
      [U]: {
        concepts: {},
        weaknesses: [
          { key: 'a', botId: B, conceptId: 'c1', label: 'A', source: 'quiz', dueAt: now - 100 },
          { key: 'b', botId: B, conceptId: 'c2', label: 'B', source: 'quiz', dueAt: now + 500 }, // 미래 → 제외
          { key: 'c', botId: B, conceptId: 'c3', label: 'C', source: 'replay', dueAt: now - 999 },
          { key: 'd', botId: 'cb_999', conceptId: 'c1', label: 'D', source: 'quiz', dueAt: now - 50 }, // 다른 봇 → 제외
        ],
      },
    },
  });
  const { result } = renderHook(() => useDueWeaknesses(U, B, now));
  expect(result.current.map(w => w.key)).toEqual(['c', 'a']); // 오래된 due(c) 우선
});

it('useConceptStats reflects store and isolates per bot', () => {
  const s = () => useProficiencyStore.getState();
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: true });
  s().recordQuizResult(U, { botId: 'cb_002', conceptId: 'c1', correct: false });
  const { result } = renderHook(() => useConceptStats(U, B));
  expect(Object.keys(result.current)).toEqual([KEY]);
  expect(result.current[KEY].correct).toBe(1);
});

it('per-user 분리', () => {
  const s = () => useProficiencyStore.getState();
  s().recordQuizResult(U, { botId: B, conceptId: C, correct: false });
  s().recordQuizResult('student_002', { botId: B, conceptId: C, correct: true });
  expect(stat()!.wrong).toBe(1);
  expect(s().byUser['student_002'].concepts[KEY].correct).toBe(1);
  expect(s().byUser['student_002'].weaknesses).toHaveLength(0);
});

it('useMasteryPct: 0시도 → null', () => {
  expect(useMasteryPct(undefined)).toBeNull();
  expect(useMasteryPct({ conceptId: C, botId: B, correct: 0, wrong: 0, streak: 0, lastSeenAt: 0, dueAt: 0 })).toBeNull();
  expect(useMasteryPct({ conceptId: C, botId: B, correct: 3, wrong: 1, streak: 3, lastSeenAt: 0, dueAt: 0 })).toBe(0.75);
});

it('persist name is pullim-proficiency (round-trip 구조 유지)', () => {
  expect(useProficiencyStore.persist.getOptions().name).toBe('pullim-proficiency');
});
