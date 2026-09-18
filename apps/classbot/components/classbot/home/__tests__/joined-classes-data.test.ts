/**
 * 홈 「참여 중인 클래스」 카드의 두 줄 — **반 이름**과 **아는 선생님**.
 *
 * 종전에는 학원·학교로 묶었다. 정본 봇 카드에 소속 칸이 없어 실제 반이 전부 「그 밖의 수업방」
 * 한 묶음으로 떨어졌고, 학생이 자기 반을 이름으로 못 찾았다. 그래서 여기서 보는 것은 셋이다:
 * 반 이름이 그대로 서는가, 아바타에 그릴 반과 접힌 수가 한 계산에서 나오는가, 그리고 모르는
 * 선생님을 아는 척하지 않는가.
 *
 * 기대값은 **상수를 읽어 짓지 않고 글자로 적는다** — `VISIBLE_ROOMS` 를 읽어 지으면 그 수가
 * 몇으로 바뀌든 통과해 버려서, 정작 잠그려던 「아바타와 이름 줄이 같은 수를 말한다」를 못 잡는다.
 */
import { roomNames, teacherNames } from '../joined-classes-data';
import type { RoomSlot } from '../my-rooms';
import type { ClassBot } from '@/lib/mock/classbot';

/**
 * 반 한 칸 — 이 두 함수가 읽는 칸만 채운다.
 *
 * `bot.name` 과 `classroomLabel` 에 **다른 글자**를 넣는다. 화면이 부를 이름은 반 이름
 * (`classroomLabel`)이고 「내 수업방」·「내 정보」가 부르는 것도 그 칸이라, 둘에 같은 글자를 넣으면
 * 어느 칸을 읽든 테스트가 통과해 그 결정이 안 잠긴다.
 * `teacherName` 이 빈 값인 것이 **정본을 읽은 실제 반**의 모습이다(카드에 교사 표시명이 없다).
 */
function room(name: string, teacherName = ''): RoomSlot {
  return {
    bot: { id: name, name: `${name}(봇)`, teacherName } as ClassBot,
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

describe('roomNames — 반 이름을 그대로 말한다', () => {
  it('반이 하나면 그 반 이름만 선다 — 묶음 제목이 끼어들지 않는다', () => {
    const { shown, hidden, line } = roomNames([room('중2 수학 A반')]);

    expect(line).toBe('중2 수학 A반');
    expect(shown).toHaveLength(1);
    expect(hidden).toBe(0);
  });

  it('소속을 모르는 반들도 각자의 이름으로 늘어선다 — 한 묶음으로 뭉개지지 않는다', () => {
    const { line, hidden } = roomNames([room('중2 수학 A반'), room('중3 영어 읽기반')]);

    expect(line).toBe('중2 수학 A반 · 중3 영어 읽기반');
    expect(hidden).toBe(0);
  });

  it('반 다섯이면 앞의 셋만 이름을 부르고 둘을 접는다 — 아바타에 그릴 반과 접힌 수가 한 계산에서 나온다', () => {
    const { shown, hidden, line } = roomNames(
      ['가반', '나반', '다반', '라반', '마반'].map((n) => room(n)),
    );

    // 아바타가 그릴 반과 이름 줄에 실린 반이 **같은 셋**이다.
    expect(shown.map((r) => r.enrollment.classroomLabel)).toEqual(['가반', '나반', '다반']);
    // 배지의 `+2` 와 이름 줄의 「그 밖에 2곳」이 이 한 값에서 나온다.
    expect(hidden).toBe(2);
    expect(line).toBe('가반 · 나반 · 다반 그 밖에 2곳');
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
