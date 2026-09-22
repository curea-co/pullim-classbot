/**
 * 학생 제출 훅 — pullim-api 정본 `POST /classbot/assignments/:id/submit` 를 OS 쿠키 + CSRF 로 친다(FE PR 6).
 * 본문은 `{ answers }` 하나(점수를 보내지 않는다) · 201 첫 제출 / 200 재제출 · 로컬 스토어에는 쓰지 않는다.
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: jest.fn(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type { SubmissionDto } from '@/lib/api/classbot-dto';
import { useSubmitAssignment } from '../use-assignment-submit';

const BASE = `${API_BASE}/classbot`;

const SUBMISSION: SubmissionDto = {
  submissionId: 'sub_1', assignmentId: 'asg_1', studentId: 'sub-s1', scorePercent: 50,
  gradedAt: '2026-09-16T09:00:00.000Z', submittedAt: '2026-09-16T09:00:00.000Z',
};

interface Call { url: string; method: string; body?: unknown; headers: Record<string, string>; credentials?: RequestCredentials }
let calls: Call[];
let submitStatus: number;

function res(code: number, body: unknown): Response {
  return { ok: code >= 200 && code < 300, status: code, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response;
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls = [];
  submitStatus = 201;
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({
      url, method,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
      headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) },
      credentials: init?.credentials,
    });
    if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));
    if (url === `${BASE}/assignments/asg_1/submit` && method === 'POST') {
      return Promise.resolve(submitStatus >= 400 ? res(submitStatus, { statusCode: submitStatus, message: 'nope' }) : res(submitStatus, SUBMISSION));
    }
    return Promise.resolve(res(404, { statusCode: 404 }));
  }) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => queryClient.clear());

it('{ answers } 만 OS 쿠키 + CSRF 로 보내고, 201 이면 첫 제출이다', async () => {
  const { result } = renderHook(() => useSubmitAssignment(), { wrapper: Wrapper });
  let out: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
  await act(async () => {
    out = await result.current.mutateAsync({ assignmentId: 'asg_1', answers: { q_1: 1, q_2: '증발' } });
  });

  const post = calls.find((c) => c.method === 'POST' && c.url === `${BASE}/assignments/asg_1/submit`);
  expect(post).toBeDefined();
  expect(post?.body).toEqual({ answers: { q_1: 1, q_2: '증발' } });
  expect(post?.body).not.toHaveProperty('scorePercent');
  expect(post?.credentials).toBe('include');
  expect(post?.headers['X-CSRF-Token']).toBe('csrf-1');
  expect(out).toEqual({ submission: SUBMISSION, resubmitted: false });
  // 제출은 서버에만 산다.
  expect(window.localStorage.getItem('pullim-assignments')).toBeNull();
});

it('200 이면 재제출(upsert) — 오류가 아니라 resubmitted:true', async () => {
  submitStatus = 200;
  const { result } = renderHook(() => useSubmitAssignment(), { wrapper: Wrapper });
  let out: { resubmitted: boolean } | undefined;
  await act(async () => {
    out = await result.current.mutateAsync({ assignmentId: 'asg_1', answers: {} });
  });
  expect(out?.resubmitted).toBe(true);
});

it('403(대상 아님)은 ApiError 로 던진다', async () => {
  submitStatus = 403;
  const { result } = renderHook(() => useSubmitAssignment(), { wrapper: Wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync({ assignmentId: 'asg_1', answers: {} })).rejects.toMatchObject({ status: 403 });
  });
});
