import { act, renderHook } from '@testing-library/react';

import {
  useAddSelfBot,
  useIsSelfAdded,
  useMySelfBots,
  useRecordSelfStudyDay,
  useRemoveSelfBot,
  useSelfStreak,
  useSelfStudyDays,
} from '../self-bots';
import { useSelfLearningStore } from '@/lib/store/self-learning';

const SEOYEON = 'student_001';
const MINJUN = 'student_002';
const BOT_A = 'cb_001';
const BOT_B = 'cb_002';

// 개발용 신원 전환(계정 스위처)을 흉내 낸다 — 이 훅들이 보는 "나"가 바뀌는 유일한 입구.
let currentUserId = SEOYEON;
jest.mock('@/lib/current-user', () => ({
  useCurrentUserId: () => currentUserId,
}));

beforeEach(() => {
  currentUserId = SEOYEON;
  useSelfLearningStore.setState({ byUser: {}, goals: [], unitProgress: [] });
});

describe('useMySelfBots', () => {
  it('하이드레이션이 끝나면 목록을 준다 (isError 자리는 비어 있지 않다)', () => {
    const { result } = renderHook(() => useMySelfBots());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it('담은 순서대로 쌓인다', () => {
    const { result } = renderHook(() => ({
      list: useMySelfBots(),
      add: useAddSelfBot(),
    }));
    act(() => {
      result.current.add.mutate(BOT_A);
      result.current.add.mutate(BOT_B);
    });
    expect(result.current.list.data?.map((b) => b.botId)).toEqual([BOT_A, BOT_B]);
    expect(result.current.add.isPending).toBe(false);
  });
});

describe('담기 / 빼기', () => {
  it('담으면 useIsSelfAdded 가 켜지고, 빼면 꺼진다', () => {
    const { result } = renderHook(() => ({
      added: useIsSelfAdded(BOT_A),
      add: useAddSelfBot(),
      remove: useRemoveSelfBot(),
    }));
    expect(result.current.added).toBe(false);

    act(() => result.current.add.mutate(BOT_A));
    expect(result.current.added).toBe(true);

    act(() => result.current.remove.mutate(BOT_A));
    expect(result.current.added).toBe(false);
  });

  it('botId 가 없으면 언제나 false', () => {
    const { result } = renderHook(() => useIsSelfAdded(null));
    expect(result.current).toBe(false);
  });

  it('⛔ 담기는 반 참여가 아니다 — enrollments 스토어를 건드리지 않는다', () => {
    const { result } = renderHook(() => useAddSelfBot());
    act(() => result.current.mutate(BOT_A));
    // 이 스토어가 쓰는 곳은 byUser 하나다. enrollments 라는 칸 자체가 없다.
    expect(Object.keys(useSelfLearningStore.getState())).not.toContain('enrollments');
  });
});

describe('사용자별 분리 — 계정을 오가도 기록이 섞이지 않는다', () => {
  it('서연이 담은 봇이 민준에게 보이지 않는다', () => {
    const { result, rerender } = renderHook(() => ({
      list: useMySelfBots(),
      added: useIsSelfAdded(BOT_A),
      add: useAddSelfBot(),
    }));

    act(() => result.current.add.mutate(BOT_A));
    expect(result.current.list.data?.map((b) => b.botId)).toEqual([BOT_A]);

    currentUserId = MINJUN;
    rerender();
    expect(result.current.list.data).toEqual([]);
    expect(result.current.added).toBe(false);

    // 민준이 담은 봇도 서연 쪽으로 새지 않는다.
    act(() => result.current.add.mutate(BOT_B));
    expect(result.current.list.data?.map((b) => b.botId)).toEqual([BOT_B]);

    currentUserId = SEOYEON;
    rerender();
    expect(result.current.list.data?.map((b) => b.botId)).toEqual([BOT_A]);
  });

  it('공부한 날·연속일수도 사용자별로 갈린다', () => {
    const { result, rerender } = renderHook(() => ({
      days: useSelfStudyDays(),
      streak: useSelfStreak(),
      record: useRecordSelfStudyDay(),
    }));

    act(() => {
      result.current.record.mutate('2026-09-01');
      result.current.record.mutate('2026-09-02');
    });
    expect(result.current.days.data).toEqual(['2026-09-01', '2026-09-02']);
    expect(result.current.streak).toEqual({ count: 2, lastStudyDate: '2026-09-02' });

    currentUserId = MINJUN;
    rerender();
    expect(result.current.days.data).toEqual([]);
    expect(result.current.streak).toEqual({ count: 0, lastStudyDate: null });
  });
});

describe('공부한 날 기록', () => {
  it('같은 날 두 번 눌러도 한 칸이다', () => {
    const { result } = renderHook(() => ({
      days: useSelfStudyDays(),
      record: useRecordSelfStudyDay(),
    }));
    act(() => {
      result.current.record.mutate('2026-09-02');
      result.current.record.mutate('2026-09-02');
    });
    expect(result.current.days.data).toEqual(['2026-09-02']);
  });

  it('날짜를 안 주면 오늘로 기록한다', () => {
    const { result } = renderHook(() => ({
      days: useSelfStudyDays(),
      record: useRecordSelfStudyDay(),
    }));
    act(() => result.current.record.mutate());
    expect(result.current.days.data).toHaveLength(1);
    expect(result.current.days.data[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('빈 날을 사이에 두면 연속이 끊긴다', () => {
    const { result } = renderHook(() => ({
      streak: useSelfStreak(),
      record: useRecordSelfStudyDay(),
    }));
    act(() => {
      result.current.record.mutate('2026-09-01');
      result.current.record.mutate('2026-09-02');
      result.current.record.mutate('2026-09-05');
    });
    expect(result.current.streak).toEqual({ count: 1, lastStudyDate: '2026-09-05' });
  });
});
