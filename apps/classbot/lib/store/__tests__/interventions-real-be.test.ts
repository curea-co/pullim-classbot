/**
 * interventions Ph7 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * BE 계약(PR #195): POST bulk {events}, GET ?audience=student,
 * PATCH /:id/read, PATCH /read-all — 응답 필드 camelCase 1:1(InterventionEvent).
 * fetch 는 jest mock (BE 미머지 — 라이브 통합은 후속).
 */
import { renderHook, act, waitFor } from '@testing-library/react';

let _useRealCoreBE = false;
jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return _useRealCoreBE;
  },
}));

// useInterventionRecipientId 테스트용 — useCurrentUser 만 가변 오버라이드,
// resolveRosterMe 등 나머지는 실제 구현 유지(신원 브리지가 이를 쓴다).
let _currentUser = {
  id: 'student_001',
  role: 'student' as const,
  name: '서연',
  isAuthenticated: false,
};
jest.mock('@/lib/current-user', () => ({
  ...jest.requireActual('@/lib/current-user'),
  useCurrentUser: () => _currentUser,
}));

import { tokenManager } from '@pullim-classbot/api-client';
import {
  useInterventionStore,
  useMyInterventions,
  useUnreadCount,
  useAssignmentComment,
  useInterventionRecipientId,
  resetBackendInterventionSyncForTests,
} from '../interventions';

const fetchMock = jest.fn();

/** 디코더블 access token (검증 없음 — decodeAccessToken 은 sub/role 만 요구). */
function fakeJwt(sub: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub, email: `${sub}@test.io`, role: 'student', exp: 9999999999 }),
  ).toString('base64url');
  return `header.${payload}.sig`;
}

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  _useRealCoreBE = false;
  _currentUser = { id: 'student_001', role: 'student', name: '서연', isAuthenticated: false };
  tokenManager.clearTokens();
  resetBackendInterventionSyncForTests();
  useInterventionStore.setState({ events: [] });
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

const INPUT = {
  type: 'remind' as const,
  botId: 'cb_001',
  studentId: 's1',
  assignmentId: 'as_user_ab12cd34',
  message: "'수열의 극한' 과제가 아직 제출 전이에요",
};

const BE_ROW = {
  id: 'iv_9f8e7d6c',
  type: 'remind' as const,
  botId: 'cb_001',
  studentId: 'student_001',
  assignmentId: 'as_user_ab12cd34',
  message: "'수열의 극한' 과제가 아직 제출 전이에요",
  createdAt: '2026-07-03T09:00:00.000Z',
  readAt: null,
  createdBy: 'teacher_001',
};

describe('flag OFF — 기존 동작 불변', () => {
  it('send/markRead/markAllRead never fetch', () => {
    act(() => {
      useInterventionStore.getState().send(INPUT);
    });
    const id = useInterventionStore.getState().events[0].id;
    act(() => {
      useInterventionStore.getState().markRead(id);
      useInterventionStore.getState().markAllRead('s1');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('useMyInterventions/useUnreadCount never fetch', () => {
    renderHook(() => useMyInterventions('s1'));
    renderHook(() => useUnreadCount('s1'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('flag ON — send 쓰기', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('optimistically stores, POSTs bulk {events} as teacher_001, and re-keys to the server row', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { interventions: [BE_ROW] }));

    act(() => {
      useInterventionStore.getState().send(INPUT);
    });
    // 낙관적 선반영
    expect(useInterventionStore.getState().events).toHaveLength(1);

    await waitFor(() =>
      expect(useInterventionStore.getState().events[0].id).toBe('iv_9f8e7d6c'),
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/interventions$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('teacher_001');
    expect(JSON.parse(init.body as string)).toEqual({
      events: [
        {
          type: 'remind',
          botId: 'cb_001',
          studentId: 'student_001', // s1 → 도메인 id 변환
          assignmentId: 'as_user_ab12cd34',
          message: "'수열의 극한' 과제가 아직 제출 전이에요",
        },
      ],
    });
    // 재키잉된 이벤트 — studentId 는 roster 키로 역변환 (수신자 조인 정합)
    const e = useInterventionStore.getState().events[0];
    expect(e.studentId).toBe('s1');
    expect(e.createdAt).toBe('2026-07-03T09:00:00.000Z');
  });

  it('keeps the optimistic event and warns when the BE write fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    act(() => {
      useInterventionStore.getState().send(INPUT);
    });

    await act(async () => {});
    expect(useInterventionStore.getState().events).toHaveLength(1);
    expect(useInterventionStore.getState().events[0].studentId).toBe('s1');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('flag ON — markRead / markAllRead 쓰기', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('markRead PATCHes /interventions/:id/read as the seed-mapped student', async () => {
    useInterventionStore.setState({
      events: [{ ...BE_ROW, studentId: 's1', assignmentId: 'as_user_ab12cd34' }],
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...BE_ROW, readAt: '2026-07-03T10:00:00.000Z' }));

    act(() => {
      useInterventionStore.getState().markRead('iv_9f8e7d6c');
    });

    // 낙관적 읽음 처리 유지
    expect(useInterventionStore.getState().events[0].readAt).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/interventions\/iv_9f8e7d6c\/read$/);
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
  });

  it('markAllRead PATCHes /interventions/read-all', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { updated: 0 }));

    act(() => {
      useInterventionStore.getState().markAllRead('s1');
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/interventions\/read-all$/);
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
  });
});

describe('flag ON — 읽기 동기화 (useMyInterventions/useUnreadCount)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('merges the BE inbox into the store (studentId 역변환) and derives the unread badge', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { interventions: [BE_ROW] }));

    const { result } = renderHook(() => useMyInterventions('s1'));
    const { result: unread } = renderHook(() => useUnreadCount('s1'));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe('iv_9f8e7d6c');
    expect(result.current[0].studentId).toBe('s1'); // student_001 → s1 역변환
    expect(unread.current).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/interventions\?audience=student$/);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
    // 단일 비행 — 두 훅이 마운트돼도 1회 fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps local events with the same id (낙관 readAt 보존) and appends BE-only rows', async () => {
    const localRead = {
      id: 'iv_9f8e7d6c',
      type: 'remind' as const,
      botId: 'cb_001',
      studentId: 's1',
      assignmentId: 'as_user_ab12cd34',
      message: BE_ROW.message,
      createdAt: '2026-07-03T09:00:00.000Z',
      readAt: '2026-07-03T09:30:00.000Z', // 로컬에서 이미 읽음 (BE 미반영)
    };
    useInterventionStore.setState({ events: [localRead] });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        interventions: [
          BE_ROW, // 같은 id — 로컬(readAt 있음) 유지
          { ...BE_ROW, id: 'iv_new', type: 'crisis', assignmentId: null, message: '힘내!', createdAt: '2026-07-03T11:00:00.000Z' },
        ],
      }),
    );

    const { result } = renderHook(() => useMyInterventions('s1'));

    await waitFor(() => expect(result.current).toHaveLength(2));
    const byId = Object.fromEntries(result.current.map((e) => [e.id, e]));
    expect(byId['iv_9f8e7d6c'].readAt).toBe('2026-07-03T09:30:00.000Z');
    expect(byId['iv_new'].type).toBe('crisis');
    expect(byId['iv_new'].assignmentId).toBeUndefined(); // null → 부재
    // 최신순 — createdAt 정렬 후 reverse
    expect(result.current[0].id).toBe('iv_new');
  });

  it('syncs the inbox on useAssignmentComment too (결과 페이지 직링크 진입)', async () => {
    // 직링크 진입 — 벨(useMyInterventions) 미마운트 상태에서 코멘트 훅만 마운트
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        interventions: [
          { ...BE_ROW, id: 'iv_cmt', type: 'comment', message: '이 부분 다시 보자!' },
        ],
      }),
    );

    const { result } = renderHook(() => useAssignmentComment('as_user_ab12cd34', 's1'));

    expect(result.current).toBeNull(); // 동기화 전 — 로컬 비어 있음
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.id).toBe('iv_cmt');
    expect(result.current?.message).toBe('이 부분 다시 보자!');
    expect(result.current?.studentId).toBe('s1'); // student_001 → s1 역변환
  });

  it('leaves the local store untouched when the BE read fails (graceful)', async () => {
    act(() => {
      useInterventionStore.getState().send(INPUT);
    });
    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMyInterventions('s1'));

    await act(async () => {});
    expect(result.current).toHaveLength(1);
  });
});

describe('수신자/필터 키 규칙 (Codex #196 R2 ②)', () => {
  it('useInterventionRecipientId: flag ON + 인증 → raw user id, 미인증/flag OFF → roster 브리지', () => {
    // flag OFF + 인증 — 기존 mock 규약(브리지) 그대로 (회귀 0)
    _currentUser = { id: 'u-uuid-1', role: 'student', name: 'u', isAuthenticated: true };
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('s1');

    _useRealCoreBE = true;
    // flag ON + 인증 — raw user id 유지 (BE 가 JWT 신원 행을 반환)
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('u-uuid-1');
    // flag ON + 미인증 데모 — 브리지(student_001 → s1)
    _currentUser = { id: 'student_001', role: 'student', name: '서연', isAuthenticated: false };
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('s1');
  });

  it('인증 uuid 사용자의 인박스는 raw id 로 유지되고 s1 행과 섞이지 않는다', async () => {
    _useRealCoreBE = true;
    tokenManager.setTokens(fakeJwt('u-uuid-1'), 'r'); // 앱 인증 세션
    // 로컬에 데모(s1) 키 행이 남아 있어도 인증 사용자 인박스에 흘러들지 않아야 한다
    useInterventionStore.setState({
      events: [
        {
          id: 'iv_local_s1',
          type: 'remind',
          botId: 'cb_001',
          studentId: 's1',
          assignmentId: 'as_1',
          message: '데모 행',
          createdAt: '2026-07-03T08:00:00.000Z',
          readAt: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        interventions: [{ ...BE_ROW, id: 'iv_auth', studentId: 'u-uuid-1' }],
      }),
    );

    const { result } = renderHook(() => useMyInterventions('u-uuid-1'));

    await waitFor(() => expect(result.current).toHaveLength(1));
    // 인증 행은 raw id 유지 — roster 키(s1)로 붕괴되지 않는다
    expect(result.current[0].id).toBe('iv_auth');
    expect(result.current[0].studentId).toBe('u-uuid-1');
    // Bearer 경로 — x-user-id 미전송
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${fakeJwt('u-uuid-1')}`,
    );
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    // s1 행은 s1 인박스에만 남는다
    const { result: demoInbox } = renderHook(() => useMyInterventions('s1'));
    expect(demoInbox.current.map((e) => e.id)).toEqual(['iv_local_s1']);
  });
});
