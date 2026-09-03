import type { ReactNode } from 'react';
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
import { useSelfLearningStore, type SelfBotRow } from '@/lib/store/self-learning';

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
jest.mock('@/lib/use-dev-identity', () => ({
  useDevIdentityId: () => devIdentityId,
}));
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser }),
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
/** 오간 요청 전부 — 「한 번만 올린다」를 세는 자리. */
let calls: { method: string; path: string; body?: { botId?: string } }[];
/** botId → 이 봇을 담으려 하면 낼 응답 코드(이관 실패 시나리오용). */
let addFailures: Record<string, number>;

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
  const body = init?.body ? (JSON.parse(String(init.body)) as { botId?: string }) : undefined;
  calls.push({ method, path, body });

  const rows = (serverBots[currentUserId] ??= []);

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

/** GET 이 몇 번 나갔나 — 무효화가 실제로 다시 읽었는지 세는 자리. */
const getCount = () => calls.filter((c) => c.method === 'GET').length;
/** 이 봇을 담으려는 POST 가 몇 번 나갔나. */
const addCount = (botId: string) =>
  calls.filter((c) => c.method === 'POST' && c.body?.botId === botId).length;

/** 테스트 하나가 쓰는 QueryClient — 신원을 바꿔도 **같은 캐시**여야 분리를 증명한다. */
let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** 로컬(P1·P2)에 담겨 있던 행을 심는다 — 이관의 소스. */
function seedLocalBots(userId: string, botIds: string[]): void {
  useSelfLearningStore.setState({
    byUser: {
      ...useSelfLearningStore.getState().byUser,
      [userId]: {
        bots: botIds.map((botId) => ({ botId, addedAt: '2026-09-01T00:00:00.000Z' })),
        studyDays: [],
      },
    },
  });
}

beforeEach(() => {
  currentUserId = SEOYEON;
  devIdentityId = SEOYEON;
  authUser = null;
  serverBots = {};
  calls = [];
  addFailures = {};
  useSelfLearningStore.setState({
    byUser: {},
    botsMigratedUserIds: [],
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

  it('올린 뒤에도 로컬 행을 지우지 않는다 — 실패했으면 그게 유일한 사본이다', async () => {
    seedLocalBots(SEOYEON, [BOT_A]);
    const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.map((b) => b.botId)).toEqual([BOT_A]));

    expect(useSelfLearningStore.getState().byUser[SEOYEON]?.bots.map((b) => b.botId)).toEqual([
      BOT_A,
    ]);
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
  });
});

/* ── 공부한 날 · 연속 학습 — 아직 localStorage (P4 몫) ────────────────────── */

describe('공부한 날 기록', () => {
  it('같은 날 두 번 눌러도 한 칸이다', () => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.record.mutate('2026-09-02');
      result.current.record.mutate('2026-09-02');
    });
    expect(result.current.days.data).toEqual(['2026-09-02']);
  });

  it('날짜를 안 주면 오늘로 기록한다', () => {
    const { result } = renderHook(
      () => ({ days: useSelfStudyDays(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    act(() => result.current.record.mutate());
    expect(result.current.days.data).toHaveLength(1);
    expect(result.current.days.data[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('빈 날을 사이에 두면 연속이 끊긴다', () => {
    const { result } = renderHook(
      () => ({ streak: useSelfStreak(), record: useRecordSelfStudyDay() }),
      { wrapper: Wrapper },
    );
    act(() => {
      result.current.record.mutate('2026-09-01');
      result.current.record.mutate('2026-09-02');
      result.current.record.mutate('2026-09-05');
    });
    expect(result.current.streak).toEqual({ count: 1, lastStudyDate: '2026-09-05' });
  });

  it('공부한 날·연속일수도 사용자별로 갈린다 — 서버로 안 갔어도 그대로다', () => {
    const { result, rerender } = renderHook(
      () => ({
        days: useSelfStudyDays(),
        streak: useSelfStreak(),
        record: useRecordSelfStudyDay(),
      }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.record.mutate('2026-09-01');
      result.current.record.mutate('2026-09-02');
    });
    expect(result.current.days.data).toEqual(['2026-09-01', '2026-09-02']);
    expect(result.current.streak).toEqual({ count: 2, lastStudyDate: '2026-09-02' });

    currentUserId = MINJUN;
    rerender();
    expect(result.current.days.data).toEqual([]);
    expect(result.current.streak).toEqual({ count: 0, lastStudyDate: null });
  });

  it('공부한 날은 서버에 가지 않는다 — P4 몫이다', () => {
    const { result } = renderHook(() => useRecordSelfStudyDay(), { wrapper: Wrapper });
    act(() => result.current.mutate('2026-09-02'));
    expect(calls.filter((c) => c.path.includes('study'))).toHaveLength(0);
  });
});
