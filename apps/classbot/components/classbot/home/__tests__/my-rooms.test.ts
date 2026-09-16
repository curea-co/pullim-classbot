/**
 * `useMyRooms()` — 소스는 pullim-api 정본 하나다(계획 PR 4).
 *
 * 종전에는 서버가 401 을 주면 localStorage 의 데모 방으로 갈아탔다. 그 폴백은 걷혔다 — 비로그인은
 * 이 화면에 오지 않고(RoleGuard), 401 은 로그인으로 간다. 그래서 여기서 보는 것은 셋이다:
 * 서버 카드 → 화면 슬롯 매핑(서버 값이 이기고 카탈로그가 빈 칸을 채운다), 못 읽었을 때(5xx)의
 * 「모른다」, 그리고 401 이 고장으로 그려지지 않는 것.
 */
import { renderHook } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';

import { toSlot, useMyRooms } from '../my-rooms';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { classBots } from '@/lib/mock/classbot';

let query: { data?: BotCardDto[]; isPending: boolean; error?: unknown };
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useMyClassrooms: () => ({ ...query, refetch }),
}));

/** 서버 카드 한 장 — 시드 봇 id 면 카탈로그와 겹친다. */
function card(id: string, name: string, profile: BotCardDto['profile'] = null): BotCardDto {
  return { id, name, description: null, isActive: true, role: 'student', profile };
}

beforeEach(() => {
  query = { data: [], isPending: false };
  refetch.mockReset();
});

describe('toSlot — 서버 카드 → 화면 슬롯', () => {
  it('서버가 준 칸(반 이름·profile)이 카탈로그를 이긴다 — 그 반의 사실이라서', () => {
    const seeded = classBots[0];
    const slot = toSlot(
      card(seeded.id, '고2 미적분 A반', {
        subject: '수학Ⅱ',
        grade: '고2',
        tone: '차분',
        greeting: '안녕',
        scope: 4,
        avatarEmoji: '📐',
        quickPrompts: ['오늘 배운 것'],
        enrolledCount: 12,
        isLive: true,
        currentLesson: null,
      }),
    );

    expect(slot.source).toBe('api');
    expect(slot.bot.id).toBe(seeded.id);
    expect(slot.bot.name).toBe('고2 미적분 A반');
    expect(slot.bot.subject).toBe('수학Ⅱ');
    expect(slot.bot.grade).toBe('고2');
    expect(slot.bot.tone).toBe('차분');
    expect(slot.bot.avatarEmoji).toBe('📐');
    expect(slot.bot.scope).toBe(4);
    expect(slot.bot.isLive).toBe(true);
    expect(slot.bot.enrolledCount).toBe(12);
    // 서버에 없는 대화용 보조 필드만 카탈로그에서 — 선생님 이름·소속도 아직 응답에 없다.
    expect(slot.bot.quickPrompts).toEqual(seeded.quickPrompts);
    expect(slot.bot.teacherName).toBe(seeded.teacherName);
    // 카탈로그 이름은 이미 「… 선생님」이라 호칭을 두 번 붙이지 않는다.
    expect(seeded.teacherName.endsWith('선생님')).toBe(true);
    expect(slot.enrollment).toMatchObject({
      botId: seeded.id,
      classroomId: seeded.id,
      classroomLabel: '고2 미적분 A반',
      assignedBy: seeded.teacherName,
      via: seeded.organization,
    });
  });

  it('카탈로그에 없는 반은 서버 값 + 기본값으로 선다 — 선생님은 「선생님」으로 부른다', () => {
    const slot = toSlot(card('cls_new', '새 반'));

    expect(slot.bot).toMatchObject({
      id: 'cls_new',
      name: '새 반',
      teacherName: '',
      organization: '',
      tone: '친근',
      scope: 3,
      quickPrompts: [],
      isLive: false,
      enrolledCount: 0,
    });
    expect(slot.enrollment.assignedBy).toBe('선생님');
    // 카드에는 수강 시각이 없다 — 화면은 빈 값이면 참여일 줄을 숨긴다.
    expect(slot.enrollment.assignedAt).toBe('');
  });

  it('서버가 화면 union 밖의 말투·범위를 주면 카탈로그 값으로 접는다(캐스팅 없이)', () => {
    const seeded = classBots[0];
    const slot = toSlot(
      card(seeded.id, seeded.name, {
        subject: seeded.subject,
        grade: seeded.grade,
        tone: '초스파르타',
        greeting: '',
        scope: 9,
        avatarEmoji: seeded.avatarEmoji,
        quickPrompts: [],
        enrolledCount: 0,
        isLive: false,
        currentLesson: null,
      }),
    );
    expect(slot.bot.tone).toBe(seeded.tone);
    expect(slot.bot.scope).toBe(seeded.scope);
  });
});

describe('useMyRooms', () => {
  it('서버 행을 그대로 슬롯으로 — 소스는 api 하나다', () => {
    query = { data: [card('cb_002', '고2 미적분 A반'), card('cls_9', '새 반')], isPending: false };

    const { result } = renderHook(() => useMyRooms());
    expect(result.current.rooms.map((r) => r.bot.id)).toEqual(['cb_002', 'cls_9']);
    expect(result.current.rooms.every((r) => r.source === 'api')).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('401 은 고장이 아니다 — 로그인으로 가는 중이라 에러 카드를 띄우지 않는다', () => {
    query = { isPending: false, error: new ApiError('Unauthorized', 401) };

    const { result } = renderHook(() => useMyRooms());
    expect(result.current.rooms).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('못 읽었으면(5xx) 빈 목록 + isError — 「없다」가 아니라 「모른다」', () => {
    query = { isPending: false, error: new ApiError('HTTP 500', 500) };

    const { result } = renderHook(() => useMyRooms());
    expect(result.current.rooms).toEqual([]);
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('조회 중이면 isLoading — 빈 상태를 먼저 그리지 않는다', () => {
    query = { isPending: true };
    const { result } = renderHook(() => useMyRooms());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rooms).toEqual([]);
  });

  it('retry 는 서버 조회를 다시 부른다', () => {
    query = { isPending: false, error: new ApiError('실패', 503) };
    const { result } = renderHook(() => useMyRooms());
    result.current.retry();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
