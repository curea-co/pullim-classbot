/**
 * class-enrollment 정본 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * fetch 는 jest mock (실 BE 불요). 정본 계약: POST /classbot/enrollments {code}(CSRF),
 * GET /classbot/bots?role=student(bare array). 플래그 OFF 회귀 0 은 class-enrollment.test.ts +
 * 본 파일 OFF 케이스가 보증한다.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

// jest.mock factory 는 호이스팅되므로 가변 플래그는 getter 로 노출 (replay-detail 패턴).
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
  useClassEnrollmentStore,
  useMyClassBots,
  joinClass,
  resetBackendEnrollmentSyncForTests,
} from '../class-enrollment';

const fetchMock = jest.fn();

/** domainFetch 응답(text() 파싱). */
function domainRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** CSRF 발급 응답(json() 파싱). */
function csrfRes(): Response {
  return { ok: true, status: 200, json: async () => ({ csrfToken: 'csrf-t' }) } as unknown as Response;
}

// 도메인 응답 큐 — /auth/csrf 는 자동 라우팅, 나머지는 큐에서 순차 소비(reject 포함).
type QItem = { kind: 'res'; res: Response } | { kind: 'reject'; err: unknown };
let domainQueue: QItem[] = [];
function qRes(status: number, body: unknown): void {
  domainQueue.push({ kind: 'res', res: domainRes(status, body) });
}
function qReject(err: unknown): void {
  domainQueue.push({ kind: 'reject', err });
}
/** csrf 를 제외한 실제 도메인 호출만. */
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
  resetBackendEnrollmentSyncForTests();
  useClassEnrollmentStore.setState({ enrollments: [] });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

const ENROLLMENT_RESPONSE = {
  membershipId: 'm1',
  classId: 'cb_001',
  memberId: 'u-uuid-1',
  enrolledAt: '2026-07-03T00:00:00.000Z',
};

describe('joinClass — flag OFF', () => {
  it('delegates to the mock store join without any fetch', async () => {
    const res = await joinClass('MATH-2024');
    expect(res.ok).toBe(true);
    expect(useClassEnrollmentStore.getState().enrollments).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('joinClass — flag ON (POST /classbot/enrollments, OS 쿠키 + CSRF)', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs { code } with credentials + CSRF, reflects the membership into the store', async () => {
    qRes(201, ENROLLMENT_RESPONSE);

    const res = await joinClass('MATH-2024');

    expect(res.ok).toBe(true);
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/enrollments$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.body).toBe(JSON.stringify({ code: 'MATH-2024' }));
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-t');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    // classId(=botId) 로 카탈로그 브리지 — 스토어 반영
    const stored = useClassEnrollmentStore.getState().enrollments;
    expect(stored).toHaveLength(1);
    expect(stored[0].botId).toBe('cb_001');
    expect(stored[0].assignedAt).toBe('2026-07-03T00:00:00.000Z');
  });

  it('is idempotent in the store for the same classId (멱등 200 재참여)', async () => {
    qRes(200, ENROLLMENT_RESPONSE);
    qRes(200, ENROLLMENT_RESPONSE);
    await joinClass('MATH-2024');
    await joinClass('MATH-2024');
    expect(
      useClassEnrollmentStore.getState().enrollments.filter((e) => e.botId === 'cb_001'),
    ).toHaveLength(1);
  });

  it('returns the invalid-code copy on 404 without touching the store', async () => {
    qRes(404, { error: { code: 'NOT_FOUND', message: '유효하지 않은 참여 코드입니다.' } });

    const res = await joinClass('NOPE-9999');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(
        '참여할 수 없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.',
      );
    }
    expect(useClassEnrollmentStore.getState().enrollments).toHaveLength(0);
  });

  it('propagates a 401 rejection as a join failure — no mock fallback', async () => {
    qRes(401, { statusCode: 401, message: 'Unauthorized' });

    const res = await joinClass('MATH-2024');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('클래스 참여에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
    expect(useClassEnrollmentStore.getState().enrollments).toHaveLength(0); // mock join 미실행
  });

  it('gracefully degrades to the mock join on 5xx (BE 장애)', async () => {
    qRes(503, { error: { code: 'SERVICE_UNAVAILABLE', message: '점검 중' } });

    const res = await joinClass('MATH-2024');

    expect(res.ok).toBe(true);
    expect(useClassEnrollmentStore.getState().enrollments[0].botId).toBe('cb_001');
    expect(console.warn).toHaveBeenCalled();
  });

  it('gracefully degrades to the mock join when the BE is down (network error)', async () => {
    qReject(new TypeError('fetch failed'));

    const res = await joinClass('MATH-2024');

    expect(res.ok).toBe(true);
    expect(useClassEnrollmentStore.getState().enrollments[0].botId).toBe('cb_001');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('useMyClassBots — 읽기 동기화 (GET /classbot/bots?role=student)', () => {
  it('flag OFF: does not fetch, reads only the store', () => {
    const { result } = renderHook(() => useMyClassBots());
    expect(result.current).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flag ON: merges the bare-array bot rows into the store (BE 진실, 로컬-only 유지)', async () => {
    _useRealCoreBE = true;
    // 로컬-only enrollment(BE 미반영) — 병합 후에도 유지되어야 한다
    useClassEnrollmentStore.setState({
      enrollments: [
        {
          botId: 'cb_002',
          classroomId: 'cb_002',
          classroomLabel: '중3 영어 읽기반',
          assignedBy: '박서윤 선생님',
          assignedAt: '2026-06-24 09:00',
          via: '대치프리미엄 영어학원',
        },
      ],
    });
    qRes(200, [
      { id: 'cb_001', name: '수학봇', description: null, isActive: true, role: 'student' },
    ]);

    const { result } = renderHook(() => useMyClassBots());

    await waitFor(() => expect(result.current).toHaveLength(2));
    const botIds = result.current.map((x) => x.bot.id);
    expect(botIds).toContain('cb_001'); // BE 행
    expect(botIds).toContain('cb_002'); // 로컬-only 유지
    const [url, init] = domainCalls()[0];
    expect(url).toMatch(/\/classbot\/bots\?role=student$/);
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
  });

  it('flag ON: fetches once even when mounted in multiple components (단일 비행)', async () => {
    _useRealCoreBE = true;
    qRes(200, []);

    renderHook(() => useMyClassBots());
    renderHook(() => useMyClassBots());

    await act(async () => {});
    expect(domainCalls()).toHaveLength(1);
  });

  it('flag ON: resyncs when the session user changes (캐시 키 = 세션 사용자)', async () => {
    _useRealCoreBE = true;
    qRes(200, []);
    qRes(200, []);

    // 1) 미인증(anon) 으로 1회 동기화
    renderHook(() => useMyClassBots());
    await waitFor(() => expect(domainCalls()).toHaveLength(1));

    // 2) 로그인(세션 스냅샷 publish) → 캐시 키 변경 → 재동기화
    act(() => {
      setDomainIdentitySnapshot({ id: 'u-uuid-9', email: 'a@b.c', role: 'student' });
    });
    renderHook(() => useMyClassBots());
    await waitFor(() => expect(domainCalls()).toHaveLength(2));

    // 3) 같은 사용자 재마운트 — 캐시 재사용(추가 fetch 없음)
    renderHook(() => useMyClassBots());
    await act(async () => {});
    expect(domainCalls()).toHaveLength(2);
  });

  it('flag ON: keeps the local store untouched when the BE read fails (graceful)', async () => {
    _useRealCoreBE = true;
    act(() => {
      useClassEnrollmentStore.getState().join('ENG-2024');
    });
    qReject(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMyClassBots());

    await act(async () => {});
    expect(result.current).toHaveLength(1);
    expect(result.current[0].bot.id).toBe('cb_002');
  });
});
