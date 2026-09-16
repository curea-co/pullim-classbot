/**
 * 학생 과제 읽기 — pullim-api 정본(`GET /classbot/assignments?audience=student` · `/:id`)을 OS 쿠키로
 * 친다(2026-09-16 계획 PR 4 · §06 R7·R8). 보는 것은 셋이다: 정본 DTO → 화면 행 매핑(서버에 없는 칸의
 * 채움 규칙 포함), 요청 계약(URL·credentials·CSRF 없음), 그리고 401/404 판정.
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
import type { AssignmentDetailDto, AssignmentSummaryDto } from '@/lib/api/classbot-dto';
import {
  dDayLabel,
  dispatchedAtLabel,
  toAssignmentReadRow,
  useVisibleAssignment,
  useVisibleAssignments,
} from '../use-assignment-reads';

const BASE = `${API_BASE}/classbot`;

/** 정본 요약 한 행 — 교사가 이 앱에서 낸 값이 그대로 돌아온 모양. */
const SUMMARY: AssignmentSummaryDto = {
  id: 'asg_1',
  classId: 'cls_1',
  title: '3단원 연습문제',
  scope: '3단원',
  subject: '수학Ⅱ',
  grade: '고2',
  mode: 'practice',
  questionCount: 10,
  difficulty: '중',
  dueLabel: '9월 19일까지',
  dDay: 3,
  dispatchStatus: 'sent',
  dispatchedAt: '2026-09-16T08:30:00.000Z',
  examTimeLimitMin: null,
  state: 'todo',
  chapterFrom: null,
  chapterTo: null,
  achievementCodes: null,
};

const DETAIL: AssignmentDetailDto = {
  ...SUMMARY,
  questions: [
    { id: 'q_1', order: 0, type: 'mc', prompt: '다음 중 옳은 것은?', options: ['a', 'b'], autoGradable: true },
  ],
};

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  credentials?: RequestCredentials;
}
let calls: Call[];
let listStatus: number;
let detailStatus: number;

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
  calls.push({
    url,
    method,
    headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) },
    credentials: init?.credentials,
  });
  if (url === `${BASE}/assignments?audience=student`) {
    return Promise.resolve(listStatus >= 400 ? res(listStatus, { statusCode: listStatus }) : res(200, [SUMMARY]));
  }
  if (url === `${BASE}/assignments/asg_1`) {
    return Promise.resolve(detailStatus >= 400 ? res(detailStatus, { statusCode: detailStatus }) : res(200, DETAIL));
  }
  return Promise.resolve(res(404, { statusCode: 404 }));
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-1' };
  authReady = true;
  calls = [];
  listStatus = 200;
  detailStatus = 200;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('toAssignmentReadRow — 정본 DTO → 화면 행', () => {
  it('서버가 준 칸은 그대로, 없는 칸은 규칙대로 채운다', () => {
    const row = toAssignmentReadRow(SUMMARY);
    expect(row).toMatchObject({
      id: 'asg_1',
      botId: 'cls_1', // bot == class
      studentId: null,
      title: '3단원 연습문제',
      scope: '3단원',
      subject: '수학Ⅱ',
      grade: '고2',
      chapterFrom: '',
      chapterTo: '',
      achievementCodes: [],
      questionCount: 10,
      difficulty: '중',
      mode: 'practice',
      scopeOverride: null,
      source: 'teacher-assigned',
      assignedBy: '', // 교사 표시명은 정본에 없다 — 지어내지 않고 화면이 폴백한다
      dueLabel: '9월 19일까지',
      dDay: 'D-3',
      completedCount: 0,
      recentAccuracy: null,
      state: 'todo',
      reasonHint: null,
      solveHref: '/classbot/assignment/asg_1/solve?step=1',
    });
    expect(row.assignedAtLabel).toBe(dispatchedAtLabel(SUMMARY.dispatchedAt));
    expect(row.assignedAtLabel).toMatch(/^2026-09-1\d \d{2}:\d{2}$/);
  });

  it('nullable 칸이 채워져 오면 그대로 싣는다', () => {
    const row = toAssignmentReadRow({
      ...SUMMARY,
      chapterFrom: '3-1',
      chapterTo: '3-2',
      achievementCodes: ['10수01-01'],
    });
    expect(row.chapterFrom).toBe('3-1');
    expect(row.chapterTo).toBe('3-2');
    expect(row.achievementCodes).toEqual(['10수01-01']);
  });

  it('서버가 string 으로 열어 둔 칸은 화면 union 으로 좁히고, 낯선 값은 보수적으로 접는다', () => {
    const known = toAssignmentReadRow({ ...SUMMARY, mode: 'exam', difficulty: '상', state: 'in-progress' });
    expect(known).toMatchObject({ mode: 'exam', difficulty: '상', state: 'in-progress' });

    const unknown = toAssignmentReadRow({ ...SUMMARY, mode: 'weird', difficulty: '?', state: 'active' });
    expect(unknown).toMatchObject({ mode: 'practice', difficulty: '중', state: 'todo' });
  });

  it('dDay 라벨은 assignment-state 의 parseDDay 가 읽는 네 형태만 낸다', () => {
    expect(dDayLabel(3)).toBe('D-3');
    expect(dDayLabel(1)).toBe('내일');
    expect(dDayLabel(0)).toBe('오늘');
    expect(dDayLabel(-2)).toBe('지난 2일');
  });

  it('배포 전(null)·깨진 시각은 빈 라벨', () => {
    expect(dispatchedAtLabel(null)).toBe('');
    expect(dispatchedAtLabel('not-a-date')).toBe('');
  });
});

describe('useVisibleAssignments — GET /classbot/assignments?audience=student', () => {
  it('OS 쿠키로 읽어 { assignments } 봉투로 돌려준다 · CSRF 없음', async () => {
    const { result } = renderHook(() => useVisibleAssignments(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.assignments).toHaveLength(1);
    expect(result.current.data?.assignments[0]).toMatchObject({ id: 'asg_1', botId: 'cls_1', dDay: 'D-3' });
    expect(result.current.isUnauthenticated).toBe(false);
    expect(result.current.isError).toBe(false);

    const get = calls.find((c) => c.url === `${BASE}/assignments?audience=student`);
    expect(get?.method).toBe('GET');
    expect(get?.credentials).toBe('include');
    expect(get?.headers['X-CSRF-Token']).toBeUndefined();
    expect(get?.headers.Authorization).toBeUndefined();
  });

  it('세션 복원 전에는 묻지 않고 로딩이다', async () => {
    authReady = false;
    authUser = null;
    const { result } = renderHook(() => useVisibleAssignments(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
    await act(async () => Promise.resolve());
    expect(calls).toHaveLength(0);
  });

  it('401 → isUnauthenticated(오류 카드 아님) + OS 로그인으로', async () => {
    listStatus = 401;
    const { result } = renderHook(() => useVisibleAssignments(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isUnauthenticated).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });

  it('5xx → isError, 한 번 더 시도한 뒤', async () => {
    listStatus = 500;
    const { result } = renderHook(() => useVisibleAssignments(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(calls).toHaveLength(2);
  });
});

describe('useVisibleAssignment — GET /classbot/assignments/:id', () => {
  it('문항까지 함께 온다(🔒 answerKey 없음)', async () => {
    const { result } = renderHook(() => useVisibleAssignment('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchObject({ id: 'asg_1', botId: 'cls_1' });
    expect(result.current.data?.questions).toEqual(DETAIL.questions);
    expect(result.current.data?.questions[0]).not.toHaveProperty('answerKey');
    expect(calls[0].url).toBe(`${BASE}/assignments/asg_1`);
  });

  it('404 → isNotFound(오류 아님) — 남의 반 과제도 여기다', async () => {
    detailStatus = 404;
    const { result } = renderHook(() => useVisibleAssignment('asg_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isNotFound).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.isUnauthenticated).toBe(false);
    expect(calls).toHaveLength(1); // 4xx 는 다시 보내지 않는다
  });

  it('id 가 비어 있으면 묻지 않는다', async () => {
    renderHook(() => useVisibleAssignment(''), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(calls).toHaveLength(0);
  });
});
