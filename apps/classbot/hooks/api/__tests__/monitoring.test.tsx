/**
 * 모니터링 훅 — pullim-api 정본을 OS 쿠키로 친다(FE PR 7). `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다:
 *  - `GET /classbot/classes/:classId/chat?studentId=&limit=100` · `GET …/signals` · `GET …/signals?studentId=&limit=200`
 *  - `PATCH /classbot/signals/:id/ack` — 본문 없음 · CSRF 붙음 · **낙관적**(누르는 즉시 캐시가 바뀌고 실패하면 되돌린다)
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let authUser: { id: string } | null = { id: 'sub-t' };
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: true }),
}));
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: jest.fn(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type { ClassSignalsDto, MemberMessageDto, RiskSignalDto } from '@/lib/api/classbot-dto';
import {
  monitoringKeys, useAckSignal, useClassSignals, useMemberChat, useStudentSignals,
} from '../monitoring';

const BASE = `${API_BASE}/classbot`;

const SIGNAL: RiskSignalDto = {
  id: '5d2e6d3a-0000-4c2e-9a3b-000000000001', studentId: 's_1', kind: 'answer_seeking', severity: 2, messageId: 'msg_1',
  detail: { rule: 'answer_seeking', pattern: 0 }, createdAt: '2026-09-17T01:00:00.000Z', ackedBy: null, ackedAt: null,
};
const VIEW: ClassSignalsDto = {
  summary: [{ studentId: 's_1', counts: { answer_seeking: 1 }, maxSeverity: 2, lastAt: '2026-09-17T01:00:00.000Z', unacked: 1 }],
  signals: [SIGNAL],
};
const MESSAGES: MemberMessageDto[] = [
  { id: 'msg_1', role: 'user', content: '답 알려줘', createdAt: '2026-09-17T01:00:00.000Z', botId: 'bot_1', cardType: null, cardPayload: null, blockIndex: null },
];

interface Call { url: string; method: string; body?: string; headers: Record<string, string>; credentials?: RequestCredentials }
let calls: Call[];
let ackStatus: number;

function res(code: number, body: unknown): Response {
  return { ok: code >= 200 && code < 300, status: code, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method ?? 'GET';
  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  calls.push({ url, method, body: init?.body === undefined ? undefined : String(init.body), headers, credentials: init?.credentials });

  if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));
  if (url === `${BASE}/classes/cls_1/chat?studentId=s_1&limit=100`) return Promise.resolve(res(200, MESSAGES));
  if (url === `${BASE}/classes/cls_1/signals`) return Promise.resolve(res(200, VIEW));
  if (url === `${BASE}/classes/cls_1/signals?studentId=s_1&limit=200`) return Promise.resolve(res(200, VIEW));
  if (url === `${BASE}/signals/${SIGNAL.id}/ack` && method === 'PATCH') {
    if (ackStatus >= 400) return Promise.resolve(res(ackStatus, { statusCode: ackStatus, message: 'nope' }));
    return Promise.resolve(res(200, { ...SIGNAL, ackedBy: 'sub-t', ackedAt: '2026-09-17T02:00:00.000Z' }));
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-t' };
  calls = [];
  ackStatus = 200;
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('읽기 셋 — 정본 경로·쿼리', () => {
  it('useMemberChat 은 ?studentId=&limit=100 으로 교사 열람 문을 친다(OS 쿠키 · CSRF 없음)', async () => {
    const { result } = renderHook(() => useMemberChat('cls_1', 's_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MESSAGES);
    const call = calls.find((c) => c.url.includes('/chat?'));
    expect(call).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(call?.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('학생을 고르기 전에는 묻지 않는다', () => {
    const { result } = renderHook(() => useMemberChat('cls_1', null), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(calls).toHaveLength(0);
  });

  it('useClassSignals 는 반 전체, useStudentSignals 는 ?studentId=&limit=200', async () => {
    const all = renderHook(() => useClassSignals('cls_1'), { wrapper: Wrapper });
    const one = renderHook(() => useStudentSignals('cls_1', 's_1'), { wrapper: Wrapper });
    await waitFor(() => expect(all.result.current.isSuccess && one.result.current.isSuccess).toBe(true));
    expect(calls.map((c) => c.url)).toEqual(
      expect.arrayContaining([`${BASE}/classes/cls_1/signals`, `${BASE}/classes/cls_1/signals?studentId=s_1&limit=200`]),
    );
  });
});

describe('useAckSignal — PATCH /classbot/signals/:id/ack', () => {
  const allKey = [...monitoringKeys.classSignals('cls_1'), 'sub-t'];
  const oneKey = [...monitoringKeys.studentSignals('cls_1', 's_1'), 'sub-t'];

  it('본문 없이 CSRF 를 붙여 보내고, 반 전체·학생별 캐시를 즉시 확인 처리한다', async () => {
    queryClient.setQueryData(allKey, VIEW);
    queryClient.setQueryData(oneKey, VIEW);
    const { result } = renderHook(() => useAckSignal('cls_1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ signalId: SIGNAL.id, studentId: 's_1' });
    });

    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch).toBeDefined();
    expect(patch?.url).toBe(`${BASE}/signals/${SIGNAL.id}/ack`);
    expect(patch?.body).toBeUndefined();
    expect(patch?.credentials).toBe('include');
    expect(patch?.headers['X-CSRF-Token']).toBe('csrf-1');

    for (const key of [allKey, oneKey]) {
      const view = queryClient.getQueryData<ClassSignalsDto>(key);
      expect(view?.signals[0].ackedAt).not.toBeNull();
      expect(view?.summary[0].unacked).toBe(0);
    }
  });

  it('실패(404)하면 캐시를 되돌린다', async () => {
    ackStatus = 404;
    queryClient.setQueryData(allKey, VIEW);
    const { result } = renderHook(() => useAckSignal('cls_1'), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ signalId: SIGNAL.id, studentId: 's_1' })).rejects.toMatchObject({ status: 404 });
    });

    const view = queryClient.getQueryData<ClassSignalsDto>(allKey);
    expect(view?.signals[0].ackedAt).toBeNull();
    expect(view?.summary[0].unacked).toBe(1);
  });

  it('이미 확인된 신호를 다시 눌러도 캐시가 이중으로 내려가지 않는다(멱등)', async () => {
    const acked: ClassSignalsDto = {
      summary: [{ ...VIEW.summary[0], unacked: 0 }],
      signals: [{ ...SIGNAL, ackedBy: 'sub-t', ackedAt: '2026-09-17T02:00:00.000Z' }],
    };
    queryClient.setQueryData(allKey, acked);
    const { result } = renderHook(() => useAckSignal('cls_1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ signalId: SIGNAL.id, studentId: 's_1' });
    });

    expect(queryClient.getQueryData<ClassSignalsDto>(allKey)?.summary[0].unacked).toBe(0);
  });

  it('반 전체 캐시의 목록(상한 50)에 그 신호가 없어도 학생 집계는 즉시 내려간다', async () => {
    queryClient.setQueryData(allKey, { ...VIEW, signals: [] });
    const { result } = renderHook(() => useAckSignal('cls_1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ signalId: SIGNAL.id, studentId: 's_1' });
    });

    expect(queryClient.getQueryData<ClassSignalsDto>(allKey)?.summary[0].unacked).toBe(0);
  });
});
