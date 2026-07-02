/**
 * class-enrollment Ph7 배선 — USE_REAL_CORE_BE 플래그 스위치 단위 테스트.
 * fetch 는 jest mock (실 BE 불요). 플래그 OFF 회귀 0 은 기존
 * class-enrollment.test.ts + 본 파일의 OFF 케이스가 보증한다.
 */
import { renderHook, act, waitFor } from '@testing-library/react';

// jest.mock factory 는 호이스팅되므로 가변 플래그는 getter 로 노출 (replay-detail 패턴).
let _useRealCoreBE = false;
jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return _useRealCoreBE;
  },
}));

import {
  useClassEnrollmentStore,
  useMyClassBots,
  joinClass,
  resetBackendEnrollmentSyncForTests,
} from '../class-enrollment';

const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  _useRealCoreBE = false;
  resetBackendEnrollmentSyncForTests();
  useClassEnrollmentStore.setState({ enrollments: [] });
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

const BE_ENROLLMENT = {
  botId: 'cb_001',
  classroomId: 'cr_math_a',
  classroomLabel: '고2 미적분 A반',
  assignedBy: '김수학 선생님',
  assignedAt: '2026-07-03T00:00:00.000Z',
  via: '대치프리미엄 수학학원',
};

describe('joinClass — flag OFF', () => {
  it('delegates to the mock store join without any fetch', async () => {
    const res = await joinClass('MATH-2024');
    expect(res.ok).toBe(true);
    expect(useClassEnrollmentStore.getState().enrollments).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('joinClass — flag ON', () => {
  beforeEach(() => {
    _useRealCoreBE = true;
  });

  it('POSTs /enrollments with x-user-id and reflects the response into the store', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, BE_ENROLLMENT));

    const res = await joinClass('MATH-2024');

    expect(res).toEqual({ ok: true, enrollment: BE_ENROLLMENT });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/enrollments$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ code: 'MATH-2024' }));
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
    // 스토어 캐시에도 반영 — 기존 파생 로직(useMyClassBots) 유지
    expect(useClassEnrollmentStore.getState().enrollments).toEqual([BE_ENROLLMENT]);
  });

  it('is idempotent in the store for the same botId (멱등 200 재참여)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, BE_ENROLLMENT));
    await joinClass('MATH-2024');
    await joinClass('MATH-2024');
    expect(
      useClassEnrollmentStore.getState().enrollments.filter((e) => e.botId === 'cb_001'),
    ).toHaveLength(1);
  });

  it('returns the existing error copy on 404 (무효 코드) without touching the store', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: '유효하지 않은 참여 코드입니다.' } }),
    );

    const res = await joinClass('NOPE-9999');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(
        '참여할 수 없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.',
      );
    }
    expect(useClassEnrollmentStore.getState().enrollments).toHaveLength(0);
  });

  it('gracefully degrades to the mock join when the BE is down (network error)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const res = await joinClass('MATH-2024');

    // mock resolveClassCode 경로로 폴백 — UX 불변
    expect(res.ok).toBe(true);
    expect(useClassEnrollmentStore.getState().enrollments[0].botId).toBe('cb_001');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('useMyClassBots — 읽기 동기화', () => {
  it('flag OFF: does not fetch, reads only the store', () => {
    const { result } = renderHook(() => useMyClassBots());
    expect(result.current).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flag ON: merges GET /bots?role=student rows into the store (BE 진실, 로컬-only 유지)', async () => {
    _useRealCoreBE = true;
    // 로컬-only enrollment(BE 미반영 쓰기) — 병합 후에도 유지되어야 한다
    useClassEnrollmentStore.setState({
      enrollments: [
        {
          botId: 'cb_002',
          classroomId: 'cr_eng_a',
          classroomLabel: '수능 영어 독해반',
          assignedBy: '박영어 선생님',
          assignedAt: '2026-06-24 09:00',
          via: '대치프리미엄 영어학원',
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        bots: [
          {
            id: 'cb_001',
            name: '수학이 형',
            classroomId: 'cr_math_a',
            classroomLabel: '고2 미적분 A반',
            assignedBy: '김수학 선생님',
            via: '대치프리미엄 수학학원',
          },
        ],
      }),
    );

    const { result } = renderHook(() => useMyClassBots());

    await waitFor(() => expect(result.current).toHaveLength(2));
    const botIds = result.current.map((x) => x.bot.id);
    expect(botIds).toContain('cb_001'); // BE 행
    expect(botIds).toContain('cb_002'); // 로컬-only 유지
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/bots\?role=student$/);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
  });

  it('flag ON: fetches once even when mounted in multiple components (단일 비행)', async () => {
    _useRealCoreBE = true;
    fetchMock.mockResolvedValue(jsonResponse(200, { bots: [] }));

    renderHook(() => useMyClassBots());
    renderHook(() => useMyClassBots());

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flag ON: keeps the local store untouched when the BE read fails (graceful)', async () => {
    _useRealCoreBE = true;
    act(() => {
      useClassEnrollmentStore.getState().join('ENG-2024');
    });
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    const { result } = renderHook(() => useMyClassBots());

    await act(async () => {});
    expect(result.current).toHaveLength(1);
    expect(result.current[0].bot.id).toBe('cb_002');
  });
});
