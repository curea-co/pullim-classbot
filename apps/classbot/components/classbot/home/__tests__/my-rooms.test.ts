/**
 * `useMyRooms()` — **소스는 상황에 따라 하나다.**
 *
 * 로컬 스토어(`pullim-class-enrollment`)는 사용자별이 아니라 **전역 배열**이다. 그래서
 * 식별된 사용자의 성공 응답에 그것을 섞으면, 같은 브라우저에서 익명 데모나 다른 학생이 전에
 * 참여한 mock 방이 지금 로그인한 학생의 목록에 들어온다 — 남의 방이다.
 * 반대로 신원이 없으면(401) 로컬이 데모의 정본이고, prod 회귀 자동화가 그 길로 반에 들어간다.
 * 그리고 못 읽었으면(5xx) 빈 목록이 「없다」가 아니라 「모른다」다.
 */
import { renderHook } from '@testing-library/react';

import { useMyRooms } from '../my-rooms';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { StudentClassroomItem } from '@/hooks/api/types';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';

let query: { data?: { classrooms: StudentClassroomItem[] }; isPending: boolean; error?: unknown };
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useMyClassrooms: () => ({ ...query, refetch }),
}));

let localRooms: { bot: ClassBot; enrollment: StudentEnrollment }[] = [];
jest.mock('@/lib/store/class-enrollment', () => ({
  useMyClassBots: () => localRooms,
  useClassEnrollmentStore: { persist: { hasHydrated: () => true, onFinishHydration: () => () => {} } },
}));

jest.mock('@/lib/store/use-hydrated', () => ({ useStoresHydrated: () => true }));

/** 서버 한 칸 — 화면이 읽는 필드만 채운다. */
const apiRoom = (botId: string, label: string): StudentClassroomItem => ({
  classroomId: `room_${botId}`,
  label,
  botId,
  botName: '수학봇',
  botAvatarEmoji: '🧑‍🏫',
  subject: '수학Ⅱ',
  grade: '고2',
  teacherName: '김수학',
  organization: '대치프리미엄 수학학원',
  joinedAt: '2026-09-01T00:00:00.000Z',
  via: '대치프리미엄 수학학원',
} as StudentClassroomItem);

/** 데모 코드로 들어온 로컬 방 — mock 카탈로그의 봇을 쓴다. */
const localRoom = (botId: string) => {
  const bot = classBots.find((b) => b.id === botId)!;
  return {
    bot,
    enrollment: {
      botId,
      classroomId: botId,
      classroomLabel: bot.name,
      assignedBy: bot.teacherName,
      assignedAt: '2026-08-01T00:00:00.000Z',
      via: bot.organization,
    } as StudentEnrollment,
  };
};

beforeEach(() => {
  query = { data: { classrooms: [] }, isPending: false };
  localRooms = [];
  refetch.mockReset();
});

it('신원이 있으면(200) 서버 행만 쓴다 — 전역 로컬 방을 섞지 않는다', () => {
  query = { data: { classrooms: [apiRoom('cb_002', '고2 미적분 A반')] }, isPending: false };
  localRooms = [localRoom('cb_001')]; // 익명 데모가 남겨 둔 방

  const { result } = renderHook(() => useMyRooms());
  expect(result.current.rooms.map((r) => r.bot.id)).toEqual(['cb_002']);
  expect(result.current.rooms.every((r) => r.source === 'api')).toBe(true);
  expect(result.current.isError).toBe(false);
});

it('신원이 없으면(401) 로컬 방만 쓴다 — 데모·prod-verify 경로', () => {
  query = { isPending: false, error: new ApiClientError('로그인이 필요합니다.', 401, 'AUTH_REQUIRED') };
  localRooms = [localRoom('cb_001')];

  const { result } = renderHook(() => useMyRooms());
  expect(result.current.rooms.map((r) => r.bot.id)).toEqual(['cb_001']);
  expect(result.current.rooms[0].source).toBe('local');
  // 401 은 고장이 아니다 — 에러 카드를 띄우지 않는다.
  expect(result.current.isError).toBe(false);
});

it('못 읽었으면(5xx) 빈 목록 + isError — 로컬로 대신 채우지 않는다', () => {
  query = { isPending: false, error: new ApiClientError('요청에 실패했어요 (HTTP 500)', 500, 'UNKNOWN') };
  localRooms = [localRoom('cb_001')];

  const { result } = renderHook(() => useMyRooms());
  expect(result.current.rooms).toEqual([]);
  expect(result.current.isError).toBe(true);
  expect(result.current.isLoading).toBe(false);
});

it('retry 는 서버 조회를 다시 부른다', () => {
  query = { isPending: false, error: new ApiClientError('실패', 503, 'UNKNOWN') };
  const { result } = renderHook(() => useMyRooms());
  result.current.retry();
  expect(refetch).toHaveBeenCalledTimes(1);
});
