/**
 * assignments 정본 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * fetch 는 jest mock (실 BE 불요). 정본 계약:
 *  - dispatch: POST /classbot/classes/:classId/assignments (CSRF, 문항은 answerKey 동봉)
 *  - submit:   POST /classbot/assignments/:id/submit **{ answers } 만**(scorePercent 미전송) — 서버 점수 소비
 *  - read:     GET  /classbot/assignments?audience=student (bare array)
 */
import { renderHook, act, waitFor } from '@testing-library/react';

let _useRealCoreBE = false;
jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return _useRealCoreBE;
  },
  get USE_REAL_REQUIZ_BE() {
    return false;
  },
}));

import { setDomainIdentitySnapshot } from '@/lib/api/domain-fetch';
import {
  useAssignmentStore,
  useMergedAssignments,
  resetBackendAssignmentSyncForTests,
  type UserAssignment,
} from '../assignments';

const fetchMock = jest.fn();

function domainRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}
function csrfRes(): Response {
  return { ok: true, status: 200, json: async () => ({ csrfToken: 'csrf-t' }) } as unknown as Response;
}

type QItem = { kind: 'res'; res: Response } | { kind: 'reject'; err: unknown };
let domainQueue: QItem[] = [];
function qRes(status: number, body: unknown): void {
  domainQueue.push({ kind: 'res', res: domainRes(status, body) });
}
function qReject(err: unknown): void {
  domainQueue.push({ kind: 'reject', err });
}
function domainCalls(): [string, RequestInit][] {
  return fetchMock.mock.calls.filter(([u]) => !String(u).endsWith('/auth/csrf')) as [
    string,
    RequestInit,
  ][];
}

beforeEach(() => {
  domainQueue = [];
  fetchMock.mockImplementation((url: unknown) => {
    if (String(url).endsWith('/auth/csrf')) return Promise.resolve(csrfRes());
    const item = domainQueue.shift();
    if (!item) return Promise.reject(new Error(`no queued domain response for ${String(url)}`));
    return item.kind === 'res' ? Promise.resolve(item.res) : Promise.reject(item.err);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockClear();
  _useRealCoreBE = false;
  setDomainIdentitySnapshot(null);
  resetBackendAssignmentSyncForTests();
  useAssignmentStore.setState({ dispatched: [], drafts: [], submissions: [], lastDispatched: null });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

function buildUserAssignment(overrides: Partial<UserAssignment> = {}): UserAssignment {
  return {
    id: 'as_user_123',
    botId: 'cb_001',
    title: '수열의 극한 집중 훈련',
    scope: '미적분 II · 수열의 극한',
    subject: '수학',
    grade: '고2',
    chapterFrom: '수열의 극한',
    chapterTo: '급수',
    achievementCodes: ['12수학02-01'],
    questionCount: 10,
    difficulty: '중',
    mode: 'practice',
    source: 'teacher-assigned',
    assignedBy: '수학이 형',
    assignedAt: '방금 발사',
    dueLabel: '내일 22:00',
    dDay: 'D-1',
    completedCount: 0,
    state: 'todo',
    solveHref: '/classbot/assignment/as_user_123/solve?step=1',
    dispatchStatus: 'sent',
    targetStudentIds: [],
    ...overrides,
  };
}

/** 정본 AssignmentSummaryResponseDto 재현 (bot==class → classId, dDay 정수). */
const BE_SUMMARY = {
  id: 'as_user_ab12cd34',
  classId: 'cb_001',
  title: '수열의 극한 집중 훈련',
  scope: '미적분 II · 수열의 극한',
  subject: '수학',
  grade: '고2',
  mode: 'practice',
  questionCount: 10,
  difficulty: '중',
  dueLabel: '내일 22:00',
  dDay: 1,
  dispatchStatus: 'sent',
  dispatchedAt: '2026-07-03T09:00:00.000Z',
  examTimeLimitMin: null,
  state: 'todo',
  chapterFrom: '수열의 극한',
  chapterTo: '급수',
  achievementCodes: ['12수학02-01'],
};

describe('flag OFF — 기존 동작 불변', () => {
  it('dispatch and recordSubmission never fetch', () => {
    act(() => {
      useAssignmentStore.getState().dispatch(buildUserAssignment());
      useAssignmentStore.getState().recordSubmission({
        assignmentId: 'as_user_123',
        studentId: 's1',
        answers: { q1: '2' },
        scorePercent: 80,
      });
    });
    expect(useAssignmentStore.getState().dispatched).toHaveLength(1);
    expect(useAssignmentStore.getState().submissions).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('useMergedAssignments does not fetch', () => {
    renderHook(() => useMergedAssignments('s1'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('flag ON — dispatch (POST /classbot/classes/:classId/assignments)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs to the class-scoped path with CSRF, questions[], raw targetStudentIds; re-keys to server row', async () => {
    qRes(201, BE_SUMMARY);
    const a = buildUserAssignment({ targetStudentIds: ['s1'] });

    act(() => {
      useAssignmentStore.getState().dispatch(a);
    });
    // 낙관적 선반영 — fetch 완료 전에도 로컬 항목 존재
    expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_123');

    await waitFor(() =>
      expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_ab12cd34'),
    );

    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/classes\/cb_001\/assignments$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    const body = JSON.parse(init.body as string);
    // classId 는 path 로 이동 — body 에 botId 없음
    expect(body.botId).toBeUndefined();
    // roster→seed 브리지 제거 — targetStudentIds 는 원본 그대로
    expect(body.targetStudentIds).toEqual(['s1']);
    // dDay 는 정수 계약("D-1" → 1)
    expect(body.dDay).toBe(1);
    // 문항은 answerKey 를 동봉(서버 전용 채점 소스)
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions.length).toBeGreaterThan(0);
    expect(typeof body.questions[0].answerKey).not.toBe('undefined');
  });

  it('keeps the optimistic entry and warns when the BE write fails', async () => {
    qReject(new TypeError('fetch failed'));

    act(() => {
      useAssignmentStore.getState().dispatch(buildUserAssignment());
    });

    await act(async () => {});
    expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_123');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('flag ON — submit (POST /classbot/assignments/:id/submit, { answers } 만)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs { answers } ONLY (no scorePercent) and consumes the server-authoritative score', async () => {
    qRes(201, {
      submissionId: 'sub_1',
      assignmentId: 'as_user_ab12cd34',
      studentId: 'u-uuid-1',
      scorePercent: 92, // 서버 권위 채점값
      gradedAt: '2026-07-04T00:00:00.000Z',
      submittedAt: '2026-07-04T00:00:00.000Z',
    });

    act(() => {
      useAssignmentStore.getState().recordSubmission({
        assignmentId: 'as_user_ab12cd34',
        studentId: 's1',
        answers: { q1: '2', q2: '극한' },
        scorePercent: 85, // 로컬 mock 점수 — 요청에 실리면 안 된다
      });
    });

    await waitFor(() => expect(domainCalls()).toHaveLength(1));
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/assignments\/as_user_ab12cd34\/submit$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
    // 🔒 body 는 answers 만 — scorePercent 미전송(위조 차단)
    expect(JSON.parse(init.body as string)).toEqual({ answers: { q1: '2', q2: '극한' } });
    // 서버 권위 점수(92)를 로컬 제출에 반영
    await waitFor(() => expect(useAssignmentStore.getState().submissions[0].scorePercent).toBe(92));
  });

  it('keeps the optimistic (local) score when the BE submit fails', async () => {
    qReject(new TypeError('fetch failed'));

    act(() => {
      useAssignmentStore.getState().recordSubmission({
        assignmentId: 'as_user_ab12cd34',
        studentId: 's1',
        answers: { q1: '2' },
        scorePercent: 77,
      });
    });

    await act(async () => {});
    expect(useAssignmentStore.getState().submissions[0].scorePercent).toBe(77);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('flag ON — 읽기 동기화 (GET /classbot/assignments?audience=student)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('merges the bare-array rows into the dispatched cache (dDay 라벨화, 로컬-only 유지)', async () => {
    useAssignmentStore.setState({
      dispatched: [buildUserAssignment({ id: 'as_user_local' })],
    });
    qRes(200, [BE_SUMMARY]);

    const { result } = renderHook(() => useMergedAssignments('s1'));

    await waitFor(() => expect(result.current).toHaveLength(2));
    const ids = result.current.map((a) => a.id);
    expect(ids).toContain('as_user_ab12cd34');
    expect(ids).toContain('as_user_local');
    const beRow = result.current.find((a) => a.id === 'as_user_ab12cd34');
    expect(beRow?.dDay).toBe('D-1'); // dDay 정수 1 → 라벨
    expect(beRow?.assignedAt).toBe('2026-07-03T09:00:00.000Z'); // dispatchedAt
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/assignments\?audience=student$/);
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
  });

  it('leaves the local cache untouched when the BE read fails (graceful)', async () => {
    useAssignmentStore.setState({ dispatched: [buildUserAssignment()] });
    qReject(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMergedAssignments('s1'));

    await act(async () => {});
    expect(result.current.map((a) => a.id)).toEqual(['as_user_123']);
    expect(console.warn).toHaveBeenCalled();
  });

  it('fetches once across multiple consumers (단일 비행)', async () => {
    qRes(200, []);

    renderHook(() => useMergedAssignments('s1'));
    renderHook(() => useMergedAssignments('s1'));

    await act(async () => {});
    expect(domainCalls()).toHaveLength(1);
  });
});
