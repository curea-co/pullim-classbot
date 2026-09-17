/**
 * 봇 훅 — 1급 `bots` 표를 만들고 고치고 붙인다(계획 PR 5b · pullim-api PR 2 · api.md § 3.5b).
 *
 * `fetch` 를 가로채 HTTP 를 상대로 본다: `POST /classbot/bots` · `PATCH /classbot/bots/:id`(바뀐 칸만) ·
 * 「만들어 붙이기」가 **POST 뒤 PUT** 순서로 가고 PUT 의 `botId` 가 POST 응답의 id 인 것 · 붙이기만 실패하면
 * `BotAttachError`(만든 봇 + 원인)로 끝나고 만든 봇은 캐시에 남는 것.
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { id: 'sub-1' }, isReady: true }),
}));

const redirectToOsLogin = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: () => redirectToOsLogin(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type { BotDto, ClassDto } from '@/lib/api/classbot-dto';
import { classroomKeys, useKnownClassSummary } from '../classroom';
import { BotAttachError, useCreateBot, useCreateBotForClass, useKnownBot, useUpdateBot } from '../bot';

const BASE = `${API_BASE}/classbot`;

interface Call {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
}
let calls: Call[];
let createStatus: number;
let updateStatus: number;
let assignStatus: number;

const BOT: BotDto = {
  id: 'bot_1', operatorId: 'sub-1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근', greeting: '안녕!',
  scope: 3, avatarEmoji: '📚', quickPrompts: [], isPublished: false, publishedAt: null, classIds: [],
  createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z',
};
const CLASS_DTO: ClassDto = {
  id: 'cls_1', operatorId: 'sub-1', orgId: null, name: '고2 미적분 A반', description: null, subject: null, grade: null,
  isActive: true, bot: null, joinCode: null, createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z',
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
  calls.push({ url, method, body, headers });

  if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));

  if (url === `${BASE}/bots` && method === 'POST') {
    if (createStatus >= 400) return Promise.resolve(res(createStatus, { statusCode: createStatus, message: 'nope' }));
    const input = body as { name: string; scope?: number };
    return Promise.resolve(res(201, { ...BOT, name: input.name, scope: input.scope ?? 3 }));
  }
  if (url === `${BASE}/bots/bot_1` && method === 'PATCH') {
    if (updateStatus >= 400) return Promise.resolve(res(updateStatus, { statusCode: updateStatus, message: 'nope' }));
    const patch = body as Partial<BotDto>;
    return Promise.resolve(res(200, { ...BOT, ...patch, classIds: ['cls_1'] }));
  }
  if (url === `${BASE}/classes/cls_1/bot` && method === 'PUT') {
    if (assignStatus >= 400) return Promise.resolve(res(assignStatus, { statusCode: assignStatus, message: 'nope' }));
    const input = body as { botId: string | null };
    return Promise.resolve(
      res(200, { ...CLASS_DTO, bot: input.botId ? { id: input.botId, name: '문학 도우미', avatarEmoji: '📚' } : null }),
    );
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

const writes = () => calls.filter((c) => c.method !== 'GET' && c.url !== `${API_BASE}/auth/csrf`);

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls = [];
  createStatus = 201;
  updateStatus = 200;
  assignStatus = 200;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('useCreateBot — POST /classbot/bots', () => {
  it('본문을 CSRF 로 보내고 만든 봇을 캐시에 둔다(useKnownBot)', async () => {
    const { result } = renderHook(() => ({ create: useCreateBot(), known: useKnownBot('bot_1') }), { wrapper: Wrapper });
    expect(result.current.known).toBeUndefined();

    await act(async () => {
      await result.current.create.mutateAsync({ name: '문학 도우미', scope: 4 });
    });

    const post = writes()[0];
    expect(post.url).toBe(`${BASE}/bots`);
    expect(post.body).toEqual({ name: '문학 도우미', scope: 4 });
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    await waitFor(() => expect(result.current.known?.scope).toBe(4));
    // 세션이 끝날 때까지 안다 — 관찰자가 붙은 캐시는 5분 뒤 증발하지 않는다.
    expect(queryClient.getQueryCache().find({ queryKey: ['bot', 'bot_1'] })?.gcTime).toBe(Infinity);
  });

  it('403 은 실패로 끝나고 401 은 로그인으로', async () => {
    createStatus = 403;
    const { result } = renderHook(() => useCreateBot(), { wrapper: Wrapper });
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ name: 'x' });
      } catch (e) {
        error = e;
      }
    });
    expect((error as { status?: number }).status).toBe(403);
    expect(redirectToOsLogin).not.toHaveBeenCalled();

    createStatus = 401;
    await act(async () => {
      await result.current.mutateAsync({ name: 'x' }).catch(() => undefined);
    });
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useUpdateBot — PATCH /classbot/bots/:id', () => {
  it('바뀐 칸만 PATCH 로 보낸다 — null 은 비움, 안 실은 칸은 그대로', async () => {
    const { result } = renderHook(() => ({ update: useUpdateBot(), known: useKnownBot('bot_1') }), { wrapper: Wrapper });

    await act(async () => {
      await result.current.update.mutateAsync({ botId: 'bot_1', patch: { greeting: null, scope: 2 } });
    });

    const patch = writes()[0];
    expect(patch.method).toBe('PATCH');
    expect(patch.url).toBe(`${BASE}/bots/bot_1`);
    expect(patch.body).toEqual({ greeting: null, scope: 2 });
    expect(patch.headers['X-CSRF-Token']).toBe('csrf-1');
    await waitFor(() => expect(result.current.known?.scope).toBe(2));
  });

  it('고친 이름이 그 봇을 든 반 요약(useKnownClassSummary)에도 선다 — 다른 봇을 든 반은 그대로', async () => {
    queryClient.setQueryData(classroomKeys.classSummary('cls_1'), {
      ...CLASS_DTO, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' },
    });
    queryClient.setQueryData(classroomKeys.classSummary('cls_2'), {
      ...CLASS_DTO, id: 'cls_2', bot: { id: 'bot_9', name: '다른 봇', avatarEmoji: null },
    });
    const { result } = renderHook(
      () => ({ update: useUpdateBot(), a: useKnownClassSummary('cls_1'), b: useKnownClassSummary('cls_2') }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.update.mutateAsync({ botId: 'bot_1', patch: { name: '시 도우미' } });
    });
    await waitFor(() => expect(result.current.a?.bot?.name).toBe('시 도우미'));
    expect(result.current.b?.bot?.name).toBe('다른 봇');
  });

  it('남의 봇(404)은 실패로 끝난다', async () => {
    updateStatus = 404;
    const { result } = renderHook(() => useUpdateBot(), { wrapper: Wrapper });
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ botId: 'bot_1', patch: { name: 'x' } });
      } catch (e) {
        error = e;
      }
    });
    expect((error as { status?: number }).status).toBe(404);
  });
});

describe('useCreateBotForClass — POST /bots 뒤 PUT /classes/:classId/bot', () => {
  it('두 문을 그 순서로 두드리고, PUT 의 botId 는 POST 가 준 id 다 · 반 요약이 선다', async () => {
    const { result } = renderHook(
      () => ({ create: useCreateBotForClass(), known: useKnownClassSummary('cls_1'), bot: useKnownBot('bot_1') }),
      { wrapper: Wrapper },
    );

    let made: Awaited<ReturnType<typeof result.current.create.mutateAsync>> | undefined;
    await act(async () => {
      made = await result.current.create.mutateAsync({ classId: 'cls_1', bot: { name: '문학 도우미' } });
    });

    expect(writes().map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${BASE}/bots`, `PUT ${BASE}/classes/cls_1/bot`]);
    expect(writes()[1].body).toEqual({ botId: 'bot_1' });
    expect(made?.bot.id).toBe('bot_1');
    expect(made?.class.bot?.id).toBe('bot_1');
    await waitFor(() => expect(result.current.known?.bot?.id).toBe('bot_1'));
    expect(result.current.bot?.name).toBe('문학 도우미');
  });

  it('붙이기만 실패하면 BotAttachError — 만든 봇과 원인을 들고, 봇은 캐시에 남는다', async () => {
    assignStatus = 403;
    const { result } = renderHook(
      () => ({ create: useCreateBotForClass(), known: useKnownClassSummary('cls_1'), bot: useKnownBot('bot_1') }),
      { wrapper: Wrapper },
    );

    let error: unknown;
    await act(async () => {
      try {
        await result.current.create.mutateAsync({ classId: 'cls_1', bot: { name: '문학 도우미' } });
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeInstanceOf(BotAttachError);
    const attach = error as BotAttachError;
    expect(attach.bot.id).toBe('bot_1');
    expect((attach.cause as { status?: number }).status).toBe(403);
    expect(result.current.known).toBeUndefined();
    await waitFor(() => expect(result.current.bot?.id).toBe('bot_1'));
  });

  it('만들기부터 실패하면 ApiError 그대로 — PUT 은 가지 않는다', async () => {
    createStatus = 400;
    const { result } = renderHook(() => useCreateBotForClass(), { wrapper: Wrapper });
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ classId: 'cls_1', bot: { name: '' } });
      } catch (e) {
        error = e;
      }
    });
    expect(error).not.toBeInstanceOf(BotAttachError);
    expect((error as { status?: number }).status).toBe(400);
    expect(writes().map((c) => c.method)).toEqual(['POST']);
  });
});
