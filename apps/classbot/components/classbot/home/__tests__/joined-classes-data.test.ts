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
import { toSlot, type RoomSlot } from '../my-rooms';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import type { ClassBot } from '@/lib/mock/classbot';

// `toSlot` 을 부르려고 한 줄만 막는다 — 이 파일이 재는 것은 훅이 아니라 **카드 → 홈 줄** 사슬이다.
jest.mock('@/hooks/api/classroom', () => ({ useMyClassrooms: () => ({ isPending: true }) }));

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
    isSelfStudy: false,
    source: 'api',
  };
}

/**
 * 정본 카드 한 장(pullim-api #679 이후) — **`name` 은 봇 이름이고 반 이름은 `className`** 이다.
 * 위 `room()` 은 슬롯을 손으로 세우지만 이건 실제 응답 모양에서 `toSlot` 을 거쳐 온다.
 */
function apiCard(className: string, botName: string): BotCardDto {
  return {
    id: className,
    botId: `bot_${className}`,
    name: botName,
    className,
    description: null,
    isActive: true,
    role: 'student',
    profile: null,
  };
}

describe('roomNames — 정본 카드에서 온 방', () => {
  /*
    위 `room()` 이 잠그는 것은 **이 파일이 어느 칸을 읽는가**다. 여기서 잠그는 것은 그 앞 —
    **`toSlot` 이 그 칸에 무엇을 넣는가**다. 둘을 갈라 두는 이유: 카드의 `name` 을 반 이름 자리에
    그대로 넣던 시절에도 위 검사들은 전부 통과했다(슬롯을 손으로 세우니까). 그래서 #679 가
    `name` 의 뜻을 바꿔도 여기서만 빨개진다.
  */
  it('홈 줄은 반 이름으로 선다 — 봇 이름이 그 자리를 덮지 않는다', () => {
    const { line, shown } = roomNames([
      toSlot(apiCard('중1 수학 QA반', 'QA 수학 선생님')),
      toSlot(apiCard('고2 국어', '문학 도우미')),
    ]);

    expect(line).toBe('중1 수학 QA반 · 고2 국어');
    // 봇 이름은 이 줄에 한 글자도 오지 않는다.
    expect(line).not.toContain('선생님');
    expect(line).not.toContain('도우미');
    // 아바타가 그릴 반도 같은 칸을 말한다.
    expect(shown.map((r) => r.enrollment.classroomLabel)).toEqual(['중1 수학 QA반', '고2 국어']);
    // 그리고 봇 이름은 **잃지 않았다** — 다른 칸에 그대로 서 있다.
    expect(shown.map((r) => r.bot.name)).toEqual(['QA 수학 선생님', '문학 도우미']);
  });
});

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
