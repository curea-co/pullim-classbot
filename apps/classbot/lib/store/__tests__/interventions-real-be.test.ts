/**
 * interventions 정본 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * 정본 계약: POST /classbot/classes/:classId/interventions {events}(CSRF),
 * GET /classbot/interventions?audience=student(bare array), PATCH /:id/read · /read-all.
 * fetch 는 jest mock (실 BE 불요).
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

import { setDomainIdentitySnapshot } from '@/lib/api/domain-fetch';
import {
  useInterventionStore,
  useMyInterventions,
  useUnreadCount,
  useAssignmentComment,
  useInterventionRecipientId,
  resetBackendInterventionSyncForTests,
} from '../interventions';

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
  _currentUser = { id: 'student_001', role: 'student', name: '서연', isAuthenticated: false };
  setDomainIdentitySnapshot(null);
  resetBackendInterventionSyncForTests();
  useInterventionStore.setState({ events: [] });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

const INPUT = {
  type: 'remind' as const,
  botId: 'cb_001',
  studentId: 's1',
  assignmentId: 'as_user_ab12cd34',
  message: "'수열의 극한' 과제가 아직 제출 전이에요",
};

/** 정본 InterventionResponseDto (raw studentId — roster 브리지 없음). */
const BE_ROW = {
  id: 'iv_9f8e7d6c',
  type: 'remind' as const,
  botId: 'cb_001',
  studentId: 's1',
  assignmentId: 'as_user_ab12cd34',
  message: "'수열의 극한' 과제가 아직 제출 전이에요",
  createdAt: '2026-07-03T09:00:00.000Z',
  readAt: null,
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

describe('flag ON — send (POST /classbot/classes/:classId/interventions)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs bulk {events} to the class-scoped path with CSRF; re-keys to the server row', async () => {
    qRes(201, [BE_ROW]);

    act(() => {
      useInterventionStore.getState().send(INPUT);
    });
    expect(useInterventionStore.getState().events).toHaveLength(1); // 낙관적 선반영

    await waitFor(() => expect(useInterventionStore.getState().events[0].id).toBe('iv_9f8e7d6c'));

    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/classes\/cb_001\/interventions$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    // classId 는 path 로 이동 — event 에 botId 없음. studentId 는 원본 그대로(브리지 없음).
    expect(JSON.parse(init.body as string)).toEqual({
      events: [
        {
          type: 'remind',
          studentId: 's1',
          assignmentId: 'as_user_ab12cd34',
          message: "'수열의 극한' 과제가 아직 제출 전이에요",
        },
      ],
    });
    const e = useInterventionStore.getState().events[0];
    expect(e.studentId).toBe('s1');
    expect(e.createdAt).toBe('2026-07-03T09:00:00.000Z');
  });

  it('keeps the optimistic event and warns when the BE write fails', async () => {
    qReject(new TypeError('fetch failed'));

    act(() => {
      useInterventionStore.getState().send(INPUT);
    });

    await act(async () => {});
    expect(useInterventionStore.getState().events).toHaveLength(1);
    expect(useInterventionStore.getState().events[0].studentId).toBe('s1');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('flag ON — markRead / markAllRead (PATCH)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('markRead PATCHes /classbot/interventions/:id/read with CSRF', async () => {
    useInterventionStore.setState({ events: [{ ...BE_ROW }] });
    qRes(200, { ...BE_ROW, readAt: '2026-07-03T10:00:00.000Z' });

    act(() => {
      useInterventionStore.getState().markRead('iv_9f8e7d6c');
    });

    expect(useInterventionStore.getState().events[0].readAt).toBeTruthy(); // 낙관적 읽음
    await waitFor(() => expect(domainCalls()).toHaveLength(1));
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/interventions\/iv_9f8e7d6c\/read$/);
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
  });

  it('markAllRead PATCHes /classbot/interventions/read-all with CSRF', async () => {
    qRes(200, { updated: 0 });

    act(() => {
      useInterventionStore.getState().markAllRead('s1');
    });

    await waitFor(() => expect(domainCalls()).toHaveLength(1));
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/interventions\/read-all$/);
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
  });
});

describe('flag ON — 읽기 동기화 (GET /classbot/interventions?audience=student)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('merges the bare-array inbox into the store and derives the unread badge', async () => {
    qRes(200, [BE_ROW]);

    const { result } = renderHook(() => useMyInterventions('s1'));
    const { result: unread } = renderHook(() => useUnreadCount('s1'));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe('iv_9f8e7d6c');
    expect(result.current[0].studentId).toBe('s1');
    expect(unread.current).toBe(1);
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/interventions\?audience=student$/);
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    expect(domainCalls()).toHaveLength(1); // 단일 비행
  });

  it('keeps local events with the same id (낙관 readAt 보존) and appends BE-only rows', async () => {
    const localRead = { ...BE_ROW, readAt: '2026-07-03T09:30:00.000Z' };
    useInterventionStore.setState({ events: [localRead] });
    qRes(200, [
      BE_ROW, // 같은 id — 로컬(readAt 있음) 유지
      {
        ...BE_ROW,
        id: 'iv_new',
        type: 'crisis',
        assignmentId: null,
        message: '힘내!',
        createdAt: '2026-07-03T11:00:00.000Z',
      },
    ]);

    const { result } = renderHook(() => useMyInterventions('s1'));

    await waitFor(() => expect(result.current).toHaveLength(2));
    const byId = Object.fromEntries(result.current.map((e) => [e.id, e]));
    expect(byId['iv_9f8e7d6c'].readAt).toBe('2026-07-03T09:30:00.000Z');
    expect(byId['iv_new'].type).toBe('crisis');
    expect(byId['iv_new'].assignmentId).toBeUndefined(); // null → 부재
    expect(result.current[0].id).toBe('iv_new'); // 최신순
  });

  it('syncs the inbox on useAssignmentComment too (결과 페이지 직링크 진입)', async () => {
    qRes(200, [{ ...BE_ROW, id: 'iv_cmt', type: 'comment', message: '이 부분 다시 보자!' }]);

    const { result } = renderHook(() => useAssignmentComment('as_user_ab12cd34', 's1'));

    expect(result.current).toBeNull(); // 동기화 전
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.id).toBe('iv_cmt');
    expect(result.current?.studentId).toBe('s1');
  });

  it('leaves the local store untouched when the BE read fails (graceful)', async () => {
    act(() => {
      useInterventionStore.getState().send(INPUT);
    });
    domainQueue = [];
    qReject(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMyInterventions('s1'));

    await act(async () => {});
    expect(result.current).toHaveLength(1);
  });
});

describe('수신자/필터 키 규칙 (로컬 필터 신원)', () => {
  it('useInterventionRecipientId: flag ON + 인증 → raw id, 미인증/flag OFF → roster 브리지', () => {
    // flag OFF + 인증 — 기존 mock 규약(브리지) 그대로 (회귀 0)
    _currentUser = { id: 'u-uuid-1', role: 'student', name: 'u', isAuthenticated: true };
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('s1');

    _useRealCoreBE = true;
    // flag ON + 인증 — raw user id 유지 (BE 가 세션 신원 행을 반환)
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('u-uuid-1');
    // flag ON + 미인증 데모 — 브리지(student_001 → s1)
    _currentUser = { id: 'student_001', role: 'student', name: '서연', isAuthenticated: false };
    expect(renderHook(() => useInterventionRecipientId()).result.current).toBe('s1');
  });

  it('인증 사용자의 인박스는 raw id 로 유지되고 s1 행과 섞이지 않는다 (브리지 없음)', async () => {
    _useRealCoreBE = true;
    setDomainIdentitySnapshot({ id: 'u-uuid-1', email: 'a@b.c', role: 'student' });
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
    qRes(200, [{ ...BE_ROW, id: 'iv_auth', studentId: 'u-uuid-1' }]);

    const { result } = renderHook(() => useMyInterventions('u-uuid-1'));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe('iv_auth');
    expect(result.current[0].studentId).toBe('u-uuid-1'); // raw id 유지
    const [, init] = domainCalls()[0];
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    // s1 행은 s1 인박스에만 남는다
    const { result: demoInbox } = renderHook(() => useMyInterventions('s1'));
    expect(demoInbox.current.map((e) => e.id)).toEqual(['iv_local_s1']);
  });
});
