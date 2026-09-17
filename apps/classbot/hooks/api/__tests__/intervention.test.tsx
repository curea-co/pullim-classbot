/**
 * 개입 훅 — pullim-api 정본을 OS 쿠키로 친다(계획 PR 5c · `api.md § 3.7`).
 *
 * `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다 — URL·메서드·본문·CSRF·credentials 가 정본 계약
 * (`POST /classbot/classes/:classId/interventions` · `GET /classbot/interventions?audience=student` ·
 * `PATCH …/:id/read` · `PATCH …/read-all`)과 어긋나면 여기서 걸린다.
 *
 * 못박는 것: 발송 본문이 늘 `{ events: [...] }` 인 것 · 인박스가 학생 id 를 싣지 않는 것(서버가 sub 로 고른다) ·
 * **비로그인·세션 복원 중·401·5xx 가 서로 다른 갈래로 나오는 것**(`enabled:false` 쿼리는 v5 에서 영영
 * `isPending` 이라 raw `UseQueryResult` 를 그대로 내보내면 익명 벨이 스피너에 갇힌다) ·
 * **60초 타이머를 `poll` 켠 옵저버만 거는 것** · 읽음·모두 읽음이 **낙관적**이고 실패하면 되돌아오는 것 ·
 * 읽기 문 둘이 본문 없이 PATCH 로 가는 것 · 실패 문구가 상태 코드를 갈라 말하는 것.
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
import type { InterventionDto } from '@/lib/api/classbot-dto';
import {
  INBOX_POLL_MS,
  interventionKeys,
  sendInterventionFailureMessage,
  useMarkAllInterventionsRead,
  useMarkInterventionRead,
  useMyInterventions,
  useSendInterventions,
} from '../intervention';

const BASE = `${API_BASE}/classbot`;

interface Call {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
  credentials?: RequestCredentials;
}
let calls: Call[];
let inbox: InterventionDto[];
let inboxStatus: number;
let sendStatus: number;
let readStatus: number;
let readAllStatus: number;

const ITEM: InterventionDto = {
  id: 'itv_1', type: 'remind', botId: 'cls_1', studentId: 'sub-1', assignmentId: 'asg_1',
  message: '오늘 과제 잊지 마세요!', createdAt: '2026-09-17T01:00:00.000Z', readAt: null,
};

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

  if (url === `${BASE}/classes/cls_1/interventions` && method === 'POST') {
    if (sendStatus >= 400) return Promise.resolve(res(sendStatus, { statusCode: sendStatus, message: 'nope' }));
    const events = (body as { events: { type: string; studentId: string; assignmentId?: string; message: string }[] }).events;
    return Promise.resolve(
      res(201, events.map((e, i) => ({ ...ITEM, id: `itv_new_${i}`, type: e.type, studentId: e.studentId, message: e.message }))),
    );
  }
  if (url === `${BASE}/interventions?audience=student` && method === 'GET') {
    if (inboxStatus >= 400) return Promise.resolve(res(inboxStatus, { statusCode: inboxStatus, message: 'nope' }));
    return Promise.resolve(res(200, inbox));
  }
  if (url === `${BASE}/interventions/read-all` && method === 'PATCH') {
    if (readAllStatus >= 400) return Promise.resolve(res(readAllStatus, { statusCode: readAllStatus, message: 'nope' }));
    inbox = inbox.map((i) => (i.readAt === null ? { ...i, readAt: '2026-09-17T09:00:00.000Z' } : i));
    return Promise.resolve(res(200, { updated: 1 }));
  }
  if (url === `${BASE}/interventions/itv_1/read` && method === 'PATCH') {
    if (readStatus >= 400) return Promise.resolve(res(readStatus, { statusCode: readStatus, message: 'nope' }));
    inbox = inbox.map((i) => (i.id === 'itv_1' ? { ...i, readAt: '2026-09-17T09:00:00.000Z' } : i));
    return Promise.resolve(res(200, { ...ITEM, readAt: '2026-09-17T09:00:00.000Z' }));
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-1' };
  authReady = true;
  calls = [];
  inbox = [ITEM];
  inboxStatus = 200;
  sendStatus = 201;
  readStatus = 200;
  readAllStatus = 200;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity, refetchInterval: false }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

const sendCalls = () => calls.filter((c) => c.method === 'POST' && c.url === `${BASE}/classes/cls_1/interventions`);
const inboxCalls = () => calls.filter((c) => c.url === `${BASE}/interventions?audience=student`);

describe('useSendInterventions — POST /classbot/classes/:classId/interventions', () => {
  it('리마인드 한 건을 `{ events: [...] }` 로, OS 쿠키 + CSRF 로 보낸다', async () => {
    const { result } = renderHook(() => useSendInterventions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        classId: 'cls_1',
        events: [{ type: 'remind', studentId: 'stu_1', assignmentId: 'asg_1', message: '오늘 안에 열어 볼까요?' }],
      });
    });

    const post = sendCalls()[0];
    expect(post.body).toEqual({
      events: [{ type: 'remind', studentId: 'stu_1', assignmentId: 'asg_1', message: '오늘 안에 열어 볼까요?' }],
    });
    expect(post.credentials).toBe('include');
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(post.headers.Authorization).toBeUndefined();
  });

  it('코멘트도 과제를 실어 보낸다 — 비-crisis 는 assignmentId 가 필수다(정본 불변식)', async () => {
    const { result } = renderHook(() => useSendInterventions(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        classId: 'cls_1',
        events: [{ type: 'comment', studentId: 'stu_1', assignmentId: 'asg_1', message: '잘했어요' }],
      });
    });
    const events = (sendCalls()[0].body as { events: { type: string; assignmentId?: string }[] }).events;
    expect(events[0].type).toBe('comment');
    expect(events[0].assignmentId).toBe('asg_1');
  });

  it.each([
    [400, '보내지 못했어요. 학생이 아직 이 반에 있는지, 고른 과제가 이 반 과제인지 확인해 주세요.'],
    [403, '이 반의 운영 교사만 보낼 수 있어요.'],
    [404, '반을 찾을 수 없어요.'],
    [500, '보내지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('%s → 교사가 읽는 한 줄', async (status, message) => {
    sendStatus = status;
    const { result } = renderHook(() => useSendInterventions(), { wrapper: Wrapper });
    let caught: unknown;
    await act(async () => {
      await result.current
        .mutateAsync({ classId: 'cls_1', events: [{ type: 'remind', studentId: 'stu_1', assignmentId: 'asg_1', message: 'x' }] })
        .catch((e: unknown) => {
          caught = e;
        });
    });
    expect(sendInterventionFailureMessage(caught)).toBe(message);
  });

  it('401 이면 OS 로그인으로 보내고 오류는 그대로 던진다', async () => {
    sendStatus = 401;
    const { result } = renderHook(() => useSendInterventions(), { wrapper: Wrapper });
    let caught: unknown;
    await act(async () => {
      await result.current
        .mutateAsync({ classId: 'cls_1', events: [{ type: 'remind', studentId: 'stu_1', assignmentId: 'asg_1', message: 'x' }] })
        .catch((e: unknown) => {
          caught = e;
        });
    });
    expect(redirectToOsLogin).toHaveBeenCalled();
    expect(sendInterventionFailureMessage(caught)).toBe('로그인이 필요해요.');
  });
});

describe('useMyInterventions — GET /classbot/interventions?audience=student', () => {
  it('학생 id 를 싣지 않는다 — 서버가 sub 로 고른다', async () => {
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(inboxCalls()[0].url).toBe(`${BASE}/interventions?audience=student`);
    expect(inboxCalls()[0].credentials).toBe('include');
  });

  it('세션 복원 전에는 묻지 않고, 기다림으로 선다 — 비로그인으로 단정하지 않는다', async () => {
    authReady = false;
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await act(async () => {});
    expect(inboxCalls()).toHaveLength(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSignedOut).toBe(false);
  });

  it('비로그인은 **기다림이 아니라** 비로그인이다 — 익명 벨이 스피너에 갇히지 않는다', async () => {
    // `enabled:false` 인 쿼리는 react-query v5 에서 영영 `status:'pending'` 이다. raw `isPending` 을 화면에
    // 그대로 물리면 공개 경로(`/classbot/onboarding`)의 익명 방문자가 「불러오는 중」에 갇힌다.
    authUser = null;
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await act(async () => {});
    expect(inboxCalls()).toHaveLength(0);
    expect(result.current.isSignedOut).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.unread).toBe(0);
  });

  it('401 도 비로그인 갈래다 — 에러 카드가 아니라 로그인 안내로 간다', async () => {
    inboxStatus = 401;
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSignedOut).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(redirectToOsLogin).toHaveBeenCalled();
  });

  it('5xx 는 장애 갈래다', async () => {
    inboxStatus = 500;
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSignedOut).toBe(false);
  });

  it('최신순으로 돌려주고 미읽음을 센다', async () => {
    inbox = [
      { ...ITEM, id: 'old', createdAt: '2026-09-16T01:00:00.000Z', readAt: '2026-09-16T02:00:00.000Z' },
      { ...ITEM, id: 'new', createdAt: '2026-09-17T05:00:00.000Z' },
    ];
    const { result } = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.id)).toEqual(['new', 'old']);
    expect(result.current.unread).toBe(1);
  });

  it('타이머는 `poll` 을 켠 옵저버만 건다 — 켜지 않으면 `refetchInterval` 이 없다', async () => {
    const off = renderHook(() => useMyInterventions(), { wrapper: Wrapper });
    await waitFor(() => expect(off.result.current.items).toHaveLength(1));
    const [query] = queryClient.getQueryCache().findAll({ queryKey: interventionKeys.inboxPrefix });
    expect(query.observers.every((o) => o.options.refetchInterval === false)).toBe(true);
    off.unmount();

    const on = renderHook(() => useMyInterventions({ poll: true }), { wrapper: Wrapper });
    await waitFor(() => expect(on.result.current.items).toHaveLength(1));
    const [polled] = queryClient.getQueryCache().findAll({ queryKey: interventionKeys.inboxPrefix });
    expect(polled.observers.some((o) => o.options.refetchInterval === INBOX_POLL_MS)).toBe(true);
    on.unmount();
  });
});

describe('읽음 — PATCH …/:id/read · PATCH …/read-all', () => {
  it('단건 읽음은 본문 없이 PATCH 로 가고, 캐시가 그 자리에서 읽음이 된다(낙관)', async () => {
    const { result } = renderHook(
      () => ({ list: useMyInterventions(), read: useMarkInterventionRead() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.items).toHaveLength(1));

    await act(async () => {
      await result.current.read.mutateAsync('itv_1');
    });

    const patch = calls.find((c) => c.method === 'PATCH' && c.url === `${BASE}/interventions/itv_1/read`);
    expect(patch).toBeDefined();
    expect(patch?.body).toBeUndefined();
    expect(patch?.headers['X-CSRF-Token']).toBe('csrf-1');
    await waitFor(() => expect(result.current.list.items[0].readAt).not.toBeNull());
  });

  it('단건 읽음이 실패하면 캐시가 되돌아온다', async () => {
    readStatus = 404;
    const { result } = renderHook(
      () => ({ list: useMyInterventions(), read: useMarkInterventionRead() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.items).toHaveLength(1));

    await act(async () => {
      await result.current.read.mutateAsync('itv_1').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.list.items[0].readAt).toBeNull());
  });

  it('모두 읽음은 read-all 로 가고 미읽음이 한 번에 사라진다', async () => {
    inbox = [ITEM, { ...ITEM, id: 'itv_2' }];
    const { result } = renderHook(
      () => ({ list: useMyInterventions(), readAll: useMarkAllInterventionsRead() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.items).toHaveLength(2));

    await act(async () => {
      await result.current.readAll.mutateAsync();
    });

    const patch = calls.find((c) => c.method === 'PATCH' && c.url === `${BASE}/interventions/read-all`);
    expect(patch).toBeDefined();
    expect(patch?.body).toBeUndefined();
    await waitFor(() => expect(result.current.list.items.every((i) => i.readAt !== null)).toBe(true));
  });

  it('모두 읽음이 실패하면 캐시가 되돌아온다', async () => {
    readAllStatus = 500;
    const { result } = renderHook(
      () => ({ list: useMyInterventions(), readAll: useMarkAllInterventionsRead() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.items).toHaveLength(1));

    await act(async () => {
      await result.current.readAll.mutateAsync().catch(() => undefined);
    });
    await waitFor(() => expect(result.current.list.items[0].readAt).toBeNull());
  });
});
