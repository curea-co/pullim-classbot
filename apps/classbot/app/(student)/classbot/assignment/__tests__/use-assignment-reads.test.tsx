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
import { remainingDDay } from '@/lib/assignment-due';
import type { AssignmentDetailDto, AssignmentSummaryDto } from '@/lib/api/classbot-dto';
import {
  dDayLabel,
  dispatchedAtLabel,
  mySubmissionOf,
  studentQuestionsOf,
  toAssignmentReadRow,
  toStudentQuestion,
  toVisibleAssignmentRow,
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

/** SUMMARY 를 낸 그날 — 그날 보면 굳힌 dDay 가 그대로 남은 날수다. */
const DISPATCH_DAY = Date.parse(SUMMARY.dispatchedAt ?? '');
const DAY = 86_400_000;

describe('toAssignmentReadRow — 정본 DTO → 화면 행', () => {
  it('서버가 준 칸은 그대로, 없는 칸은 규칙대로 채운다', () => {
    const row = toAssignmentReadRow(SUMMARY, DISPATCH_DAY);
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
      // SUMMARY 에는 본인 제출 세 칸이 없다(#681 이전 서버) — 「모른다」로 떨어진다. 아래 describe 가 네 갈래를 잰다.
      submitted: null,
      submittedAt: null,
      scorePercent: null,
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

  it('dDay 는 낼 때 굳힌 정수를 지금 기준으로 다시 센다 — D-3 으로 낸 과제가 이틀 뒤엔 「내일」, 닷새 뒤엔 「지난 2일」', () => {
    expect(toAssignmentReadRow(SUMMARY, DISPATCH_DAY + 2 * DAY).dDay).toBe('내일');
    expect(toAssignmentReadRow(SUMMARY, DISPATCH_DAY + 3 * DAY).dDay).toBe('오늘');
    expect(toAssignmentReadRow(SUMMARY, DISPATCH_DAY + 5 * DAY).dDay).toBe('지난 2일');
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

/**
 * 본인 제출 세 칸(pullim-api #681) — **갈래는 넷이고, 그중 둘만 사실 주장이다.**
 *
 * 종전에는 `completedCount: 0` 이 박혀 있고 제출 여부를 `state` 에서 읽어, **낸 과제가 계속 「안 냄」으로 보였다**
 * (`state` 는 과제당 하나뿐인 자유 문자열이고 이 앱의 배포 폼은 늘 `'todo'` 를 넣는다).
 */
describe('본인 제출 세 칸 — 없음·false·true·null', () => {
  it('칸이 아예 없으면(#681 배포 전 서버) 「모른다」다 — false 로 접지 않는다', () => {
    const row = toAssignmentReadRow(SUMMARY);
    expect(row.submitted).toBeNull();
    expect(row.submittedAt).toBeNull();
    expect(row.scorePercent).toBeNull();
    // 「모른다」에서는 종전과 같은 그림이어야 한다 — 진척을 0 으로 두되 그것이 「안 냈다」는 뜻은 아니다.
    expect(row.completedCount).toBe(0);
  });

  it('false 면 「안 냈다」 — 서버가 한 말이고, 「모른다」와 구별된다', () => {
    const row = toAssignmentReadRow({ ...SUMMARY, submitted: false, submittedAt: null, scorePercent: null });
    expect(row.submitted).toBe(false);
    expect(row.completedCount).toBe(0);
  });

  it('true 면 「냈다」 — 진척도 다 푼 것으로 선다(정본에 중간 진행도 칸이 없다)', () => {
    const row = toAssignmentReadRow({
      ...SUMMARY,
      submitted: true,
      submittedAt: '2026-09-18T10:00:00.000Z',
      scorePercent: 80,
    });
    expect(row.submitted).toBe(true);
    expect(row.submittedAt).toBe('2026-09-18T10:00:00.000Z');
    expect(row.scorePercent).toBe(80);
    expect(row.completedCount).toBe(row.questionCount);
  });

  it('null 이면(운영자 관점) 「모른다」다 — 칸 없음과 같은 답으로 떨어진다', () => {
    const row = toAssignmentReadRow({ ...SUMMARY, submitted: null, submittedAt: null, scorePercent: null });
    expect(row.submitted).toBeNull();
    expect(row.completedCount).toBe(0);
  });

  it('scorePercent 0 은 0점이고 null 은 「점수가 없다」 — 둘을 같은 값으로 접지 않는다', () => {
    const zero = toAssignmentReadRow({ ...SUMMARY, submitted: true, submittedAt: 'x', scorePercent: 0 });
    const none = toAssignmentReadRow({ ...SUMMARY, submitted: true, submittedAt: 'x', scorePercent: null });
    expect(zero.scorePercent).toBe(0);
    expect(none.scorePercent).toBeNull();
  });

  it('상세도 같은 세 칸을 싣는다', () => {
    const row = toVisibleAssignmentRow({ ...DETAIL, submitted: true, submittedAt: 'x', scorePercent: 0 });
    expect(row.submitted).toBe(true);
    expect(row.scorePercent).toBe(0);
  });
});

/**
 * `mySubmissionOf` — 행과 이 세션의 제출 응답을 합쳐 **셋 중 하나**로 답한다.
 * 화면(상세 CTA·결과 점수 칸)이 「안 냄」과 「모른다」를 다르게 그리는 근거가 여기다.
 */
describe('mySubmissionOf — 냈다 · 안 냈다 · 모른다', () => {
  const row = (submitted: boolean | null, scorePercent: number | null = null) =>
    ({ submitted, submittedAt: submitted ? '2026-09-18T10:00:00.000Z' : null, scorePercent });

  it('서버가 모르면 unknown — 「안 냈다」고 말하지 않는다', () => {
    expect(mySubmissionOf(row(null))).toEqual({ kind: 'unknown' });
  });

  it('서버가 false 면 not-submitted', () => {
    expect(mySubmissionOf(row(false))).toEqual({ kind: 'not-submitted' });
  });

  it('서버가 true 면 submitted — 점수 0 도 0점으로 그대로 전한다', () => {
    expect(mySubmissionOf(row(true, 0))).toEqual({
      kind: 'submitted',
      scorePercent: 0,
      submittedAt: '2026-09-18T10:00:00.000Z',
      // 서버 행에는 채점 시각 칸이 없다 — 지어내지 않는다.
      gradedAt: null,
    });
  });

  it('미채점(null)은 점수 0 과 다른 값으로 남는다', () => {
    const view = mySubmissionOf(row(true, null));
    expect(view).toMatchObject({ kind: 'submitted', scorePercent: null });
  });

  it('이 세션에서 방금 낸 것이 서버 행보다 앞선다 — 목록 캐시가 아직 옛 행이어도', () => {
    const view = mySubmissionOf(row(null), {
      submissionId: 's_1',
      assignmentId: 'asg_1',
      studentId: 'sub-1',
      scorePercent: 0,
      gradedAt: '2026-09-19T01:00:00.000Z',
      submittedAt: '2026-09-19T00:59:00.000Z',
    });
    expect(view).toEqual({
      kind: 'submitted',
      scorePercent: 0,
      gradedAt: '2026-09-19T01:00:00.000Z',
      submittedAt: '2026-09-19T00:59:00.000Z',
    });
  });
});

describe('toStudentQuestion · studentQuestionsOf — 정본 문항 → 풀이 화면 문항', () => {
  it('유형을 좁히고 보기는 문자열만 남긴다 · 배점 0 은 「모른다」 · 정답·힌트는 없다', () => {
    const q = toStudentQuestion(
      { id: 'q_1', order: 0, type: 'mc', prompt: '다음 중 옳은 것은?', options: ['a', 3, 'b'], autoGradable: true },
      'asg_1',
      1,
    );
    expect(q).toEqual({ id: 'q_1', assignmentId: 'asg_1', order: 1, type: 'mc', prompt: '다음 중 옳은 것은?', points: 0, options: ['a', 'b'] });
    expect(q).not.toHaveProperty('answerKey');
    expect(q).not.toHaveProperty('answerIndex');
    expect(q).not.toHaveProperty('hints');
  });

  it('객관식이 아니면 options 를 싣지 않고, 낯선 유형은 단답으로 접는다', () => {
    const short = toStudentQuestion({ id: 'q', order: 0, type: 'short', prompt: 'p', options: null, autoGradable: true }, 'a', 1);
    expect(short).not.toHaveProperty('options');
    const weird = toStudentQuestion({ id: 'q', order: 0, type: 'weird', prompt: 'p', options: null, autoGradable: true }, 'a', 1);
    expect(weird.type).toBe('short');
  });

  it('서버 order 로 정렬해 1번부터 다시 매긴다', () => {
    const row = toVisibleAssignmentRow({
      ...DETAIL,
      questions: [
        { id: 'q_b', order: 5, type: 'short', prompt: 'b', options: null, autoGradable: true },
        { id: 'q_a', order: 2, type: 'essay', prompt: 'a', options: null, autoGradable: false },
      ],
    });
    expect(studentQuestionsOf(row).map((q) => [q.id, q.order])).toEqual([['q_a', 1], ['q_b', 2]]);
  });
});

describe('useVisibleAssignments — GET /classbot/assignments?audience=student', () => {
  it('OS 쿠키로 읽어 { assignments } 봉투로 돌려준다 · CSRF 없음', async () => {
    const { result } = renderHook(() => useVisibleAssignments(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.assignments).toHaveLength(1);
    // dDay 는 훅이 **지금** 기준으로 다시 센다 — 굳힌 'D-3' 이 아니라 낸 날부터 지난 날수를 뺀 라벨이다.
    expect(result.current.data?.assignments[0]).toMatchObject({
      id: 'asg_1',
      botId: 'cls_1',
      dDay: dDayLabel(remainingDDay(SUMMARY.dDay, SUMMARY.dispatchedAt)),
    });
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
