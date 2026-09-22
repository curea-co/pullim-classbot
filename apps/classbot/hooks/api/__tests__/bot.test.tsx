/**
 * 봇 훅 — 1급 `bots` 표를 만들고 고치고 붙인다(계획 PR 5b · pullim-api PR 2 · api.md § 3.5b).
 *
 * `fetch` 를 가로채 HTTP 를 상대로 본다: `GET /classbot/me/bots`(계획 PR 5d · pullim-api #672) ·
 * `POST /classbot/bots` · `PATCH /classbot/bots/:id`(바뀐 칸만) · 「만들어 붙이기」가 **POST 뒤 PUT** 순서로 가고
 * PUT 의 `botId` 가 POST 응답의 id 인 것 · 붙이기만 실패하면 `BotAttachError`(만든 봇 + 원인)로 끝나고 만든 봇은
 * 목록 캐시에 남는 것.
 *
 * 5d 가 바꾼 것: 봇을 읽는 자리가 **목록 하나**다. 종전에는 봇마다 `enabled:false` 캐시를 두고 쓰기 응답만 받았는데
 * (`useKnownBot`), 이제 `useMyBots` 가 원천이고 `useMyBot` 은 그 목록에서 고른다 — 쓰기 응답은 목록을 갈아 끼운다.
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
import { classroomKeys, useClassDetail } from '../classroom';
import {
  BotAttachError, botKeys, useCreateBot, useCreateBotForClass, useMyBot, useMyBots, useUpdateBot,
} from '../bot';

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
/** `GET /classbot/me/bots` 응답 코드와 본문. */
let myBotsStatus: number;
let myBots: BotDto[];
/** `GET /classbot/classes/:classId` 응답 코드와 본문. */
let classStatus: number;
let classDto: ClassDto;

const BOT: BotDto = {
  id: 'bot_1', operatorId: 'sub-1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근', greeting: '안녕!',
  scope: 3, avatarEmoji: '📚', quickPrompts: [], isPublished: false, publishedAt: null, classIds: [],
  createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z',
};
const CLASS_DTO: ClassDto = {
  id: 'cls_1', operatorId: 'sub-1', orgId: null, name: '고2 미적분 A반', description: null, subject: null, grade: null,
  isActive: true, isSelfStudy: false, bot: null, joinCode: null, createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z',
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

  if (url === `${BASE}/me/bots` && method === 'GET') {
    if (myBotsStatus >= 400) return Promise.resolve(res(myBotsStatus, { statusCode: myBotsStatus, message: 'nope' }));
    return Promise.resolve(res(200, myBots));
  }
  if (url === `${BASE}/classes/cls_1` && method === 'GET') {
    if (classStatus >= 400) return Promise.resolve(res(classStatus, { statusCode: classStatus, message: 'nope' }));
    return Promise.resolve(res(200, classDto));
  }
  if (url === `${BASE}/bots` && method === 'POST') {
    if (createStatus >= 400) return Promise.resolve(res(createStatus, { statusCode: createStatus, message: 'nope' }));
    const input = body as { name: string; scope?: number };
    const made = { ...BOT, name: input.name, scope: input.scope ?? 3 };
    // 만든 봇은 다음 `GET /me/bots` 에도 **맨 앞에** 있어야 한다(서버가 최신순). 여기서 기억하지 않으면
    // 무효화 뒤 다시 읽은 목록이 방금 만든 봇을 모르고, 훅이 아니라 이 가짜 서버를 시험하게 된다.
    myBots = [made, ...myBots.filter((b) => b.id !== made.id)];
    return Promise.resolve(res(201, made));
  }
  if (url === `${BASE}/bots/bot_1` && method === 'PATCH') {
    if (updateStatus >= 400) return Promise.resolve(res(updateStatus, { statusCode: updateStatus, message: 'nope' }));
    const patch = body as Partial<BotDto>;
    const next = { ...BOT, ...patch, classIds: ['cls_1'] };
    myBots = myBots.map((b) => (b.id === next.id ? next : b));
    return Promise.resolve(res(200, next));
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
const myBotsCalls = () => calls.filter((c) => c.method === 'GET' && c.url === `${BASE}/me/bots`);
/** 반 상세 캐시 한 칸 — 키 꼬리에 신원이 붙는다(`classroom.ts` `classroomKeys`). */
const cachedClass = (classId: string) =>
  queryClient.getQueryData<ClassDto>([...classroomKeys.classDetail(classId), 'sub-1']);

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls = [];
  createStatus = 201;
  updateStatus = 200;
  assignStatus = 200;
  myBotsStatus = 200;
  myBots = [];
  classStatus = 200;
  classDto = CLASS_DTO;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('useMyBots — GET /classbot/me/bots', () => {
  it('내 봇 전부를 서버가 준 순서(최신순) 그대로 든다 · GET 은 CSRF 를 달지 않는다', async () => {
    myBots = [{ ...BOT, id: 'bot_2', name: '독해 도우미' }, BOT];
    const { result } = renderHook(() => useMyBots(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data?.map((b) => b.id)).toEqual(['bot_2', 'bot_1']);
    expect(myBotsCalls()).toHaveLength(1);
    expect(myBotsCalls()[0].headers['X-CSRF-Token']).toBeUndefined();
  });

  it('봇이 하나도 없으면 빈 배열이다 — 오류가 아니다', async () => {
    const { result } = renderHook(() => useMyBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('401 은 로그인으로 · 403 은 실패로 끝난다', async () => {
    myBotsStatus = 403;
    const { result, rerender } = renderHook(() => useMyBots(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
    expect(redirectToOsLogin).not.toHaveBeenCalled();

    myBotsStatus = 401;
    queryClient.clear();
    rerender();
    await waitFor(() => expect(redirectToOsLogin).toHaveBeenCalledTimes(1));
  });
});

describe('useMyBot — 목록에서 고른다', () => {
  it('읽는 중에는 isPending 이고, 읽은 뒤 없으면 「내 봇이 아니다」다', async () => {
    myBots = [BOT];
    const { result } = renderHook(() => ({ mine: useMyBot('bot_1'), other: useMyBot('bot_9') }), { wrapper: Wrapper });
    expect(result.current.mine.isPending).toBe(true);
    expect(result.current.mine.bot).toBeUndefined();

    await waitFor(() => expect(result.current.mine.isPending).toBe(false));
    expect(result.current.mine.bot?.name).toBe('문학 도우미');
    // 다 읽었는데 없다 = 지워졌거나 남의 봇이다. 「모른다」가 아니다.
    expect(result.current.other.isPending).toBe(false);
    expect(result.current.other.bot).toBeUndefined();
    // 두 자리가 같은 목록을 본다 — 봇마다 따로 묻지 않는다.
    expect(myBotsCalls()).toHaveLength(1);
  });

  it('id 가 비면 찾지 않는다', async () => {
    myBots = [BOT];
    const { result } = renderHook(() => useMyBot(null), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.bot).toBeUndefined();
  });
});

describe('useCreateBot — POST /classbot/bots', () => {
  it('본문을 CSRF 로 보내고 만든 봇이 내 봇 목록 맨 앞에 선다', async () => {
    myBots = [{ ...BOT, id: 'bot_0', name: '옛 봇' }];
    const { result } = renderHook(() => ({ create: useCreateBot(), mine: useMyBots() }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.mine.data).toHaveLength(1));

    await act(async () => {
      await result.current.create.mutateAsync({ name: '문학 도우미', scope: 4 });
    });

    const post = writes()[0];
    expect(post.url).toBe(`${BASE}/bots`);
    expect(post.body).toEqual({ name: '문학 도우미', scope: 4 });
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    // 서버도 최신순이라 새 봇이 맨 앞이다 — 다시 읽기 전 한 박자를 이 값이 잇는다.
    await waitFor(() => expect(result.current.mine.data?.[0]?.id).toBe('bot_1'));
    expect(result.current.mine.data?.[0]?.scope).toBe(4);
    // 그리고 목록을 다시 읽는다.
    await waitFor(() => expect(myBotsCalls().length).toBeGreaterThan(1));
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
  it('바뀐 칸만 PATCH 로 보낸다 — null 은 비움, 안 실은 칸은 그대로 · 목록의 그 줄이 갈린다', async () => {
    myBots = [BOT, { ...BOT, id: 'bot_2', name: '독해 도우미' }];
    const { result } = renderHook(() => ({ update: useUpdateBot(), mine: useMyBot('bot_1') }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.mine.bot?.scope).toBe(3));

    await act(async () => {
      await result.current.update.mutateAsync({ botId: 'bot_1', patch: { greeting: null, scope: 2 } });
    });

    const patch = writes()[0];
    expect(patch.method).toBe('PATCH');
    expect(patch.url).toBe(`${BASE}/bots/bot_1`);
    expect(patch.body).toEqual({ greeting: null, scope: 2 });
    expect(patch.headers['X-CSRF-Token']).toBe('csrf-1');
    await waitFor(() => expect(result.current.mine.bot?.scope).toBe(2));
    // 줄이 늘지 않는다 — 있는 줄을 갈아 끼운 것이다.
    expect(queryClient.getQueryData<BotDto[]>([...botKeys.myBots, 'sub-1'])).toHaveLength(2);
  });

  it('고친 이름이 그 봇을 든 반 상세에도 선다 — 다른 봇을 든 반은 그대로', async () => {
    classDto = { ...CLASS_DTO, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    queryClient.setQueryData([...classroomKeys.classDetail('cls_2'), 'sub-1'], {
      ...CLASS_DTO, id: 'cls_2', bot: { id: 'bot_9', name: '다른 봇', avatarEmoji: null },
    });
    const { result } = renderHook(
      () => ({ update: useUpdateBot(), a: useClassDetail('cls_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.a.data?.bot?.name).toBe('문학 도우미'));

    await act(async () => {
      await result.current.update.mutateAsync({ botId: 'bot_1', patch: { name: '시 도우미' } });
    });
    await waitFor(() => expect(result.current.a.data?.bot?.name).toBe('시 도우미'));
    expect(cachedClass('cls_2')?.bot?.name).toBe('다른 봇');
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
  it('두 문을 그 순서로 두드리고, PUT 의 botId 는 POST 가 준 id 다 · 반 상세가 선다', async () => {
    const { result } = renderHook(
      () => ({ create: useCreateBotForClass(), mine: useMyBot('bot_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.mine.isPending).toBe(false));

    let made: Awaited<ReturnType<typeof result.current.create.mutateAsync>> | undefined;
    await act(async () => {
      made = await result.current.create.mutateAsync({ classId: 'cls_1', bot: { name: '문학 도우미' } });
    });

    expect(writes().map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${BASE}/bots`, `PUT ${BASE}/classes/cls_1/bot`]);
    expect(writes()[1].body).toEqual({ botId: 'bot_1' });
    expect(made?.bot.id).toBe('bot_1');
    expect(made?.class.bot?.id).toBe('bot_1');
    await waitFor(() => expect(cachedClass('cls_1')?.bot?.id).toBe('bot_1'));
    expect(result.current.mine.bot?.name).toBe('문학 도우미');
  });

  it('붙이기만 실패하면 BotAttachError — 만든 봇과 원인을 들고, 봇은 목록에 남는다', async () => {
    assignStatus = 403;
    const { result } = renderHook(
      () => ({ create: useCreateBotForClass(), mine: useMyBot('bot_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.mine.isPending).toBe(false));

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
    // 반은 그대로다 — 붙지 않았으니 반 상세를 건드리지 않는다.
    expect(cachedClass('cls_1')).toBeUndefined();
    // 봇은 내 것으로 생겼다 — 「다시 붙이기」가 그것을 들고 간다.
    await waitFor(() => expect(result.current.mine.bot?.id).toBe('bot_1'));
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
