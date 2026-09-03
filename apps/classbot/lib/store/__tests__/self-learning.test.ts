import { act } from '@testing-library/react';

import {
  deriveStreak,
  useSelfLearningStore,
  type SelfUserRecord,
} from '../self-learning';

const SEOYEON = 'student_001';
const MINJUN = 'student_002';
/** 마켓 봇 id — `class_bots.id`. 이 스토어에는 `ot_*` 가 없다. */
const BOT_A = 'cb_001';
const BOT_B = 'cb_002';

const store = () => useSelfLearningStore.getState();
const recordOf = (userId: string): SelfUserRecord | undefined =>
  useSelfLearningStore.getState().byUser[userId];

beforeEach(() => {
  useSelfLearningStore.setState({ byUser: {}, goals: [], unitProgress: [] });
});

describe('담은 봇', () => {
  it('두 번 담아도 한 줄이고, 빼면 사라진다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().addSelfBot(SEOYEON, BOT_A);
    });
    expect(recordOf(SEOYEON)?.bots).toHaveLength(1);
    expect(recordOf(SEOYEON)?.bots[0]).toMatchObject({ botId: BOT_A });
    expect(recordOf(SEOYEON)?.bots[0].addedAt).toEqual(expect.any(String));

    act(() => store().removeSelfBot(SEOYEON, BOT_A));
    expect(recordOf(SEOYEON)?.bots).toHaveLength(0);
  });

  it('사용자끼리 서로의 봇을 보지 않는다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().addSelfBot(MINJUN, BOT_B);
    });
    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
    expect(recordOf(MINJUN)?.bots.map((b) => b.botId)).toEqual([BOT_B]);

    // 한쪽에서 빼도 다른 쪽은 그대로다.
    act(() => store().removeSelfBot(SEOYEON, BOT_A));
    expect(recordOf(SEOYEON)?.bots).toHaveLength(0);
    expect(recordOf(MINJUN)?.bots.map((b) => b.botId)).toEqual([BOT_B]);
  });
});

describe('공부한 날', () => {
  it('같은 날 두 번 기록해도 한 칸이다', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-09-02');
      store().recordStudyDay(SEOYEON, '2026-09-02');
    });
    expect(recordOf(SEOYEON)?.studyDays).toEqual(['2026-09-02']);
  });

  it('순서에 상관없이 넣어도 오름차순으로 쌓인다', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-09-03');
      store().recordStudyDay(SEOYEON, '2026-09-01');
      store().recordStudyDay(SEOYEON, '2026-09-02');
    });
    expect(recordOf(SEOYEON)?.studyDays).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('날짜를 안 주면 오늘(today-key)로 기록한다', () => {
    act(() => store().recordStudyDay(SEOYEON));
    const [day] = recordOf(SEOYEON)?.studyDays ?? [];
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('형식이 어긋난 값은 받지 않는다 — 나중에 서버로 올릴 기록이라', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-9-2');
      store().recordStudyDay(SEOYEON, 'today');
      store().recordStudyDay(SEOYEON, '2026-13-40');
    });
    expect(recordOf(SEOYEON)?.studyDays ?? []).toEqual([]);
  });

  // `Date.parse('2026-02-30')` 은 NaN 이 아니라 3월 2일로 정규화된다 — 형식만 보면 통과한다.
  // 그 값이 저장소에 남으면 연속일수와 백필의 입력이 되고, 서버는 같은 값을 거절한다.
  it('달력에 없는 날은 형식이 맞아도 받지 않는다 — 서버와 같은 판정', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-02-30');
      store().recordStudyDay(SEOYEON, '2026-04-31');
      store().recordStudyDay(SEOYEON, '2027-02-29');
    });
    expect(recordOf(SEOYEON)?.studyDays ?? []).toEqual([]);
  });

  it('사용자끼리 서로의 날짜를 보지 않는다', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-09-01');
      store().recordStudyDay(MINJUN, '2026-09-02');
    });
    expect(recordOf(SEOYEON)?.studyDays).toEqual(['2026-09-01']);
    expect(recordOf(MINJUN)?.studyDays).toEqual(['2026-09-02']);
  });
});

describe('deriveStreak — 저장하지 않고 날짜에서 계산', () => {
  it('기록이 없으면 0', () => {
    expect(deriveStreak([])).toEqual({ count: 0, lastStudyDate: null });
  });

  it('이어진 날은 센다', () => {
    expect(deriveStreak(['2026-09-01', '2026-09-02', '2026-09-03'])).toEqual({
      count: 3,
      lastStudyDate: '2026-09-03',
    });
  });

  it('중간에 빈 날이 있으면 마지막 구간만 센다', () => {
    expect(
      deriveStreak(['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06']),
    ).toEqual({ count: 2, lastStudyDate: '2026-09-06' });
  });

  it('마지막 하루가 외따로면 1', () => {
    expect(deriveStreak(['2026-09-01', '2026-09-02', '2026-09-09'])).toEqual({
      count: 1,
      lastStudyDate: '2026-09-09',
    });
  });

  it('달·해를 넘어가도 이어진다', () => {
    expect(deriveStreak(['2026-08-31', '2026-09-01'])).toMatchObject({ count: 2 });
    expect(deriveStreak(['2025-12-31', '2026-01-01'])).toMatchObject({ count: 2 });
  });

  it('정렬이 안 됐거나 중복이 섞여 있어도 같은 답이 나온다', () => {
    expect(
      deriveStreak(['2026-09-03', '2026-09-01', '2026-09-02', '2026-09-03']),
    ).toEqual({ count: 3, lastStudyDate: '2026-09-03' });
  });

  it('기록한 날에서 바로 계산된다 (스토어 → 파생)', () => {
    act(() => {
      store().recordStudyDay(SEOYEON, '2026-09-01');
      store().recordStudyDay(SEOYEON, '2026-09-02');
    });
    expect(deriveStreak(recordOf(SEOYEON)?.studyDays ?? [])).toEqual({
      count: 2,
      lastStudyDate: '2026-09-02',
    });
  });
});

describe('persist 마이그레이션 v0 → v1', () => {
  const KEY = 'pullim-self-learning';

  afterEach(() => {
    window.localStorage.removeItem(KEY);
  });

  it('네임스페이스 이전(평평한) 담기·연속학습 기록은 버린다', async () => {
    // v0 는 `version` 필드 자체가 없다 — 전역 한 통에 ot_* 등록과 카운터만 있었다.
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        state: {
          enrollments: [{ tutorId: 'ot_001', enrolledAt: '2026-06-01T00:00:00.000Z' }],
          streak: { count: 7, lastStudyDate: '2026-06-23' },
          goals: [{ tutorId: 'ot_001', unitId: 'u1', addedAt: '2026-06-01T00:00:00.000Z' }],
          unitProgress: [
            { tutorId: 'ot_001', unitId: 'u1', concept: true, practice: false, check: false },
          ],
        },
      }),
    );

    await act(async () => {
      await useSelfLearningStore.persist.rehydrate();
    });

    // 담기·연속학습은 사라진다 (근거는 self-learning.ts 의 migrate 주석).
    expect(store().byUser).toEqual({});
    expect(JSON.stringify(store().byUser)).not.toContain('ot_');
    // P5 슬라이스는 살아남는다 — ot_* 카탈로그가 아직 /classbot/learn/* 에서 해석된다.
    expect(store().goals).toHaveLength(1);
    expect(store().unitProgress).toHaveLength(1);
  });

  it('v1 데이터는 그대로 살아난다', async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        state: {
          byUser: {
            [SEOYEON]: {
              bots: [{ botId: BOT_A, addedAt: '2026-09-01T00:00:00.000Z' }],
              studyDays: ['2026-09-01', '2026-09-02'],
            },
          },
          goals: [],
          unitProgress: [],
        },
      }),
    );

    await act(async () => {
      await useSelfLearningStore.persist.rehydrate();
    });

    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
    expect(deriveStreak(recordOf(SEOYEON)?.studyDays ?? [])).toMatchObject({ count: 2 });
    expect(recordOf(MINJUN)).toBeUndefined();
  });
});
