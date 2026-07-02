/**
 * assignments Ph7 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * fetch 는 jest mock (실 BE 불요).
 */
import { renderHook, act, waitFor } from '@testing-library/react';

let _useRealCoreBE = false;
jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return _useRealCoreBE;
  },
}));

import {
  useAssignmentStore,
  useMergedAssignments,
  resetBackendAssignmentSyncForTests,
  type UserAssignment,
} from '../assignments';

const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  _useRealCoreBE = false;
  resetBackendAssignmentSyncForTests();
  useAssignmentStore.setState({ dispatched: [], drafts: [], submissions: [], lastDispatched: null });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** 발사 폼이 만드는 UserAssignment 최소 재현. */
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

/** BE AssignmentResponseDto 재현 (서버 생성 id). */
const BE_ROW = {
  id: 'as_user_ab12cd34',
  botId: 'cb_001',
  studentId: null,
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
  scopeOverride: null,
  source: 'teacher-assigned',
  assignedBy: '수학이 형',
  assignedAtLabel: '방금 발사',
  dueLabel: '내일 22:00',
  dDay: 'D-1',
  completedCount: 0,
  recentAccuracy: null,
  state: 'todo',
  reasonHint: null,
  solveHref: '/classbot/assignment/as_user_ab12cd34/solve?step=1',
  targetStudentIds: ['student_001'],
  dispatchedAt: '2026-07-03T09:00:00.000Z',
  examTimeLimitMin: null,
  requizQuestionIds: null,
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

describe('flag ON — dispatch 쓰기', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('optimistically stores, POSTs /assignments as teacher_001, and re-keys to the server row', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, BE_ROW));
    const a = buildUserAssignment({ targetStudentIds: ['s1'] });

    act(() => {
      useAssignmentStore.getState().dispatch(a);
    });
    // 낙관적 선반영 — fetch 완료 전에도 로컬 항목 존재
    expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_123');

    await waitFor(() =>
      expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_ab12cd34'),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('teacher_001');
    const body = JSON.parse(init.body as string);
    // dueLabel/dDay 직접 전달 경로 + roster→도메인 id 변환(s1→student_001)
    expect(body.dueLabel).toBe('내일 22:00');
    expect(body.dDay).toBe('D-1');
    expect(body.targetStudentIds).toEqual(['student_001']);
    expect(body.botId).toBe('cb_001');
    // 재키잉된 행 — targetStudentIds 는 roster 키로 역변환
    expect(useAssignmentStore.getState().dispatched[0].targetStudentIds).toEqual(['s1']);
  });

  it('keeps the optimistic entry and warns when the BE write fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    act(() => {
      useAssignmentStore.getState().dispatch(buildUserAssignment());
    });

    await act(async () => {});
    expect(useAssignmentStore.getState().dispatched[0].id).toBe('as_user_123');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('flag ON — recordSubmission 쓰기', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs answers/scorePercent to /assignments/:id/submissions as the seed-mapped student', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 'sub_1' }));

    act(() => {
      useAssignmentStore.getState().recordSubmission({
        assignmentId: 'as_user_ab12cd34',
        studentId: 's1',
        answers: { q1: '2', q2: '극한' },
        scorePercent: 85,
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments\/as_user_ab12cd34\/submissions$/);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
    expect(JSON.parse(init.body as string)).toEqual({
      answers: { q1: '2', q2: '극한' },
      scorePercent: 85,
    });
    // 로컬 upsert 는 그대로 (교사 진행률 파생 유지)
    expect(useAssignmentStore.getState().submissions).toHaveLength(1);
  });
});

describe('flag ON — 읽기 동기화 (useMergedAssignments)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('merges BE rows into the dispatched cache (roster 키 역변환, 로컬-only 유지)', async () => {
    // BE 미반영 로컬 행 — 병합 후에도 유지
    useAssignmentStore.setState({
      dispatched: [buildUserAssignment({ id: 'as_user_local' })],
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { assignments: [BE_ROW] }));

    const { result } = renderHook(() => useMergedAssignments('s1'));

    await waitFor(() => expect(result.current).toHaveLength(2));
    const ids = result.current.map((a) => a.id);
    expect(ids).toContain('as_user_ab12cd34');
    expect(ids).toContain('as_user_local');
    // BE 행의 대상 필터 정합 — student_001 → s1 역변환으로 studentId='s1' 필터 통과
    const beRow = result.current.find((a) => a.id === 'as_user_ab12cd34');
    expect(beRow?.assignedAt).toBe('방금 발사'); // assignedAtLabel 매핑
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/assignments\?audience=student$/);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
  });

  it('leaves the local cache untouched when the BE read fails (graceful)', async () => {
    useAssignmentStore.setState({ dispatched: [buildUserAssignment()] });
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMergedAssignments('s1'));

    await act(async () => {});
    expect(result.current.map((a) => a.id)).toEqual(['as_user_123']);
    expect(console.warn).toHaveBeenCalled();
  });

  it('fetches once across multiple consumers (단일 비행)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { assignments: [] }));

    renderHook(() => useMergedAssignments('s1'));
    renderHook(() => useMergedAssignments('s1'));

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
