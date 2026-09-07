import { useEffect, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  useAddSelfBot,
  useIsSelfAdded,
  useMySelfBots,
  useRecordSelfStudyDay,
  useRemoveSelfBot,
  useSelfStreak,
  useSelfStudyDays,
} from '../self-bots';
import {
  useSelfLearningStore,
  useStreak,
  type SelfBotRow,
} from '@/lib/store/self-learning';
// 흉내 서버의 날짜 테두리는 **진짜 라우트가 쓰는 그 함수**다 — 아래 `isAcceptableDay` 주석.
import { isRecordableDay } from '@/app/api/_lib/study-date';

const SEOYEON = 'student_001';
const MINJUN = 'student_002';
const BOT_A = 'cb_001';
const BOT_B = 'cb_002';
const BOT_C = 'cb_003';

// 개발용 신원 전환(계정 스위처)을 흉내 낸다 — 이 훅들이 보는 "나"가 바뀌는 유일한 입구.
let currentUserId = SEOYEON;
jest.mock('@/lib/current-user', () => ({
  useCurrentUserId: () => currentUserId,
}));

/**
 * 서버가 내 명의를 인정하는가 — 담은 봇이 서버로 갈지 데모로 갈지 가르는 값.
 *
 * 기본값은 **개발 신원 쿠키가 있는 상태**다(로컬·dev preview 가 그 모습이고, 아래 대부분의
 * 테스트가 검증하려는 서버 경로다). 공개 데모는 `goDemo()` 로 둘 다 비운다 —
 * prod(`classbot.pullim.ai`)에서는 세션도 없고 `useDevIdentityId()` 가 호스트 게이트에
 * 걸려 빈 문자열이라, 그 조합이 곧 공개 데모다.
 */
let devIdentityId = SEOYEON;
let authUser: { id: string } | null = null;
/**
 * 초기 세션 복원이 끝났는가 — `AuthProvider` 의 `isReady`.
 *
 * 기본값은 **끝난 뒤**(마운트 직후의 현실)다. `false` 로 두면 **세션 복원 대기 구간**을
 * 재현한다: 그때는 로그인한 사람도 `user === null` 이라, 이 값을 안 보면 그 구간이 통째로
 * 「비로그인 데모」로 오판된다(→ 로그인 사용자가 데모 통 `student_001` 의 데이터를 본다).
 * OS SSO 경로에서는 이 복원이 네트워크 왕복이라 한 페인트가 아니라 수백 ms 다.
 */
let authReady = true;
jest.mock('@/lib/use-dev-identity', () => ({
  useDevIdentityId: () => devIdentityId,
}));
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: authReady }),
}));

/**
 * 하이드레이션이 끝났는가 — 기본값은 **끝난 뒤**(마운트 직후의 현실)다.
 *
 * `false` 로 두면 **첫 페인트 상태**를 재현한다. 그때는 쿠키도 세션도 아직 안 읽혀서
 * 신원이 있는 사람도 비로그인으로 보이고, `useCurrentUserId()` 가 데모 폴백을 준다.
 * 실물에서는 `useSyncExternalStore` 가 하이드레이션 커밋에서 갈리므로 훅 모킹만으로는
 * 그 창을 만들 수 없다 — 그래서 이 값으로 만든다.
 */
let storesHydrated = true;
jest.mock('@/lib/store/use-hydrated', () => ({
  useStoresHydrated: () => storesHydrated,
}));

/** 공개 데모(비로그인)로 바꾼다 — 세션도 개발 쿠키도 없는 상태. */
function goDemo(): void {
  devIdentityId = '';
  authUser = null;
}

/* ── 가짜 서버 ────────────────────────────────────────────────────────────────
 * `fetch` 를 통째로 가로챈다. 훅이 아니라 **HTTP 를 상대로** 검증하기 위한 것 —
 * URL·메서드·본문이 계약 §2 와 어긋나면 여기서 걸린다.
 * 신원은 실제와 같은 규약으로 잡는다: 요청에 명의를 싣지 않고 **서버가 호출자를 안다**
 * (실제로는 신원 쿠키·JWT). 그래서 `currentUserId` 를 그대로 읽는다.
 * -------------------------------------------------------------------------- */

/** 사용자 id → 그 사람이 담은 봇(담은 순). */
let serverBots: Record<string, SelfBotRow[]>;
/** 사용자 id → 그 사람이 공부한 날(오름차순). */
let serverDays: Record<string, string[]>;
/** 오간 요청 전부 — 「한 번만 올린다」를 세는 자리. */
let calls: {
  method: string;
  path: string;
  body?: { botId?: string; date?: string; days?: string[] };
}[];
/** botId → 이 봇을 담으려 하면 낼 응답 코드(이관 실패 시나리오용). */
let addFailures: Record<string, number>;
/** 0 이 아니면 백필 라우트가 그 코드로 답한다(백필 실패 시나리오용). */
let backfillFailure: number;
/** 0 이 아니면 공부한 날 조회가 그 코드로 답한다. */
let daysListFailure: number;

/**
 * 서버가 아는 「오늘」 — KST. 진짜 시계를 읽지 않는다.
 *
 * 날짜를 생략한 기록의 답과 「미래는 거절」의 기준이 **서버 쪽에 있다**는 것이 계약 §2 라,
 * 테스트에서도 그 판정을 서버 흉내 쪽에 둔다. 클라이언트가 자기 오늘을 만들어 보내면
 * 이 상수와 어긋나 곧바로 드러난다.
 */
const SERVER_TODAY = '2026-09-03';

/**
 * 서버가 받아 주는 날짜인가 — 형식·달력·미래·2년 이전(계약 §2).
 *
 * ⚠️ **판정을 여기서 다시 적지 마라.** 라우트가 쓰는 `isRecordableDay` 를 그대로 부른다.
 * 손으로 다시 적었을 때 실제로 새던 구멍이 있다: 정규식 + `Date.parse` 로는
 * `Date.parse('2026-02-30')` 가 `NaN` 이 아니라 **2026-03-02 로 정규화**되어 통과한다.
 * 그러면 훅이 달력에 없는 날을 보내는 회귀를 이 테스트가 못 잡는다 — 진짜 서버는
 * `study-date.ts` 의 round-trip 검사로 400 을 내는데, 흉내 서버만 받아 주기 때문이다.
 *
 * 흉내 서버가 느슨하면 테스트는 초록인데 배포는 400 이다. 그러니 테두리는 한 곳에서만
 * 온다 — **`app/api/_lib/study-date.ts`**. 2년 하한도 그 함수가 `SERVER_TODAY` 에서
 * 직접 계산하므로 여기 상수로 박아 두지 않는다(박아 두면 또 갈라진다).
 */
function isAcceptableDay(day: unknown): day is string {
  return isRecordableDay(day, SERVER_TODAY);
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const path = String(input);
  const method = init?.method ?? 'GET';
  const body = init?.body
    ? (JSON.parse(String(init.body)) as { botId?: string; date?: string; days?: string[] })
    : undefined;
  calls.push({ method, path, body });

  const rows = (serverBots[currentUserId] ??= []);
  const days = (serverDays[currentUserId] ??= []);

  if (method === 'GET' && path === '/api/me/study-days') {
    if (daysListFailure) {
      return Promise.resolve(
        jsonResponse(daysListFailure, { message: '서버 오류', code: 'UNKNOWN' }),
      );
    }
    return Promise.resolve(jsonResponse(200, { days: [...days].sort() }));
  }

  if (method === 'POST' && path === '/api/me/study-days') {
    const day = body?.date ?? SERVER_TODAY;
    if (!isAcceptableDay(day)) {
      return Promise.resolve(
        jsonResponse(400, { message: '기록할 수 없는 날짜예요.', code: 'INVALID_INPUT' }),
      );
    }
    if (days.includes(day)) {
      return Promise.resolve(jsonResponse(200, { recorded: true, date: day })); // 멱등
    }
    days.push(day);
    days.sort();
    return Promise.resolve(jsonResponse(201, { recorded: true, date: day }));
  }

  if (method === 'POST' && path === '/api/me/study-days/backfill') {
    if (backfillFailure) {
      return Promise.resolve(
        jsonResponse(backfillFailure, { message: '올리지 못했어요.', code: 'UNKNOWN' }),
      );
    }
    const sent = body?.days ?? [];
    if (sent.length > 400) {
      return Promise.resolve(
        jsonResponse(400, { message: '한 번에 너무 많아요.', code: 'INVALID_INPUT' }),
      );
    }
    let inserted = 0;
    for (const day of sent) {
      // 형식·미래·2년 이전·중복은 전부 skip 이다 — 400 으로 요청 전체를 죽이지 않는다.
      if (!isAcceptableDay(day) || days.includes(day)) continue;
      days.push(day);
      inserted += 1;
    }
    days.sort();
    return Promise.resolve(
      jsonResponse(200, { inserted, skipped: sent.length - inserted }),
    );
  }

  if (method === 'GET' && path === '/api/me/self-bots') {
    return Promise.resolve(jsonResponse(200, { bots: [...rows] }));
  }

  if (method === 'POST' && path === '/api/me/self-bots') {
    const botId = body?.botId ?? '';
    const failure = addFailures[botId];
    if (failure) {
      return Promise.resolve(
        jsonResponse(failure, { message: '담지 못했어요.', code: 'NOT_FOUND' }),
      );
    }
    const existing = rows.find((b) => b.botId === botId);
    if (existing) return Promise.resolve(jsonResponse(200, { bot: existing })); // 멱등
    const row = { botId, addedAt: new Date().toISOString() };
    rows.push(row);
    return Promise.resolve(jsonResponse(201, { bot: row }));
  }

  if (method === 'DELETE' && path.startsWith('/api/me/self-bots/')) {
    const botId = decodeURIComponent(path.slice('/api/me/self-bots/'.length));
    const before = rows.length;
    serverBots[currentUserId] = rows.filter((b) => b.botId !== botId);
    return Promise.resolve(jsonResponse(200, { removed: serverBots[currentUserId].length < before }));
  }

  return Promise.resolve(jsonResponse(404, { message: '없어요.', code: 'NOT_FOUND' }));
}

/** 담은 봇 GET 이 몇 번 나갔나 — 무효화가 실제로 다시 읽었는지 세는 자리. */
const getCount = () =>
  calls.filter((c) => c.method === 'GET' && c.path === '/api/me/self-bots').length;
/** 이 봇을 담으려는 POST 가 몇 번 나갔나. */
const addCount = (botId: string) =>
  calls.filter((c) => c.method === 'POST' && c.body?.botId === botId).length;
/** 백필 요청이 몇 번 나갔나 — 「한 번만」을 세는 자리. */
const backfillCalls = () =>
  calls.filter((c) => c.path === '/api/me/study-days/backfill');
/** 백필로 실제 올라간 날짜 전부(나눠 보냈으면 합쳐서). */
const backfilledDays = () => backfillCalls().flatMap((c) => c.body?.days ?? []);

/**
 * 학습 화면(`app/(student)/classbot/learn/[tutorId]/page.tsx`)이 훅을 쓰는 모양 그대로.
 *
 * **마운트 effect 에서 기록을 부른다** — 이 자리가 하이드레이션 창과 겹쳐서, 훅이 판정을
 * 의존성에 넣으면 루프가 되고 첫 페인트에 로컬로 쓰면 남의 통에 들어간다.
 */
function useLearnPageLike(): { data: string[] } {
  const { mutate } = useRecordSelfStudyDay();
  useEffect(() => {
    mutate();
  }, [mutate]);
  return useSelfStudyDays();
}

/** 테스트 하나가 쓰는 QueryClient — 신원을 바꿔도 **같은 캐시**여야 분리를 증명한다. */
let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** 로컬(P1·P2)에 담겨 있던 행을 심는다 — 이관의 소스. */
function seedLocalBots(userId: string, botIds: string[]): void {
  seedLocal(userId, { bots: botIds.map((botId) => ({ botId, addedAt: '2026-09-01T00:00:00.000Z' })) });
}

/** 로컬(P1~P3)에 쌓여 있던 공부한 날을 심는다 — 백필의 소스. */
function seedLocalDays(userId: string, studyDays: string[]): void {
  seedLocal(userId, { studyDays });
}

/** 한 사용자 통을 통째로 심는다(안 준 칸은 빈 값). */
function seedLocal(
  userId: string,
  patch: { bots?: SelfBotRow[]; studyDays?: string[] },
): void {
  const byUser = useSelfLearningStore.getState().byUser;
  useSelfLearningStore.setState({
    byUser: {
      ...byUser,
      [userId]: {
        bots: patch.bots ?? byUser[userId]?.bots ?? [],
        studyDays: patch.studyDays ?? byUser[userId]?.studyDays ?? [],
      },
    },
  });
}

beforeEach(() => {
  currentUserId = SEOYEON;
  devIdentityId = SEOYEON;
  authUser = null;
  authReady = true;
  storesHydrated = true;
  serverBots = {};
  serverDays = {};
  calls = [];
  addFailures = {};
  backfillFailure = 0;
  daysListFailure = 0;
  useSelfLearningStore.setState({
    byUser: {},
    botsMigratedUserIds: [],
    studyDaysBackfilledUserIds: [],
    goals: [],
    unitProgress: [],
  });
  queryClient = new QueryClient({
    // `retry` 는 훅이 스스로 정한다(401 은 안 하고 5xx 는 한 번). 여기서는 그 재시도가
    // 기본 백오프(1초)를 기다리지 않게 지연만 0 으로 둔다 — 안 그러면 waitFor 가 먼저 지친다.
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('시그니처 동결 (계약 §3)', () => {
  it('조회는 세 칸, 쓰기는 두 칸 — 화면이 읽는 모양이 그대로다', async () => {
    const { result } = renderHook(
      () => ({ list: useMySelfBots(), add: useAddSelfBot(), remove: useRemoveSelfBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));

    expect(Object.keys(result.current.list).sort()).toEqual(['data', 'isError', 'isLoading']);
    expect(Object.keys(result.current.add).sort()).toEqual(['isPending', 'mutate']);
    expect(Object.keys(result.current.remove).sort()).toEqual(['isPending', 'mutate']);
    expect(typeof result.current.add.mutate).toBe('function');
    expect(result.current.add.isPending).toBe(false);
  });
});

describe('useMySelfBots — 서버에서 읽는다', () => {
  it('응답 전에는 data 가 undefined 다 — 잠깐이라도 [] 를 주면 「담은 봇 없음」이 그려진다', async () => {
    serverBots[SEOYEON] = [{ botId: BOT_A, addedAt: '2026-09-01T00:00:00.000Z' }];
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]);
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/me/self-bots' });
  });

  it('담은 게 없으면 빈 배열 — 그때서야 [] 다', async () => {
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(result.current.isError).toBe(false);
  });

  it('실패하면 isError 가 켜지고 data 는 undefined 로 남는다', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(jsonResponse(500, { message: '서버 오류', code: 'UNKNOWN' })),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('담기 / 빼기 — 서버에 쓰고 목록을 다시 읽는다', () => {
  it('담으면 useIsSelfAdded 가 켜지고, 빼면 꺼진다', async () => {
    const { result } = renderHook(
      () => ({
        list: useMySelfBots(),
        added: useIsSelfAdded(BOT_A),
        add: useAddSelfBot(),
        remove: useRemoveSelfBot(),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));
    expect(result.current.added).toBe(false);

    await act(async () => result.current.add.mutate(BOT_A));
    await waitFor(() => expect(result.current.added).toBe(true));
    expect(calls.some((c) => c.method === 'POST' && c.body?.botId === BOT_A)).toBe(true);
    expect(serverBots[SEOYEON].map((b) => b.botId)).toEqual([BOT_A]);

    await act(async () => result.current.remove.mutate(BOT_A));
    await waitFor(() => expect(result.current.added).toBe(false));
    expect(calls.some((c) => c.method === 'DELETE' && c.path === `/api/me/self-bots/${BOT_A}`)).toBe(
      true,
    );
    expect(serverBots[SEOYEON]).toEqual([]);
  });

  it('담기·빼기가 목록을 무효화한다 — 서버가 정본이라 다시 읽어 맞춘다', async () => {
    const { result } = renderHook(
      () => ({ list: useMySelfBots(), add: useAddSelfBot(), remove: useRemoveSelfBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));
    const afterFirstRead = getCount();

    await act(async () => result.current.add.mutate(BOT_A));
    await waitFor(() => expect(getCount()).toBeGreaterThan(afterFirstRead));
    const afterAdd = getCount();

    await act(async () => result.current.remove.mutate(BOT_A));
    await waitFor(() => expect(getCount()).toBeGreaterThan(afterAdd));
  });

  it('botId 가 없으면 언제나 false', async () => {
    const { result } = renderHook(() => useIsSelfAdded(null), { wrapper: Wrapper });
    expect(result.current).toBe(false);
    await waitFor(() => expect(getCount()).toBeGreaterThan(0));
    expect(result.current).toBe(false);
  });

  /**
   * ⛔ 계약 §1 tripwire. 담기는 **반 참여가 아니다.**
   *
   * `enrollments` 의 PK 는 `(bot_id, student_id)` 라, 담기가 거기 행을 만들면 나중에 진짜
   * 참여 코드로 들어갈 때 `onConflictDoNothing` 에 걸려 **학생이 그 반에 영영 못 들어간다.**
   * 참여 인원도 그 표의 행 수로 세므로 교사의 학생 수까지 부푼다. 되돌리기 어려운 쪽이라
   * 「안 만든다」를 코드가 아니라 **나가는 요청**에 대고 못박아 둔다.
   */
  it('⛔ 담기가 enrollments 를 만들지 않는다 (계약 §1)', async () => {
    const { result } = renderHook(
      () => ({ list: useMySelfBots(), add: useAddSelfBot(), remove: useRemoveSelfBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));

    await act(async () => result.current.add.mutate(BOT_A));
    await waitFor(() => expect(serverBots[SEOYEON].map((b) => b.botId)).toEqual([BOT_A]));
    await act(async () => result.current.remove.mutate(BOT_A));

    // 담기·빼기가 오간 길은 self-bots 하나뿐이다 — 참여·과제 라우트는 건드리지 않는다.
    for (const c of calls) {
      expect(c.path.startsWith('/api/me/self-bots')).toBe(true);
    }
    expect(calls.some((c) => /enrollment|assignment|join/i.test(c.path))).toBe(false);
  });
});

describe('사용자별 분리 — 계정을 오가도 남의 목록이 남지 않는다', () => {
  it('신원이 바뀌면 캐시가 갈린다 (queryKey 꼬리)', async () => {
    serverBots[SEOYEON] = [{ botId: BOT_A, addedAt: '2026-09-01T00:00:00.000Z' }];
    serverBots[MINJUN] = [{ botId: BOT_B, addedAt: '2026-09-01T00:00:00.000Z' }];

    const { result, rerender } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));

    currentUserId = MINJUN;
    rerender();
    // 캐시가 갈렸다는 증거 — 서연의 목록이 그대로 남지 않고 처음부터 다시 읽는다.
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_B]));

    currentUserId = SEOYEON;
    rerender();
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));
  });
});

/* ── 공개 데모 — 신원이 없으면 서버를 부르지 않는다 ─────────────────────────
 * prod(`classbot.pullim.ai`)가 이 상태다: 로그인 없이 열리고, 서버 라우트는 401 로 답한다.
 * 여기서 서버를 부르면 담기 버튼이 전부 오류가 되므로 예전처럼 localStorage 를 쓴다.
 * -------------------------------------------------------------------------- */

describe('공개 데모 (비로그인)', () => {
  it('⛔ 요청을 한 건도 내보내지 않는다 — 401 을 받는 게 아니라 묻지 않는다', async () => {
    goDemo();
    const { result } = renderHook(
      () => ({ list: useMySelfBots(), add: useAddSelfBot(), remove: useRemoveSelfBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));

    await act(async () => result.current.add.mutate(BOT_A));
    await act(async () => result.current.remove.mutate(BOT_A));

    expect(calls).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('담기·빼기가 localStorage 에 남는다 — P1·P2 와 같은 자리', async () => {
    goDemo();
    const { result } = renderHook(
      () => ({
        list: useMySelfBots(),
        added: useIsSelfAdded(BOT_A),
        add: useAddSelfBot(),
        remove: useRemoveSelfBot(),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));
    expect(result.current.list.data).toEqual([]);

    act(() => result.current.add.mutate(BOT_A));
    expect(result.current.added).toBe(true);
    expect(result.current.list.data?.map((b) => b.botId)).toEqual([BOT_A]);
    expect(
      useSelfLearningStore.getState().byUser[SEOYEON]?.bots.map((b) => b.botId),
    ).toEqual([BOT_A]);

    act(() => result.current.remove.mutate(BOT_A));
    expect(result.current.added).toBe(false);
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots).toEqual([]);
  });

  it('오류도 대기도 없다 — 갈 곳이 없고 쓰기가 동기라서', async () => {
    goDemo();
    const { result } = renderHook(
      () => ({ list: useMySelfBots(), add: useAddSelfBot(), remove: useRemoveSelfBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isLoading).toBe(false));

    act(() => result.current.add.mutate(BOT_A));
    expect(result.current.list.isError).toBe(false);
    expect(result.current.add.isPending).toBe(false);
    expect(result.current.remove.isPending).toBe(false);
  });

  it('이관을 돌리지 않는다 — 올릴 서버가 없는데 완료 표시를 남기면 진짜 이관을 건너뛴다', async () => {
    goDemo();
    seedLocalBots(SEOYEON, [BOT_A]);
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));

    expect(calls).toHaveLength(0);
    expect(useSelfLearningStore.getState().botsMigratedUserIds).toEqual([]);
    // 서버 목록이 없으니 청소도 돌지 않는다 — 이 통은 찌꺼기가 아니라 유일한 사본이다(계약 §5).
    expect(
      useSelfLearningStore.getState().byUser[SEOYEON]?.bots.map((b) => b.botId),
    ).toEqual([BOT_A]);
  });

  it('데모로 담아 둔 뒤 신원이 생기면 그때 올라간다', async () => {
    goDemo();
    const { result, rerender } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 데모에서 담는다 — 이 순간에는 아무 요청도 없다.
    const { result: writer } = renderHook(() => useAddSelfBot(), { wrapper: Wrapper });
    act(() => writer.current.mutate(BOT_A));
    expect(calls).toHaveLength(0);

    // 개발 신원 쿠키가 생긴다(= 로그인). 같은 사용자라 그 통이 그대로 이관 대상이 된다.
    devIdentityId = SEOYEON;
    rerender();

    await waitFor(() => expect(serverBots[SEOYEON]?.map((b) => b.botId)).toEqual([BOT_A]));
    expect(addCount(BOT_A)).toBe(1);
    await waitFor(() =>
      expect(useSelfLearningStore.getState().botsMigratedUserIds).toContain(SEOYEON),
    );
  });
});

describe('한 번만 올리는 이관 (계약 §4)', () => {
  it('로컬에만 있는 행을 올리고, 이미 서버에 있는 행은 다시 올리지 않는다', async () => {
    seedLocalBots(SEOYEON, [BOT_A, BOT_B]);
    serverBots[SEOYEON] = [{ botId: BOT_A, addedAt: '2026-08-01T00:00:00.000Z' }];

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(result.current.data?.map((b) => b.botId).sort()).toEqual([BOT_A, BOT_B]),
    );

    expect(addCount(BOT_B)).toBe(1);
    expect(addCount(BOT_A)).toBe(0); // 서버에 이미 있다
  });

  /**
   * 계약 §5 — P3 가 미룬 청소. 지우는 근거는 **「올리기가 성공했다」가 아니라 「서버 목록에
   * 돌아왔다」**여서, 올린 뒤 무효화가 목록을 다시 읽은 다음에 걷힌다.
   */
  it('서버 목록에 돌아온 행은 로컬에서 걷는다 (계약 §5)', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));

    await waitFor(() =>
      expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots).toEqual([]),
    );
  });

  /**
   * ⛔ 계약 §5 의 판별자는 **`botsMigratedUserIds`** 다. 그 목록에 없는 통은 서버를 만난 적이
   * 없는 **공개 데모의 유일한 사본**이라, 서버가 같은 botId 를 알고 있어도 걷지 않는다.
   *
   * 여기서는 「올리기가 다시 해 볼 만하게 실패해 표시가 안 남은」 상태로 그 조건을 만든다 —
   * 서버는 BOT_A 를 알고 있지만 이 통은 아직 이관을 마치지 않았다.
   */
  it('⛔ 완료 표시가 없는 통은 서버가 그 행을 알아도 걷지 않는다', async () => {
    seedLocalBots(SEOYEON, [BOT_A, BOT_B]);
    serverBots[SEOYEON] = [{ botId: BOT_A, addedAt: '2026-08-01T00:00:00.000Z' }];
    addFailures[BOT_B] = 503; // 다시 해 볼 만한 실패 → 완료 표시가 남지 않는다

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(addCount(BOT_B)).toBe(1));
    await waitFor(() =>
      expect(useSelfLearningStore.getState().botsMigratedUserIds).not.toContain(SEOYEON),
    );

    // 서버가 BOT_A 를 돌려줬지만 표시가 없으니 두 행 다 그대로다.
    expect(
      useSelfLearningStore.getState().byUser[SEOYEON]?.bots.map((b) => b.botId),
    ).toEqual([BOT_A, BOT_B]);
    expect(result.current.isError).toBe(false);
  });

  it('P3 시절 찌꺼기도 걷는다 — 이관을 이미 마친 사람이라 다시 올리지는 않는다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    serverBots[SEOYEON] = [{ botId: BOT_A, addedAt: '2026-08-01T00:00:00.000Z' }];
    useSelfLearningStore.setState({ botsMigratedUserIds: [SEOYEON] });

    renderHook(() => useMySelfBots(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots).toEqual([]),
    );
    expect(addCount(BOT_A)).toBe(0); // 완료 표시가 있어 이관은 돌지 않았다
  });

  it('두 번 마운트해도 한 번만 올린다 — 완료 표시가 남는다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);

    const first = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));
    expect(useSelfLearningStore.getState().botsMigratedUserIds).toContain(SEOYEON);
    expect(addCount(BOT_A)).toBe(1);
    first.unmount();

    const second = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(second.result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));
    expect(addCount(BOT_A)).toBe(1); // 늘지 않았다
  });

  it('같은 화면에 훅이 여럿이어도 한 번만 올린다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    const { result } = renderHook(
      () => ({ a: useMySelfBots(), b: useMySelfBots(), added: useIsSelfAdded(BOT_A) }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.added).toBe(true));
    expect(addCount(BOT_A)).toBe(1);
  });

  it('올릴 게 없어도 완료 표시를 남긴다 — 매 로드마다 다시 훑지 않는다', async () => {
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(useSelfLearningStore.getState().botsMigratedUserIds).toContain(SEOYEON);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('남의 로컬 행은 올리지 않는다 — 명의는 지금 신원이다', async () => {
    seedLocalBots(MINJUN, [BOT_C]);
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));

    expect(addCount(BOT_C)).toBe(0);
    expect(serverBots[SEOYEON]).toEqual([]);
    expect(useSelfLearningStore.getState().botsMigratedUserIds).not.toContain(MINJUN);
  });

  it('서버 목록을 못 읽으면 아무것도 올리지 않는다 — 무엇이 이미 있는지 모른다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    global.fetch = jest.fn(() =>
      Promise.resolve(jsonResponse(500, { message: '서버 오류', code: 'UNKNOWN' })),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useSelfLearningStore.getState().botsMigratedUserIds).not.toContain(SEOYEON);
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots).toHaveLength(1);
  });

  it('올리기가 실패해도 화면은 살아 있고, 다시 해 볼 만한 실패면 표시를 남기지 않는다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    addFailures[BOT_A] = 503;

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));

    await waitFor(() => expect(addCount(BOT_A)).toBe(1));
    expect(result.current.isError).toBe(false); // 이관 실패가 화면을 죽이지 않는다
    await waitFor(() =>
      expect(useSelfLearningStore.getState().botsMigratedUserIds).not.toContain(SEOYEON),
    );
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots).toHaveLength(1);
  });

  it('없는 봇(404)은 다시 해도 같으니 표시를 남기고 넘어간다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    addFailures[BOT_A] = 404;

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
    await waitFor(() =>
      expect(useSelfLearningStore.getState().botsMigratedUserIds).toContain(SEOYEON),
    );
    expect(result.current.isError).toBe(false);
    // 서버 목록에 끝내 안 돌아온 행이라 **로컬에 남는다** — 그게 유일한 사본이다(계약 §5).
    expect(
      useSelfLearningStore.getState().byUser[SEOYEON]?.bots.map((b) => b.botId),
    ).toEqual([BOT_A]);
  });
});

/* ── 공부한 날 · 연속 학습 — 서버 (계약 §3) ────────────────────────────────── */

describe('공부한 날 — 서버에서 읽고 쓴다', () => {
  it('서버가 준 날짜를 그대로 읽는다', async () => {
    serverDays[SEOYEON] = ['2026-09-01', '2026-09-02'];
    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual(['2026-09-01', '2026-09-02']),
    );
    expect(calls.some((c) => c.method === 'GET' && c.path === '/api/me/study-days')).toBe(
      true,
    );
  });

  it('기록하면 서버에 남는다 — 같은 날 두 번 눌러도 한 칸이다', async () => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.days.data).toEqual([]));

    await act(async () => result.current.record.mutate('2026-09-02'));
    await act(async () => result.current.record.mutate('2026-09-02'));

    await waitFor(() => expect(result.current.days.data).toEqual(['2026-09-02']));
    expect(serverDays[SEOYEON]).toEqual(['2026-09-02']);
  });

  /**
   * 「오늘」을 두 벌 만들지 않는다 — 클라이언트가 자기 시계로 날짜를 지어내 보내면
   * 기기 시간대만큼 남의 날짜가 된다. 본문은 빈 객체로 가고 **서버가 정한 날**이 돌아온다.
   */
  it('날짜를 안 주면 서버가 오늘을 정한다 — 본문은 빈 객체다', async () => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.days.data).toEqual([]));

    await act(async () => result.current.record.mutate());

    await waitFor(() => expect(result.current.days.data).toEqual([SERVER_TODAY]));
    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/me/study-days');
    expect(post?.body).toEqual({});
  });

  /**
   * ⛔ 회귀 방지. 「생략」을 truthy 로 가르면(`date ? { date } : {}`) **빈 문자열이 생략으로
   * 바뀐다.** 그러면 서버가 400 으로 막을 값이 조용히 **오늘 기록**이 되고, 부르는 쪽은
   * 자기가 못 쓸 값을 보냈다는 사실을 영영 모른다. 훅은 서버 계약을 감추지 않는다.
   */
  it('⛔ 빈 문자열은 「생략」이 아니다 — 그대로 실어 보내고 서버가 막는다', async () => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.days.data).toEqual([]));

    await act(async () => result.current.record.mutate(''));

    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/me/study-days');
    // 본문에 빈 문자열이 그대로 실린다 — `{}` 로 바뀌지 않는다.
    expect(post?.body).toEqual({ date: '' });
    // 그리고 아무 날도 안 남는다. 여기가 `{}` 였다면 오늘이 기록됐을 것이다.
    await waitFor(() => expect(serverDays[SEOYEON] ?? []).toEqual([]));
  });

  /**
   * ⛔ 흉내 서버의 테두리가 진짜 라우트보다 느슨하면 이 테스트 전체가 헛것이 된다.
   * `Date.parse('2026-02-30')` 는 `NaN` 이 아니라 2026-03-02 로 정규화되므로, 정규식 +
   * `Date.parse` 로 손수 적은 판정은 달력에 없는 날을 통과시킨다. 그래서 흉내 서버는
   * 라우트가 쓰는 `isRecordableDay` 를 그대로 부른다 — 이 테스트가 그 사실을 지킨다.
   */
  it.each([
    ['달력에 없는 날', '2026-02-30'],
    ['13월', '2026-13-01'],
    ['미래(KST)', '2026-09-04'],
    ['2년보다 오래된 날', '2019-05-05'],
    ['형식이 어긋난 값', '20260903'],
  ])('%s 은 서버가 거절한다 — 한 날도 안 남는다', async (_label, date) => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.days.data).toEqual([]));

    await act(async () => result.current.record.mutate(date));

    const post = calls.find((c) => c.method === 'POST' && c.path === '/api/me/study-days');
    expect(post?.body).toEqual({ date });
    await waitFor(() => expect(serverDays[SEOYEON] ?? []).toEqual([]));
  });

  /**
   * ⛔ 회귀 방지. 학습 화면이 이 `mutate` 를 **effect 의존성**에 넣고 부른다
   * (`app/(student)/classbot/learn/[tutorId]/page.tsx`). 정체가 왕복마다 바뀌면 effect 가
   * 다시 돌고 또 왕복해 **무한 루프**가 된다 — P4 첫 판이 실제로 그랬다(초당 수천 건).
   */
  it('⛔ mutate 정체가 고정이다 — effect 에서 불러도 한 번만 나간다', async () => {
    const { result } = renderHook(() => useLearnPageLike(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([SERVER_TODAY]));
    // 왕복이 끝나 `isPending` 이 다시 바뀐 뒤에도 늘지 않는다.
    await waitFor(() => expect(serverDays[SEOYEON]).toEqual([SERVER_TODAY]));
    expect(
      calls.filter((c) => c.method === 'POST' && c.path === '/api/me/study-days'),
    ).toHaveLength(1);
  });

  /**
   * ⛔ 첫 페인트에서는 **모두가 「아무도 아니다」.** 그 순간 로컬에 쓰면 민준의 공부한 날이
   * 데모 폴백(서연)의 통에 들어가고, P4 의 백필이 그것을 **서연 명의로 서버에 올린다.**
   * 그래서 판정이 설 때까지 들고 있다가 그때 보낸다 — 기록을 버리지도 않는다.
   *
   * (브라우저 실측이 근거다: `pullim_dev_identity=s2` 로 학습 화면을 열면 서버에는 `s2` 로
   * 남는데 localStorage 에는 `byUser.student_001` 에 적혔다.)
   */
  it('⛔ 첫 페인트의 「아무도 아님」에 로컬로 쓰지 않고, 신원이 서면 그쪽으로 보낸다', async () => {
    storesHydrated = false;
    devIdentityId = ''; // 쿠키를 아직 못 읽었다 — 비로그인과 구별되지 않는 구간
    currentUserId = SEOYEON; // 그 구간의 `useCurrentUserId()` = 데모 폴백

    const { rerender } = renderHook(() => useLearnPageLike(), { wrapper: Wrapper });

    // 어느 통에도 쓰지 않았다.
    expect(useSelfLearningStore.getState().byUser).toEqual({});
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);

    // 하이드레이션 — 쿠키가 읽히고 진짜 신원이 정해진다.
    storesHydrated = true;
    devIdentityId = SEOYEON;
    rerender();

    await waitFor(() => expect(serverDays[SEOYEON]).toEqual([SERVER_TODAY]));
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/api/me/study-days')).toHaveLength(1);
    expect(useSelfLearningStore.getState().byUser).toEqual({}); // 로컬에는 끝내 안 썼다
  });

  it('연속일수는 서버 날짜에서 계산된다 — 숫자를 받아 오지 않는다', async () => {
    serverDays[SEOYEON] = ['2026-09-01', '2026-09-02', '2026-09-03'];
    const { result } = renderHook(() => useSelfStreak(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({ count: 3, lastStudyDate: '2026-09-03' }),
    );
    // 서버 응답에 연속일수 같은 숫자 칸이 없다는 것 — 계약 §1.
    const listed = calls.filter((c) => c.path === '/api/me/study-days' && c.method === 'GET');
    expect(listed.length).toBeGreaterThan(0);
    expect(calls.some((c) => /streak|count/i.test(c.path))).toBe(false);
  });

  it('빈 날을 사이에 두면 연속이 끊긴다', async () => {
    serverDays[SEOYEON] = ['2026-09-01', '2026-09-02', '2026-09-05'];
    const { result } = renderHook(() => useSelfStreak(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(result.current).toEqual({ count: 1, lastStudyDate: '2026-09-05' }),
    );
  });

  it('신원이 바뀌면 남의 날짜가 남지 않는다 (queryKey 꼬리)', async () => {
    serverDays[SEOYEON] = ['2026-09-01', '2026-09-02'];
    serverDays[MINJUN] = ['2026-09-03'];

    const { result, rerender } = renderHook(() => useSelfStreak(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.count).toBe(2));

    currentUserId = MINJUN;
    rerender();
    await waitFor(() =>
      expect(result.current).toEqual({ count: 1, lastStudyDate: '2026-09-03' }),
    );
  });

  /**
   * 셸 헤더 뱃지(`components/shell/app-header.tsx`)가 부르는 이름. 화면 파일을 건드리지
   * 않고 출처만 서버로 옮겼다 — `useSelfStreak()` 와 **같은 값**이어야 한다.
   */
  it('셸 뱃지의 useStreak() 도 같은 값을 서버에서 읽는다', async () => {
    serverDays[SEOYEON] = ['2026-09-02', '2026-09-03'];
    const { result } = renderHook(
      () => ({ shell: useStreak(), page: useSelfStreak() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.shell.count).toBe(2));
    expect(result.current.shell).toEqual(result.current.page);
  });
});

/**
 * ⛔ **세션 복원 대기 구간** — 「아직 모른다」를 「비로그인 데모」로 접으면 로그인 사용자가
 * 남의 데이터를 본다.
 *
 * `AuthProvider` 는 `getSession()` 이 끝나야 `isReady` 를 세우고, 그동안 `user` 는 로그인한
 * 사람도 `null` 이다. 그 구간에 로컬을 정본으로 삼으면 `useCurrentUserId()` 가 주는 데모
 * 폴백(`student_001`)의 통을 읽게 된다 — 담은 봇도, 공부한 날도, 셸 뱃지의 연속일수도.
 * OS SSO 경로에서는 그 복원이 네트워크 왕복이라 한 페인트가 아니라 수백 ms 다.
 *
 * 쓰기 쪽은 처음부터 막혀 있었고(`useRecordSelfStudyDay` 의 ⛔ ②) 읽기 쪽만 뚫려 있었다.
 * 아래 넷이 그 구멍을 막아 둔다.
 */
describe('⛔ 세션 복원 대기 — 어느 쪽 데이터도 보여 주지 않는다', () => {
  /** 로그인 사용자인데 아직 세션이 복원되지 않은 상태(쿠키도 없다 = prod 로그인 사용자). */
  function goRestoring(): void {
    devIdentityId = '';
    authUser = null;
    authReady = false;
  }

  it('담은 봇은 로딩이다 — 데모 통의 목록을 그리지 않는다', async () => {
    // 데모 폴백 통에 남의 봇이 들어 있다. 복원 전에 이게 보이면 안 된다.
    seedLocalBots(SEOYEON, [BOT_A, BOT_B]);
    goRestoring();

    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    // 아직 누구인지 모르므로 서버에도 묻지 않는다(이 키의 userId 가 데모 폴백이라
    // 그 상태로 물으면 남의 키에 응답이 캐시된다).
    expect(calls).toHaveLength(0);
  });

  it('공부한 날은 빈 배열이다 — 데모 통의 날짜를 그리지 않는다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01', '2026-09-02']);
    goRestoring();

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });

    expect(result.current.data).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('셸 뱃지의 연속일수도 0 이다 — 0 이면 뱃지가 숨는다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-02', '2026-09-03']);
    goRestoring();

    const { result } = renderHook(() => ({ shell: useStreak(), page: useSelfStreak() }), {
      wrapper: Wrapper,
    });

    // 데모로 접었다면 여기가 2 였다 — 로그인 사용자가 남의 연속일수를 보는 자리다.
    expect(result.current.shell).toEqual({ count: 0, lastStudyDate: null });
    expect(result.current.page).toEqual({ count: 0, lastStudyDate: null });
  });

  it('복원이 끝나면 그제야 갈린다 — 세션이 있으면 서버로 간다', async () => {
    // 로컬은 비워 둔다 — 여기서 보려는 건 「갈래가 언제 정해지는가」 하나다.
    // (로컬에 날짜가 있으면 복원 직후 백필이 그걸 올려서 목록이 합쳐진다 — 다른 테스트의 몫.)
    goRestoring();
    serverDays[SEOYEON] = ['2026-09-02', '2026-09-03'];

    const { result, rerender } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    expect(result.current.data).toEqual([]);

    // getSession() 이 끝나고 세션이 복원됐다.
    authUser = { id: SEOYEON };
    authReady = true;
    rerender();

    await waitFor(() => expect(result.current.data).toEqual(['2026-09-02', '2026-09-03']));
  });

  it('복원이 끝났는데 세션이 없으면 그때 데모로 굳는다 — 로컬이 정본이다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    goRestoring();

    const { result, rerender } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    expect(result.current.data).toEqual([]);

    authReady = true; // 복원 끝 · 세션 없음 = 진짜 익명
    rerender();

    await waitFor(() => expect(result.current.data).toEqual(['2026-09-01']));
    expect(calls).toHaveLength(0); // 데모는 끝까지 서버를 부르지 않는다
  });

  it('복원 대기 중의 쓰기는 어느 쪽에도 남지 않는다 — 데모 통을 더럽히지 않는다', async () => {
    goRestoring();

    const { result } = renderHook(
      () => ({ add: useAddSelfBot(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.add.mutate(BOT_A));
    act(() => result.current.record.mutate('2026-09-02'));

    // 서버에도 안 가고, 데모 폴백 통에도 안 적힌다.
    expect(calls).toHaveLength(0);
    expect(useSelfLearningStore.getState().byUser[SEOYEON]).toBeUndefined();
  });
});

describe('공개 데모 — 공부한 날도 서버에 가지 않는다', () => {
  it('⛔ 요청을 한 건도 내보내지 않고 localStorage 에 남는다', async () => {
    goDemo();
    const { result } = renderHook(
      () => ({
        days: useSelfStudyDays(),
        streak: useSelfStreak(),
        record: useRecordSelfStudyDay(),
      }),
      { wrapper: Wrapper },
    );

    act(() => result.current.record.mutate('2026-09-02'));
    act(() => result.current.record.mutate('2026-09-03'));

    expect(calls).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.days.data).toEqual(['2026-09-02', '2026-09-03']);
    expect(result.current.streak).toEqual({ count: 2, lastStudyDate: '2026-09-03' });
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.studyDays).toEqual([
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('백필을 돌리지 않는다 — 올릴 서버가 없는데 완료 표시를 남기면 진짜 백필을 건너뛴다', async () => {
    goDemo();
    seedLocalDays(SEOYEON, ['2026-09-01']);
    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(['2026-09-01']));
    expect(calls).toHaveLength(0);
    expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toEqual([]);
  });

  /**
   * ⛔ 미뤄 두는 장치(`deferred`)가 **데모의 기록을 삼키면 안 된다.** 하이드레이션 전에
   * 들어온 기록은 버려지는 게 아니라 판정이 선 뒤 로컬로 간다.
   */
  it('학습 화면처럼 마운트 effect 에서 불러도 데모 기록이 남는다', async () => {
    goDemo();
    const { result } = renderHook(() => useLearnPageLike(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(useSelfLearningStore.getState().byUser[SEOYEON]?.studyDays).toHaveLength(1),
    );
    expect(result.current.data).toHaveLength(1);
    expect(calls).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('공부한 날도 사용자별로 갈린다 — 서버에 안 갔어도 그대로다', () => {
    goDemo();
    const { result, rerender } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );

    act(() => result.current.record.mutate('2026-09-01'));
    expect(result.current.days.data).toEqual(['2026-09-01']);

    currentUserId = MINJUN;
    rerender();
    expect(result.current.days.data).toEqual([]);
  });
});

describe('한 번만 올리는 백필 (계약 §4)', () => {
  it('로컬에 쌓인 날짜를 올리고, 이미 서버에 있는 날은 다시 올리지 않는다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01', '2026-09-02']);
    serverDays[SEOYEON] = ['2026-09-01'];

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual(['2026-09-01', '2026-09-02']),
    );

    expect(backfillCalls()).toHaveLength(1);
    expect(backfilledDays()).toEqual(['2026-09-02']); // 서버에 있던 날은 빠졌다
  });

  /**
   * 완료 표시를 잃은 사람이 다시 와도 **같은 날짜를 다시 보내지 않는다.** 서버 목록을 먼저
   * 빼기 때문이다 — 그래서 서버의 중복 방어(`onConflictDoNothing`)는 이 경로에서 쓰이지 않고,
   * 두 탭이 겹치는 경합 때나 쓰인다. 요청이 **한 건도** 안 나가는 것이 그 증거다.
   */
  it('표시를 잃어도 이미 서버에 있는 날만 있으면 아무것도 보내지 않는다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01', '2026-09-02']);
    serverDays[SEOYEON] = ['2026-09-01', '2026-09-02'];

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(['2026-09-01', '2026-09-02']));
    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toContain(SEOYEON),
    );

    expect(backfillCalls()).toHaveLength(0);
  });

  it('두 번 마운트해도 한 번만 올린다 — 완료 표시가 남는다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);

    const first = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.data).toEqual(['2026-09-01']));
    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toContain(SEOYEON),
    );
    expect(backfillCalls()).toHaveLength(1);
    first.unmount();

    const second = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(second.result.current.data).toEqual(['2026-09-01']));
    expect(backfillCalls()).toHaveLength(1); // 늘지 않았다
  });

  it('같은 화면에 훅이 여럿이어도 한 번만 올린다 (셸 뱃지 + 화면)', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    const { result } = renderHook(
      () => ({ shell: useStreak(), page: useSelfStudyDays(), streak: useSelfStreak() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.page.data).toEqual(['2026-09-01']));
    expect(backfillCalls()).toHaveLength(1);
  });

  it('올릴 게 없어도 완료 표시를 남긴다 — 매 로드마다 다시 훑지 않는다', async () => {
    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));

    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toContain(SEOYEON),
    );
    expect(backfillCalls()).toHaveLength(0);
  });

  /**
   * ⛔ 남의 통을 훑으면 서연의 공부한 날이 **민준 명의로** 박힌다 — 사용자별 네임스페이스가
   * 막으려던 그 버그가 아직 일어날 수 있는 마지막 자리다.
   */
  it('현재 사용자의 통만 올린다 — 남의 날짜는 건드리지 않는다', async () => {
    seedLocalDays(MINJUN, ['2026-08-01']);
    serverDays[SEOYEON] = ['2026-09-02'];

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    // 서버 응답이 실제로 온 뒤에 판정한다 — 응답 전에도 `data` 는 `[]` 라 그것만으로는
    // 「백필이 안 돌았다」를 증명하지 못한다.
    await waitFor(() => expect(result.current.data).toEqual(['2026-09-02']));
    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toContain(SEOYEON),
    );

    expect(backfillCalls()).toHaveLength(0);
    expect(serverDays[SEOYEON]).toEqual(['2026-09-02']); // 민준의 8월 1일이 섞이지 않았다
    expect(useSelfLearningStore.getState().byUser[MINJUN]?.studyDays).toEqual(['2026-08-01']);
    expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).not.toContain(MINJUN);
  });

  it('서버 목록을 못 읽으면 아무것도 올리지 않는다 — 무엇이 이미 있는지 모른다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    daysListFailure = 500;

    renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    // 5xx 는 한 번 다시 물어본다(`retryUnlessGuarded`) — 두 번째 조회까지 실패한 뒤에 본다.
    await waitFor(() =>
      expect(
        calls.filter((c) => c.method === 'GET' && c.path === '/api/me/study-days').length,
      ).toBeGreaterThan(1),
    );

    expect(backfillCalls()).toHaveLength(0);
    expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).not.toContain(SEOYEON);
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.studyDays).toHaveLength(1);
  });

  it('다시 해 볼 만한 실패(5xx)면 완료 표시를 남기지 않는다 — 다음 로드에서 또 해 본다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    backfillFailure = 503;

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(backfillCalls().length).toBeGreaterThan(0));

    // 백필 실패가 화면을 죽이지 않는다 — 서버 목록은 그대로 읽힌다.
    expect(result.current.data).toEqual([]);
    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).not.toContain(SEOYEON),
    );
    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.studyDays).toEqual(['2026-09-01']);
  });

  it('400 은 다시 보내도 같으니 표시를 남기고 넘어간다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    backfillFailure = 400;

    renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(useSelfLearningStore.getState().studyDaysBackfilledUserIds).toContain(SEOYEON),
    );
  });

  /**
   * 형식이 어긋난 값·미래 날짜를 **클라이언트가 먼저 자르지 않는다.** 거르는 자리는
   * 서버 하나여야 규칙이 두 벌로 갈리지 않는다(계약 §2). 그래서 요청 본문에는 그대로 실리고,
   * 서버 목록에는 안 들어간다.
   */
  it('형식이 틀린 값·미래 날짜도 그대로 보내고, 서버가 걸러 낸다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01', '2099-01-01', '어제', '2020-01-01']);

    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(backfillCalls()).toHaveLength(1));

    // 보낸 것: 로컬에 있던 넷 그대로.
    expect(backfilledDays()).toEqual(['2026-09-01', '2099-01-01', '어제', '2020-01-01']);
    // 남은 것: 서버가 받아 준 하나뿐.
    await waitFor(() => expect(result.current.data).toEqual(['2026-09-01']));
    expect(serverDays[SEOYEON]).toEqual(['2026-09-01']);
  });

  it('상한(400개)을 넘으면 나눠 보낸다 — 잘라 버리지 않는다', async () => {
    // 2026-09-03 에서 하루씩 거슬러 올라간 401 일. 전부 2년 안쪽이라 서버가 다 받는다.
    const many = Array.from({ length: 401 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 8, 3) - i * 86_400_000);
      return d.toISOString().slice(0, 10);
    }).sort();
    seedLocalDays(SEOYEON, many);

    renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(backfillCalls()).toHaveLength(2));

    expect(backfillCalls()[0].body?.days).toHaveLength(400);
    expect(backfillCalls()[1].body?.days).toHaveLength(1);
    await waitFor(() => expect(serverDays[SEOYEON]).toHaveLength(401));
  });

  it('올린 뒤에도 로컬 날짜는 남는다 — 걷는 것은 P5 다', async () => {
    seedLocalDays(SEOYEON, ['2026-09-01']);
    const { result } = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(['2026-09-01']));

    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.studyDays).toEqual([
      '2026-09-01',
    ]);
  });
});
