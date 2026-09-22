/**
 * `useMyRooms()` — 소스는 pullim-api 정본 하나다(계획 PR 4).
 *
 * 종전에는 서버가 401 을 주면 localStorage 의 데모 방으로 갈아탔다. 그 폴백은 걷혔다 — 비로그인은
 * 이 화면에 오지 않고(RoleGuard), 401 은 로그인으로 간다. 그래서 여기서 보는 것은 넷이다:
 * 서버 카드 → 화면 슬롯 매핑(서버 값이 이기고 카탈로그가 빈 칸을 채운다), **두 이름이 각자의 자리로
 * 가는 것**(pullim-api #679 — `name` = 봇 이름 · `className` = 반 이름), 못 읽었을 때(5xx)의 「모른다」,
 * 그리고 401 이 고장으로 그려지지 않는 것.
 */
import { renderHook } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';

import { toSlot, useMyConversationRooms, useMyRooms } from '../my-rooms';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { classBots } from '@/lib/mock/classbot';
// 순수 함수 하나만 빌려 온다 — 두 이름이 갈렸을 때 **선택기 칩이 실제로 두 마디가 되는지**를
// 여기서 같이 재기 위해서다(그 함수의 훅은 `lib/store/__tests__/mode-bots.test.ts` 가 본다).
import { classSlotLabel } from '@/lib/store/mode-bots';

let query: { data?: BotCardDto[]; isPending: boolean; error?: unknown };
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useMyClassrooms: () => ({ ...query, refetch }),
}));

/**
 * 서버 카드 한 장(#679 이후 모양) — 시드 봇 id 면 카탈로그와 겹친다.
 *
 * **두 번째 인자는 반 이름(`className`)이고 봇 이름은 기본으로 다른 글자가 된다**(「…의 봇」).
 * 둘에 같은 글자를 넣으면 `toSlot` 이 어느 칸을 읽든 통과해서, 이 파일이 잠그려는
 * 「반 이름 자리에 반 이름 · 봇 이름 자리에 봇 이름」이 하중을 하나도 안 받는다.
 */
function card(
  id: string,
  className: string,
  profile: BotCardDto['profile'] = null,
  name = `${className}의 봇`,
): BotCardDto {
  return {
    id,
    botId: `bot_${id}`,
    name,
    className,
    description: null,
    isActive: true,
    role: 'student',
    profile,
  };
}

/**
 * **옛 응답 한 장** — `className`·`botId` 가 없던 시절(pullim-api #679 이전)이고 `name` 이 곧 반 이름이다.
 * 이 PR 은 #679 뒤에 머지되지만 **배포 시점이 갈려** 한동안 이 모양을 볼 수 있다.
 */
function legacyCard(id: string, name: string): BotCardDto {
  return { id, name, description: null, isActive: true, role: 'student', profile: null };
}

beforeEach(() => {
  query = { data: [], isPending: false };
  refetch.mockReset();
});

describe('toSlot — 서버 카드 → 화면 슬롯', () => {
  it('서버가 준 칸(봇 이름·반 이름·profile)이 카탈로그를 이긴다 — 그 반의 사실이라서', () => {
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
    // 봇 이름 자리에는 봇 이름. 카드의 `name` 이고, 반 이름과 **다른 글자**다.
    expect(slot.bot.name).toBe('고2 미적분 A반의 봇');
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
      // 반 이름 자리에는 반 이름. 카드의 `className` 이고, 봇 이름과 **다른 글자**다.
      classroomLabel: '고2 미적분 A반',
      assignedBy: seeded.teacherName,
      via: seeded.organization,
    });
  });

  it('카탈로그에 없는 반은 서버 값 + 기본값으로 선다 — 선생님은 「선생님」으로 부른다', () => {
    const slot = toSlot(card('cls_new', '새 반'));

    expect(slot.bot).toMatchObject({
      id: 'cls_new',
      name: '새 반의 봇',
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
    // 소속도 없다. 실제 반 id 는 uuid 라 이 자리는 **언제나** 빈 값이고, 그래서 홈 카드는
    // 학원·학교로 묶기를 그만두고 반 이름으로 말한다(`joined-classes-data.ts`).
    expect(slot.enrollment.via).toBe('');
  });

  it('ADR-094 자습방은 classId와 실제 botId를 분리하고 표시를 보존한다', () => {
    const slot = toSlot({ ...card('self-class-1', '수학 봇 자습방'), isSelfStudy: true });

    expect(slot.isSelfStudy).toBe(true);
    expect(slot.enrollment.classroomId).toBe('self-class-1');
    expect(slot.bot.id).toBe('bot_self-class-1');
    expect(slot.bot.isOfficial).toBe(true);
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

/**
 * **이름은 두 칸이다** — pullim-api #679 가 카드의 `name` 을 봇 이름으로 옮기고 반 이름을 `className` 으로
 * 따로 냈다. 종전 `toSlot` 은 `card.name` 을 봇 이름과 반 이름 **두 자리에** 넣고 있었으므로, 그대로 두면
 * 반 이름이 학생 화면에서 통째로 사라진다(홈 「참여 중인 클래스」 · 내 수업방 제목·나가기·과제 링크 ·
 * 내 정보 줄 · 챗 선택기 칩).
 */
describe('toSlot — 봇 이름과 반 이름은 각자의 자리로', () => {
  it('반 이름 자리에는 `className`, 봇 이름 자리에는 `name` — 서로 넘어가지 않는다', () => {
    const slot = toSlot(card('cls_qa', '중1 수학 QA반', null, 'QA 수학 선생님'));

    expect(slot.enrollment.classroomLabel).toBe('중1 수학 QA반');
    expect(slot.bot.name).toBe('QA 수학 선생님');
    // 한 값이 두 자리를 덮던 것이 이 PR 이 고친 자리다 — 갈렸는지를 직접 잰다.
    expect(slot.enrollment.classroomLabel).not.toBe(slot.bot.name);
  });

  it('두 이름이 갈리면 선택기 칩이 「반 · 봇」 두 마디로 선다', () => {
    const slot = toSlot(card('cls_qa', '중1 수학 QA반', null, 'QA 수학 선생님'));

    expect(
      classSlotLabel({
        source: 'class',
        bot: slot.bot,
        classId: slot.enrollment.classroomId,
        classLabel: slot.enrollment.classroomLabel,
      }),
    ).toBe('중1 수학 QA반 · QA 수학 선생님');
  });

  it('봇을 안 붙인 반은 서버가 `name` 도 반 이름으로 떨어뜨린다 — 칩은 한 마디로 선다', () => {
    // #679: `botId`·`profile` 이 null 인 반이 그 모양이다.
    const slot = toSlot({ ...card('cls_bare', '봇 없는 반', null, '봇 없는 반'), botId: null });

    expect(slot.enrollment.classroomLabel).toBe('봇 없는 반');
    expect(
      classSlotLabel({
        source: 'class',
        bot: slot.bot,
        classId: slot.enrollment.classroomId,
        classLabel: slot.enrollment.classroomLabel,
      }),
    ).toBe('봇 없는 반');
  });

  it('`className` 이 없는 옛 응답은 `name` 으로 떨어진다 — 반 이름 자리를 비우지 않는다', () => {
    const slot = toSlot(legacyCard('cls_old', '중2 수학 A반'));

    // 그 시절 `name` 은 곧 반 이름이었다. 빈 값으로 두면 카드 제목이 사라지고
    // 나가기 이름표가 「 나가기」가 된다.
    expect(slot.enrollment.classroomLabel).toBe('중2 수학 A반');
    expect(slot.enrollment.classroomLabel).not.toBe('');
  });

  it('봇이 붙은 반의 등급은 그 봇의 등급이다 — `?? 3` 으로 떨어지지 않는다', () => {
    // #679 뒤 `profile` 이 실리는 조건은 「붙은 봇이 있다」이고 `scope` 는 `bots.scope` 다.
    const slot = toSlot(
      card('cls_l4', '중1 수학 QA반', {
        subject: '수학',
        grade: '중1',
        tone: null,
        greeting: null,
        scope: 4,
        avatarEmoji: null,
        quickPrompts: [],
        enrolledCount: 3,
        isLive: false,
        currentLesson: null,
      }),
    );

    expect(slot.bot.scope).toBe(4);
    // 비워 둘 수 있는 칸은 null 로 온다 — 화면 기본값으로 접되 그 값을 만들어 내지 않는다.
    expect(slot.bot.tone).toBe('친근');
    expect(slot.bot.greeting).toBe('');
    expect(slot.bot.avatarEmoji).toBe('🤖');
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

  it('일반 수업 소비에서는 ADR-094 자습방을 제외한다', () => {
    query = {
      data: [
        card('class-1', '중2 A반'),
        { ...card('self-class-1', '수학 봇 자습방'), isSelfStudy: true },
      ],
      isPending: false,
    };

    const { result } = renderHook(() => useMyRooms());
    expect(result.current.rooms.map((room) => room.enrollment.classroomId)).toEqual(['class-1']);
  });

  it('대화 전용 목록은 일반 반과 자습방을 모두 포함한다', () => {
    query = {
      data: [
        card('class-1', '중2 A반'),
        { ...card('self-class-1', '수학 봇 자습방'), isSelfStudy: true },
      ],
      isPending: false,
    };

    const { result } = renderHook(() => useMyConversationRooms());
    expect(result.current.rooms.map((room) => [room.enrollment.classroomId, room.isSelfStudy])).toEqual([
      ['class-1', false],
      ['self-class-1', true],
    ]);
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
