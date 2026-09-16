/**
 * 학생 수업방 훅 — pullim-api 정본을 OS 쿠키로 친다(2026-09-16 계획 PR 4).
 *
 * `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다 — URL·메서드·본문·CSRF·credentials 가 정본 계약
 * (`POST /classbot/enrollments`·`GET /classbot/bots?role=student`)과 어긋나면 여기서 걸린다.
 * 목 폴백이 없다는 것도 여기서 못박는다 — 404 는 「없는 코드」로 끝나고 다른 문을 두드리지 않는다.
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let authUser: { id: string } | null = { id: 'sub-1' };
let authReady = true;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: authReady }),
}));

const redirectToOsLogin = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: () => redirectToOsLogin(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { joinFailureMessage, useJoinByCode, useMyClassrooms } from '../classroom';

const BASE = `${API_BASE}/classbot`;

interface Call {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
  credentials?: RequestCredentials;
}
let calls: Call[];
/** 참여 응답 코드 — 201 새로 들어옴 · 200 이미 멤버 · 4xx 실패. */
let enrollStatus: number;
/** 내 반 목록 응답 코드. */
let botsStatus: number;
let bots: BotCardDto[];

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method ?? 'GET';
  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ url, method, body, headers, credentials: init?.credentials });

  if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));

  if (url === `${BASE}/enrollments` && method === 'POST') {
    if (enrollStatus >= 400) {
      return Promise.resolve(res(enrollStatus, { statusCode: enrollStatus, message: 'nope' }));
    }
    return Promise.resolve(
      res(enrollStatus, {
        membershipId: 'mem_1',
        classId: 'cls_1',
        memberId: 'sub-1',
        enrolledAt: '2026-09-16T00:00:00.000Z',
      }),
    );
  }
  if (url === `${BASE}/bots/cls_1` && method === 'GET') {
    return Promise.resolve(
      res(200, { id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, operatorId: 't1', profile: null }),
    );
  }
  if (url === `${BASE}/bots?role=student` && method === 'GET') {
    if (botsStatus >= 400) return Promise.resolve(res(botsStatus, { statusCode: botsStatus, message: 'nope' }));
    return Promise.resolve(res(200, bots));
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

const botsCalls = () => calls.filter((c) => c.url === `${BASE}/bots?role=student`);

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-1' };
  authReady = true;
  calls = [];
  enrollStatus = 201;
  botsStatus = 200;
  bots = [{ id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'student', profile: null }];
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('useJoinByCode — POST /classbot/enrollments', () => {
  it('OS 쿠키(credentials include) + CSRF double-submit 으로 { code } 를 보낸다', async () => {
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });

    let joined: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });

    const post = calls.find((c) => c.method === 'POST' && c.url === `${BASE}/enrollments`);
    expect(post).toBeDefined();
    expect(post?.body).toEqual({ code: 'AB3K9M' });
    expect(post?.credentials).toBe('include');
    expect(post?.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(post?.headers.Authorization).toBeUndefined();
    expect(post?.headers['x-user-id']).toBeUndefined();

    expect(joined).toEqual({
      enrollment: { membershipId: 'mem_1', classId: 'cls_1', memberId: 'sub-1', enrolledAt: '2026-09-16T00:00:00.000Z' },
      className: '고2 미적분 A반',
      alreadyJoined: false,
    });
  });

  it('200 이면 이미 멤버(멱등) — alreadyJoined:true, 오류가 아니다', async () => {
    enrollStatus = 200;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    let joined: { alreadyJoined: boolean } | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });
    expect(joined?.alreadyJoined).toBe(true);
  });

  it('반 이름을 못 읽어도 참여는 성공이다 — className 만 null', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === `${BASE}/bots/cls_1`) return Promise.resolve(res(500, { statusCode: 500 }));
      return fakeFetch(input, init);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    let joined: { className: string | null } | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });
    expect(joined?.className).toBeNull();
  });

  it('성공하면 내 반 목록을 다시 읽는다(무효화)', async () => {
    const { result } = renderHook(
      () => ({ rooms: useMyClassrooms(), join: useJoinByCode() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.rooms.data).toHaveLength(1));
    const before = botsCalls().length;

    await act(async () => {
      await result.current.join.mutateAsync({ code: 'AB3K9M' });
    });
    await waitFor(() => expect(botsCalls().length).toBeGreaterThan(before));
  });

  it.each([
    [404, '없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.'],
    [410, '닫힌 코드예요. 선생님께 새 코드를 받아 주세요.'],
    [409, '이미 들어와 있는 반이에요.'],
    [403, '이 반에는 들어갈 수 없어요.'],
    [500, '참여하지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('%s 는 실패로 끝나고 서버가 가른 뜻을 말한다 — 목 폴백 없음', async (status, message) => {
    enrollStatus = status;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });

    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ code: 'ZZZ' });
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeDefined();
    expect(joinFailureMessage(error)).toBe(message);
    // 정본 참여 문 하나만 두드렸다 — 같은 오리진 `/api/enrollments` 도, 다른 BE 도 없다.
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual([`${BASE}/enrollments`]);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('401 이면 OS 로그인으로 보낸다', async () => {
    enrollStatus = 401;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ code: 'ZZZ' }).catch(() => undefined);
    });
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useMyClassrooms — GET /classbot/bots?role=student', () => {
  it('OS 쿠키로 읽고 CSRF 는 붙이지 않는다 · 응답은 봉투 없는 카드 배열', async () => {
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(bots));

    const get = botsCalls()[0];
    expect(get.method).toBe('GET');
    expect(get.credentials).toBe('include');
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
    expect(calls.some((c) => c.url === `${API_BASE}/auth/csrf`)).toBe(false);
  });

  it('세션 복원 전에는 묻지 않는다 — 누구 것인지 몰라 캐시가 남의 키에 남는다', async () => {
    authReady = false;
    authUser = null;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    await act(async () => Promise.resolve());
    expect(botsCalls()).toHaveLength(0);
  });

  it('복원 뒤 비로그인이면 묻지 않는다 — RoleGuard 가 로그인으로 보내는 중이다', async () => {
    authUser = null;
    renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(botsCalls()).toHaveLength(0);
  });

  it('4xx 는 다시 보내지 않고, 401 은 로그인으로 보낸다', async () => {
    botsStatus = 401;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(botsCalls()).toHaveLength(1);
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });

  it('5xx 는 한 번 더 시도한 뒤 isError', async () => {
    botsStatus = 503;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(botsCalls()).toHaveLength(2);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('신원이 바뀌면 캐시가 갈린다(queryKey 꼬리)', async () => {
    const { result, rerender } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    authUser = { id: 'sub-2' };
    bots = [];
    rerender();
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(botsCalls()).toHaveLength(2);
  });
});
