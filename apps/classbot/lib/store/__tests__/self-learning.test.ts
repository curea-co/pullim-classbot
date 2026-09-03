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
  useSelfLearningStore.setState({
    byUser: {},
    botsMigratedUserIds: [],
    studyDaysBackfilledUserIds: [],
    goals: [],
    unitProgress: [],
  });
});

describe('담은 봇 — P3 이후 비로그인 데모 전용', () => {
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

  it('남아 있는 행은 사용자별로 갈린 채 읽힌다 — 이관이 남의 봇을 올리지 않게', () => {
    act(() => {
      useSelfLearningStore.setState({
        byUser: {
          [SEOYEON]: { bots: [{ botId: BOT_A, addedAt: '2026-09-01T00:00:00.000Z' }], studyDays: [] },
          [MINJUN]: { bots: [{ botId: BOT_B, addedAt: '2026-09-01T00:00:00.000Z' }], studyDays: [] },
        },
      });
    });
    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
    expect(recordOf(MINJUN)?.bots.map((b) => b.botId)).toEqual([BOT_B]);
  });
});

describe('이관 완료 표시 — 「한 번만」의 그 한 번', () => {
  it('두 번 표시해도 한 칸이고, 사용자별로 따로 남는다', () => {
    act(() => {
      store().markBotsMigrated(SEOYEON);
      store().markBotsMigrated(SEOYEON);
      store().markBotsMigrated(MINJUN);
    });
    expect(store().botsMigratedUserIds).toEqual([SEOYEON, MINJUN]);
  });

  it('빈 사용자 id 는 표시하지 않는다', () => {
    act(() => store().markBotsMigrated(''));
    expect(store().botsMigratedUserIds).toEqual([]);
  });
});

describe('서버가 아는 행 걷기 — dropUploadedBots (계약 §5)', () => {
  it('서버 목록에 있는 행만 걷고, 없는 행은 남긴다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().addSelfBot(SEOYEON, BOT_B);
      store().dropUploadedBots(SEOYEON, [BOT_A]);
    });
    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_B]);
  });

  it('남의 통은 건드리지 않는다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().addSelfBot(MINJUN, BOT_A);
      store().dropUploadedBots(SEOYEON, [BOT_A]);
    });
    expect(recordOf(SEOYEON)?.bots).toEqual([]);
    expect(recordOf(MINJUN)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
  });

  it('빈 목록은 아무것도 걷지 않는다 — 서버가 「하나도 없다」고 답한 것과 「모른다」를 섞지 않는다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().dropUploadedBots(SEOYEON, []);
    });
    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
  });

  it('걷을 게 없으면 스토어를 흔들지 않는다 — 서버 목록이 올 때마다 도는 자리다', () => {
    act(() => store().addSelfBot(SEOYEON, BOT_A));
    const before = useSelfLearningStore.getState().byUser;
    act(() => store().dropUploadedBots(SEOYEON, [BOT_B]));
    expect(useSelfLearningStore.getState().byUser).toBe(before);
  });

  it('공부한 날은 건드리지 않는다 — 이번에 걷는 것은 담은 봇뿐이다', () => {
    act(() => {
      store().addSelfBot(SEOYEON, BOT_A);
      store().recordStudyDay(SEOYEON, '2026-09-01');
      store().dropUploadedBots(SEOYEON, [BOT_A]);
    });
    expect(recordOf(SEOYEON)?.bots).toEqual([]);
    expect(recordOf(SEOYEON)?.studyDays).toEqual(['2026-09-01']);
  });
});

describe('백필 완료 표시 — 담은 봇 이관과 따로 센다', () => {
  it('두 번 표시해도 한 칸이고, 사용자별로 따로 남는다', () => {
    act(() => {
      store().markStudyDaysBackfilled(SEOYEON);
      store().markStudyDaysBackfilled(SEOYEON);
      store().markStudyDaysBackfilled(MINJUN);
    });
    expect(store().studyDaysBackfilledUserIds).toEqual([SEOYEON, MINJUN]);
  });

  it('빈 사용자 id 는 표시하지 않는다', () => {
    act(() => store().markStudyDaysBackfilled(''));
    expect(store().studyDaysBackfilledUserIds).toEqual([]);
  });

  /** 두 이관은 다른 단계에 다른 라우트로 나갔다 — 한쪽 성공이 다른 쪽을 건너뛰게 하면 안 된다. */
  it('담은 봇 이관 표시와 서로 영향을 주지 않는다', () => {
    act(() => store().markBotsMigrated(SEOYEON));
    expect(store().studyDaysBackfilledUserIds).toEqual([]);

    act(() => store().markStudyDaysBackfilled(MINJUN));
    expect(store().botsMigratedUserIds).toEqual([SEOYEON]);
    expect(store().studyDaysBackfilledUserIds).toEqual([MINJUN]);
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
          botsMigratedUserIds: [MINJUN],
          goals: [],
          unitProgress: [],
        },
      }),
    );

    await act(async () => {
      await useSelfLearningStore.persist.rehydrate();
    });

    // 담은 봇의 로컬 사본은 살아남는다 — 이관(계약 §4)이 읽을 유일한 소스다.
    expect(recordOf(SEOYEON)?.bots.map((b) => b.botId)).toEqual([BOT_A]);
    expect(deriveStreak(recordOf(SEOYEON)?.studyDays ?? [])).toMatchObject({ count: 2 });
    expect(recordOf(MINJUN)).toBeUndefined();
    // 완료 표시도 함께 살아남는다 — 안 그러면 매 로드마다 다시 올린다.
    expect(store().botsMigratedUserIds).toEqual([MINJUN]);
    // P4 가 더한 칸은 v1 저장본에 없다. 버전을 올리지 않았고, 기본 병합이 초기값을 남긴다 —
    // 「아직 한 번도 백필 안 함」이라는 맞는 뜻이다(migrate 주석).
    expect(store().studyDaysBackfilledUserIds).toEqual([]);
  });

  it('v0 에서 올라온 사람은 이관 완료 표시가 없다 — 아직 한 번도 안 올렸다', async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ state: { goals: [], unitProgress: [] } }),
    );

    await act(async () => {
      await useSelfLearningStore.persist.rehydrate();
    });

    expect(store().botsMigratedUserIds).toEqual([]);
  });
});
