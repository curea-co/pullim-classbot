/**
 * 교사 과제 훅 — pullim-api 정본을 OS 쿠키로 친다(FE PR 6). `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다:
 *  - `POST /classbot/classes/:classId/assignments` — 본문에 `questions[]` 가 그대로 실리고 CSRF 가 붙는다
 *  - `GET /classbot/assignments?audience=teacher` · `GET /classbot/assignments/:id` · `GET …/:id/submissions`
 * 로컬 스토어(`pullim-assignments`)에는 아무것도 쓰지 않는다 — 그것도 여기서 못박는다.
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let authUser: { id: string } | null = { id: 'sub-t' };
let authReady = true;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: authReady }),
}));
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: jest.fn(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type {
  AssignmentAuthoringDto, AssignmentDetailDto, AssignmentSummaryDto, DispatchAssignmentBody, SubmissionsViewDto,
} from '@/lib/api/classbot-dto';
import {
  useAssignmentAuthoring,
  useAssignmentDetail,
  useAssignmentSubmissions,
  useDispatchAssignment,
  useRestoreAssignment,
  useTeacherAssignments,
  useUpdateAssignment,
  useWithdrawAssignment,
} from '../assignment-dispatch';

const BASE = `${API_BASE}/classbot`;

const SUMMARY: AssignmentSummaryDto = {
  id: 'asg_1', classId: 'cls_1', title: '3단원 연습문제', scope: '3단원', subject: '수학Ⅱ', grade: '고2',
  mode: 'practice', questionCount: 2, difficulty: '중', dueLabel: '내일 22:00', dDay: 1, dispatchStatus: 'sent',
  dispatchedAt: '2026-09-16T08:30:00.000Z', examTimeLimitMin: null, state: 'todo', chapterFrom: null, chapterTo: null,
  achievementCodes: null,
};
const DETAIL: AssignmentDetailDto = {
  ...SUMMARY,
  questions: [
    { id: 'q_1', order: 0, type: 'mc', prompt: '다음 중 옳은 것은?', options: ['a', 'b'], autoGradable: true },
    { id: 'q_2', order: 1, type: 'essay', prompt: '설명하시오', options: null, autoGradable: false },
  ],
};
const SUBMISSIONS: SubmissionsViewDto[] = [
  { submissionId: 'sub_1', studentId: 'sub-s1', scorePercent: null, gradedAt: null, submittedAt: '2026-09-16T09:00:00.000Z', answers: { q_1: 1, q_2: '증발' } },
];
const BODY: DispatchAssignmentBody = {
  title: '3단원 연습문제', scope: '3단원', subject: '수학Ⅱ', grade: '고2', mode: 'practice', questionCount: 2,
  difficulty: '중', dueLabel: '내일 22:00', dDay: 1, state: 'todo', chapterFrom: null, chapterTo: null,
  achievementCodes: [], examTimeLimitMin: null, targetStudentIds: [],
  questions: [
    { order: 0, type: 'mc', prompt: '다음 중 옳은 것은?', options: ['a', 'b'], answerKey: 1 },
    { order: 1, type: 'essay', prompt: '설명하시오' },
  ],
};
const AUTHORING: AssignmentAuthoringDto = {
  id: 'asg_1', classId: 'cls_1', dispatchStatus: 'sent', ...BODY,
};

interface Call { url: string; method: string; body?: unknown; headers: Record<string, string>; credentials?: RequestCredentials }
let calls: Call[];
let dispatchStatus: number;
let readStatus: number;

function res(code: number, body: unknown): Response {
  return { ok: code >= 200 && code < 300, status: code, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method ?? 'GET';
  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ url, method, body, headers, credentials: init?.credentials });

  if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));
  if (url === `${BASE}/classes/cls_1/assignments` && method === 'POST') {
    return Promise.resolve(dispatchStatus >= 400 ? res(dispatchStatus, { statusCode: dispatchStatus, message: 'questions 는 최소 1개 이상이어야 합니다.' }) : res(201, SUMMARY));
  }
  if (readStatus >= 400) return Promise.resolve(res(readStatus, { statusCode: readStatus }));
  if (url === `${BASE}/assignments?audience=teacher`) return Promise.resolve(res(200, [SUMMARY]));
  if (url === `${BASE}/assignments/asg_1/authoring`) return Promise.resolve(res(200, AUTHORING));
  if (url === `${BASE}/assignments/asg_1` && method === 'PATCH') {
    const patch = body as Record<string, unknown>;
    return Promise.resolve(res(200, { ...AUTHORING, ...patch, dispatchStatus: patch.state === 'sent' ? 'sent' : AUTHORING.dispatchStatus }));
  }
  if (url === `${BASE}/assignments/asg_1` && method === 'DELETE') return Promise.resolve(res(204, null));
  if (url === `${BASE}/assignments/asg_1`) return Promise.resolve(res(200, DETAIL));
  if (url === `${BASE}/assignments/asg_1/submissions`) return Promise.resolve(res(200, SUBMISSIONS));
  return Promise.resolve(res(404, { statusCode: 404 }));
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-t' };
  authReady = true;
  calls = [];
  dispatchStatus = 201;
  readStatus = 200;
  queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } } });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => queryClient.clear());

describe('useDispatchAssignment — POST /classbot/classes/:classId/assignments', () => {
  it('문항까지 본문에 그대로 실어 OS 쿠키 + CSRF 로 보내고, 요약 한 행을 돌려준다', async () => {
    const { result } = renderHook(() => useDispatchAssignment(), { wrapper: Wrapper });

    let created: AssignmentSummaryDto | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({ classId: 'cls_1', body: BODY });
    });

    const post = calls.find((c) => c.method === 'POST' && c.url === `${BASE}/classes/cls_1/assignments`);
    expect(post).toBeDefined();
    expect(post?.body).toEqual(BODY);
    expect(post?.credentials).toBe('include');
    expect(post?.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(created).toEqual(SUMMARY);
    // 로컬 사본은 쓰지 않는다 — 정본 하나다.
    expect(window.localStorage.getItem('pullim-assignments')).toBeNull();
  });

  it('반 id 는 경로에 인코딩해 넣는다', async () => {
    const { result } = renderHook(() => useDispatchAssignment(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ classId: 'cls/1?x', body: BODY }).catch(() => undefined);
    });
    expect(calls.some((c) => c.url === `${BASE}/classes/${encodeURIComponent('cls/1?x')}/assignments`)).toBe(true);
  });

  it('400 이면 서버 문구를 그대로 든 ApiError 로 던진다', async () => {
    dispatchStatus = 400;
    const { result } = renderHook(() => useDispatchAssignment(), { wrapper: Wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ classId: 'cls_1', body: BODY })).rejects.toMatchObject({
        status: 400,
        message: 'questions 는 최소 1개 이상이어야 합니다.',
      });
    });
  });
});

describe('useTeacherAssignments — GET /classbot/assignments?audience=teacher', () => {
  it('봉투 없는 배열을 그대로 돌려준다 · CSRF 없음', async () => {
    const { result } = renderHook(() => useTeacherAssignments(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0]).toMatchObject({ url: `${BASE}/assignments?audience=teacher`, method: 'GET', credentials: 'include' });
    expect(calls[0].headers['X-CSRF-Token']).toBeUndefined();
    expect(result.current.data).toEqual([SUMMARY]);
  });

  it('세션 복원 전에는 묻지 않는다', async () => {
    authReady = false;
    const { result } = renderHook(() => useTeacherAssignments(), { wrapper: Wrapper });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toHaveLength(0);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useAssignmentDetail — GET /classbot/assignments/:id', () => {
  it('문항까지 함께 온다(🔒 answerKey 없음)', async () => {
    const { result } = renderHook(() => useAssignmentDetail('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.questions).toHaveLength(2);
    expect(result.current.data?.questions[0]).not.toHaveProperty('answerKey');
  });

  it('403(남의 반)은 재시도하지 않고 오류로 끝난다', async () => {
    readStatus = 403;
    const { result } = renderHook(() => useAssignmentDetail('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(calls.filter((c) => c.url === `${BASE}/assignments/asg_1`)).toHaveLength(1);
    expect(result.current.error?.status).toBe(403);
  });

  it('id 가 비어 있으면 묻지 않는다', async () => {
    renderHook(() => useAssignmentDetail(''), { wrapper: Wrapper });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toHaveLength(0);
  });
});

describe('useAssignmentSubmissions — GET /classbot/assignments/:id/submissions', () => {
  it('학생 sub·점수·답안이 온다 — 서술형이 있으면 점수는 null', async () => {
    const { result } = renderHook(() => useAssignmentSubmissions('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].url).toBe(`${BASE}/assignments/asg_1/submissions`);
    expect(result.current.data).toEqual(SUBMISSIONS);
    expect(result.current.data?.[0].scorePercent).toBeNull();
  });
});

describe('과제 lifecycle — authoring · 수정 · 회수 · 복구', () => {
  it('정답과 대상은 학생 상세가 아니라 교사 authoring 문에서만 읽는다', async () => {
    const { result } = renderHook(() => useAssignmentAuthoring('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls[0].url).toBe(`${BASE}/assignments/asg_1/authoring`);
    expect(result.current.data?.questions[0]).toHaveProperty('answerKey', 1);
    expect(result.current.data?.targetStudentIds).toEqual([]);
  });

  it('문항·대상 수정은 PATCH에 그대로 싣고 회수는 DELETE, 복구는 state sent PATCH다', async () => {
    const { result } = renderHook(() => ({
      update: useUpdateAssignment(),
      withdraw: useWithdrawAssignment(),
      restore: useRestoreAssignment(),
    }), { wrapper: Wrapper });

    await act(async () => {
      await result.current.update.mutateAsync({
        assignmentId: 'asg_1',
        patch: { questions: BODY.questions, targetStudentIds: ['stu_1'] },
      });
      await result.current.withdraw.mutateAsync('asg_1');
      await result.current.restore.mutateAsync('asg_1');
    });

    expect(calls.find((call) => call.method === 'PATCH' && (call.body as Record<string, unknown>)?.questions)).toMatchObject({
      url: `${BASE}/assignments/asg_1`,
      body: { questions: BODY.questions, targetStudentIds: ['stu_1'] },
    });
    expect(calls).toContainEqual(expect.objectContaining({ url: `${BASE}/assignments/asg_1`, method: 'DELETE' }));
    expect(calls).toContainEqual(expect.objectContaining({ url: `${BASE}/assignments/asg_1`, method: 'PATCH', body: { state: 'sent' } }));
  });
});
