/**
 * 홈 「참여 중인 클래스」 카드의 두 줄 — **반 이름**과 **아는 선생님**.
 *
 * 종전에는 학원·학교로 묶었다. 정본 봇 카드에 소속 칸이 없어 실제 반이 전부 「그 밖의 수업방」
 * 한 묶음으로 떨어졌고, 학생이 자기 반을 이름으로 못 찾았다. 그래서 여기서 보는 것은 둘이다:
 * 반 이름이 그대로 서는가, 그리고 모르는 선생님을 아는 척하지 않는가.
 */
import { roomNameLine, teacherNames, VISIBLE_ROOMS } from '../joined-classes-data';
import type { RoomSlot } from '../my-rooms';
import type { ClassBot } from '@/lib/mock/classbot';

/**
 * 반 한 칸 — 이 두 함수가 읽는 칸만 채운다.
 * `teacherName` 이 빈 값인 것이 **정본을 읽은 실제 반**의 모습이다(카드에 교사 표시명이 없다).
 */
function room(name: string, teacherName = ''): RoomSlot {
  return {
    bot: { id: name, name, teacherName } as ClassBot,
    enrollment: {
      botId: name,
      classroomId: name,
      classroomLabel: name,
      assignedBy: teacherName || '선생님',
      assignedAt: '',
      via: '',
    },
    source: 'api',
  };
}

describe('roomNameLine — 반 이름을 그대로 말한다', () => {
  it('반이 하나면 그 반 이름만 선다 — 묶음 제목이 끼어들지 않는다', () => {
    expect(roomNameLine([room('중2 수학 A반')])).toBe('중2 수학 A반');
  });

  it('소속을 모르는 반들도 각자의 이름으로 늘어선다 — 한 묶음으로 뭉개지지 않는다', () => {
    expect(roomNameLine([room('중2 수학 A반'), room('중3 영어 읽기반')])).toBe(
      '중2 수학 A반 · 중3 영어 읽기반',
    );
  });

  it('보이는 수를 넘으면 나머지는 「외 N곳」으로 접는다 — 겹친 아바타의 「+N」과 같은 수', () => {
    const rooms = ['가반', '나반', '다반', '라반', '마반'].map((n) => room(n));
    const shown = rooms.slice(0, VISIBLE_ROOMS).map((r) => r.enrollment.classroomLabel);

    expect(roomNameLine(rooms)).toBe(`${shown.join(' · ')} 외 ${rooms.length - VISIBLE_ROOMS}곳`);
  });
});

describe('teacherNames — 아는 이름만 부른다', () => {
  it('교사 표시명이 없는 실제 반은 한 명도 세지 않는다 — 카드가 선생님 줄을 접는 근거', () => {
    expect(teacherNames([room('중2 수학 A반'), room('중3 영어 읽기반')])).toEqual([]);
  });

  it('같은 선생님의 두 반은 한 번만 부른다', () => {
    const names = teacherNames([
      room('중2 수학 A반', '김보람 선생님'),
      room('중2 수학 B반', '김보람 선생님'),
      room('중3 영어 읽기반', '박서윤 선생님'),
    ]);

    expect(names).toEqual(['김보람 선생님', '박서윤 선생님']);
  });

  it('이름을 아는 반과 모르는 반이 섞이면 아는 이름만 남는다', () => {
    expect(teacherNames([room('중2 수학 A반', '김보람 선생님'), room('새 반')])).toEqual([
      '김보람 선생님',
    ]);
  });
});
