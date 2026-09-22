'use client';

/**
 * 「참여 중인 클래스」 카드가 쓰는 파생값.
 *
 * 여기 있는 것은 전부 **이미 화면에 들어와 있는 데이터에서 세는 일**뿐이다 —
 * 새 요청을 내지 않는다. 반 목록은 `useMyRooms()` 가 소스다.
 */

import type { RoomSlot } from './my-rooms';

/**
 * 카드가 한 번에 내보이는 반 수 — 겹친 아바타도, 이름 줄도 이만큼까지만 보이고 나머지는 접는다.
 *
 * **내보내지 않는다.** 아바타와 이름 줄이 이 수를 각자 세면 어느 날 한쪽만 바뀌어 배지의 `+2` 와
 * 이름 줄의 「그 밖에 3곳」이 서로 다른 것을 가리킨다. 그래서 세는 자리를 `roomNames()` 하나로 두고
 * 컴포넌트는 **그 결과만** 받는다.
 */
const VISIBLE_ROOMS = 3;

/** 카드가 한 번에 말하는 것 — 앞의 몇 반, 접힌 나머지 수, 그리고 그 둘로 지은 한 줄. */
export interface RoomNames {
  /** 이름을 부르는 반들 — 겹친 아바타도 **이 반들**을 그린다. */
  shown: RoomSlot[];
  /** 이름 줄에 못 실린 반 수 — 아바타 배지의 `+N` 이 같은 값이다. */
  hidden: number;
  /** 「중2 수학 A반 · 중3 영어 읽기반 그 밖에 2곳」 */
  line: string;
}

/**
 * 반 이름 — 「내가 어느 반에 들어가 있나」를 이름 그대로 말한다.
 *
 * 종전에는 학원·학교로 묶어 「○○학원 3반」처럼 적었다. **그 축이 정본에 없다** — 홈이 읽는
 * `GET /classbot/bots?role=student` 한 행(`BotCardDto`)은 `id` · `botId` · `name`(봇 이름) ·
 * `className`(반 이름) · `description` · `isActive` · `role` · `profile` 뿐이고 소속 칸이 없다
 * (이름이 두 칸으로 갈린 것은 pullim-api #679 · `my-rooms.ts` 의 `classNameOf`). 그래서 실제로 로그인한 학생의 반은 하나도
 * 빠짐없이 「그 밖의 수업방」이라는 한 묶음으로 떨어졌고, 학생은 이 카드에서 자기 반을 알아볼 수
 * 없었다. 묶음이 하나뿐이면 묶은 것이 아니고, 그 묶음 이름이 「그 밖」이면 아무 말도 아니다.
 *
 * 그래서 묶기를 그만두고 **반 이름을 그대로 늘어놓는다.** 반 이름은 정본이 `className` 으로 늘 주니
 * 시드 봇이 아닌 실제 반에서도 비지 않는다. 읽는 칸을 `bot.name` 이 아니라 `classroomLabel` 로
 * 잡은 이유는 둘이다. 하나는 「내 수업방」·「내 정보」가 같은 칸을 부른다는 것
 * (`app/(student)/classbot/classroom/page.tsx` · `me/page.tsx`) — 같은 반을 두 화면이 다르게 부르면 안 된다.
 * 다른 하나는 **`bot.name` 이 이제 봇 이름이라는 것**(pullim-api #679) — 거기서 읽으면 이 줄이
 * 「QA 수학 선생님 · 문학 도우미」처럼 봇 이름만 늘어놓는 줄이 된다.
 *
 * **소속 축을 되살릴 자리는 여기다.** 길은 둘이고, 어느 쪽이든 카드 응답이 먼저 넓어져야 한다 —
 * 교사 표시명·소속을 얹는 `members` 조인, 또는 `classes.org_id`(`auth.organizations` ID-참조)를
 * 카드에 싣고 그 이름을 조인하는 길(값이 uuid 라 이름 조인이 반드시 따라붙는다).
 * 그 값이 올 때까지는 없는 칸을 있는 척하지 않는다.
 * @param rooms - 참여 중인 방(한 곳 이상)
 * @returns 이름을 부르는 반들 · 접힌 수 · 그 둘로 지은 한 줄
 */
export function roomNames(rooms: readonly RoomSlot[]): RoomNames {
  const shown = rooms.slice(0, VISIBLE_ROOMS);
  const hidden = rooms.length - shown.length;
  const names = shown.map((room) => room.enrollment.classroomLabel).join(' · ');
  // 「외 N곳」이 아니라 「그 밖에 N곳」 — 학생 화면이라 한자어를 피한다.
  return { shown, hidden, line: hidden > 0 ? `${names} 그 밖에 ${hidden}곳` : names };
}

/**
 * 이름을 아는 선생님들 — 같은 선생님의 두 반은 한 번만 부른다. 순서는 들어온 순서.
 *
 * `enrollment.assignedBy` 로 **거르지** 않는 이유: 그 칸은 이름을 모를 때 「선생님」으로 채워진다.
 * 그것까지 세면 서로 다른 선생님의 다섯 반이 「선생님 1명」이 된다 — 모르는 것을 아는 척하는 수다.
 * 그래서 이름이 실제로 있는지는 `bot.teacherName` 으로 가르고, 부르는 말만 호칭이 붙은
 * `assignedBy` 를 쓴다. 정본 카드에 아직 교사 표시명이 없어 **실제 반에서는 늘 빈 목록**이고,
 * 그때 카드는 선생님 줄 자체를 접는다.
 * @param rooms - 참여 중인 방
 * @returns 「김보람 선생님」처럼 호칭까지 붙은 서로 다른 이름들
 */
export function teacherNames(rooms: readonly RoomSlot[]): string[] {
  return Array.from(
    new Set(rooms.filter((room) => room.bot.teacherName).map((room) => room.enrollment.assignedBy)),
  );
}
