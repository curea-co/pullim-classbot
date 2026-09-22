/** ADR-094 학생 봇 목록: 학생 카드 정본 하나를 isSelfStudy로 분류한다. */
import { renderHook } from '@testing-library/react';

import type { RoomSlot } from '@/components/classbot/home/my-rooms';
import type { ClassBot } from '@/lib/mock';
import { classSlotLabel, studentBotSlotKey, useClassBots, useStudentBots } from '../mode-bots';

let rooms: RoomSlot[] = [];
let loading = false;
let error = false;
const retry = jest.fn();
jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyConversationRooms: () => ({ rooms, isLoading: loading, isError: error, retry }),
}));

function room(
  botId: string,
  classId: string,
  isSelfStudy: boolean,
  classLabel = '중2 A반',
): RoomSlot {
  return {
    bot: {
      id: botId,
      name: `${botId} 봇`,
      avatarEmoji: '🤖',
      teacherName: '',
      organization: '',
      subject: '수학',
      grade: '중2',
      tone: '친근',
      greeting: '안녕',
      quickPrompts: [],
      scope: 3,
      isLive: false,
      enrolledCount: 1,
    } as ClassBot,
    enrollment: {
      botId,
      classroomId: classId,
      classroomLabel: classLabel,
      assignedBy: '선생님',
      assignedAt: '',
      via: '',
    },
    isSelfStudy,
    source: 'api',
  };
}

beforeEach(() => {
  rooms = [];
  loading = false;
  error = false;
  retry.mockClear();
});

it('일반 반과 자습방을 같은 카드 목록에서 순서대로 분류한다', () => {
  rooms = [room('bot-a', 'class-a', false), room('bot-self', 'self-class', true)];
  const { result } = renderHook(() => useStudentBots());

  expect(result.current.slots).toEqual([
    expect.objectContaining({ source: 'class', classId: 'class-a' }),
    expect.objectContaining({ source: 'self', classId: 'self-class' }),
  ]);
  expect(result.current).toMatchObject({ classCount: 1, selfCount: 1 });
});

it('자습방 key도 botId가 아닌 classId를 쓴다', () => {
  const slot = { source: 'self' as const, bot: room('bot-self', 'self-class', true).bot, classId: 'self-class' };
  expect(studentBotSlotKey(slot)).toBe('self:self-class');
});

it('선택적인 별도 self/market 조회가 없어 일반 반은 그대로 열린다', () => {
  rooms = [room('bot-a', 'class-a', false)];
  const { result } = renderHook(() => useStudentBots());

  expect(result.current.isError).toBe(false);
  expect(result.current.slots).toHaveLength(1);
});

it('정본 학생 카드 조회의 로딩/오류/재시도를 그대로 전달한다', () => {
  loading = true;
  error = true;
  const { result } = renderHook(() => useStudentBots());
  expect(result.current).toMatchObject({ isLoading: true, isError: true });
  result.current.retry();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('웰빙 봇은 자습방을 제외한다', () => {
  rooms = [room('bot-a', 'class-a', false), room('bot-self', 'self-class', true)];
  const { result } = renderHook(() => useClassBots());
  expect(result.current.map((bot) => bot.id)).toEqual(['bot-a']);
});

it('일반 반 표시 이름은 반과 봇이 다르면 둘 다 보여 준다', () => {
  rooms = [room('수학봇', 'class-a', false, '중2 A반')];
  const { result } = renderHook(() => useStudentBots());
  const slot = result.current.slots[0];
  expect(slot.source === 'class' ? classSlotLabel(slot) : null).toBe('중2 A반 · 수학봇 봇');
});
