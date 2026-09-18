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
 * 둘이 **같은 수**를 써야 아바타 끝의 `+2` 와 이름 줄 끝의 「외 2곳」이 같은 것을 가리킨다.
 * 서로 다른 수를 쓰면 한 카드가 두 개의 「나머지」를 말하게 된다.
 */
export const VISIBLE_ROOMS = 3;

/**
 * 반 이름 줄 — 「내가 어느 반에 들어가 있나」를 이름 그대로 말한다.
 *
 * 종전에는 학원·학교로 묶어 「○○학원 3반」처럼 적었다. **그 축이 정본에 없다** — 홈이 읽는
 * `GET /classbot/bots?role=student` 한 행(`BotCardDto`)은 `id` · `name`(반 이름) · `description` ·
 * `isActive` · `role` · `profile` 뿐이고 소속 칸이 없다. 그래서 실제로 로그인한 학생의 반은 하나도
 * 빠짐없이 「그 밖의 수업방」이라는 한 묶음으로 떨어졌고, 학생은 이 카드에서 자기 반을 알아볼 수
 * 없었다. 묶음이 하나뿐이면 묶은 것이 아니고, 그 묶음 이름이 「그 밖」이면 아무 말도 아니다.
 *
 * 그래서 묶기를 그만두고 **반 이름을 그대로 늘어놓는다.** 반 이름은 정본이 `name` 으로 늘 주니
 * 시드 봇이 아닌 실제 반에서도 비지 않는다. 읽는 칸을 `bot.name` 이 아니라 `classroomLabel` 로
 * 잡은 이유: 「내 수업방」·「내 정보」가 같은 칸을 부른다(`app/(student)/classbot/classroom/page.tsx` ·
 * `me/page.tsx`). 같은 반을 두 화면이 다르게 부르면 안 된다.
 *
 * 소속으로 다시 묶을 자리는 여기다 — 정본 카드에 소속이 실리는 날(교사 표시명·소속을 얹는
 * pullim-api `members` 조인) 이 함수가 그 축을 되살리면 된다. 그 값이 올 때까지는 없는 칸을
 * 있는 척하지 않는다.
 * @param rooms - 참여 중인 방(한 곳 이상)
 * @returns 「중2 수학 A반 · 중3 영어 읽기반」, 넘치면 「… 외 2곳」
 */
export function roomNameLine(rooms: readonly RoomSlot[]): string {
  const shown = rooms.slice(0, VISIBLE_ROOMS).map((room) => room.enrollment.classroomLabel);
  const rest = rooms.length - shown.length;
  return rest > 0 ? `${shown.join(' · ')} 외 ${rest}곳` : shown.join(' · ');
}

/**
 * 이름을 아는 선생님들 — 같은 선생님의 두 반은 한 번만 부른다. 순서는 들어온 순서.
 *
 * `enrollment.assignedBy` 로 **거르지** 않는 이유: 그 칸은 이름을 모를 때 「선생님」으로 채워진다.
 * 그것까지 세면 서로 다른 선생님의 다섯 반이 「선생님 1명」이 된다 — 모르는 것을 아는 척하는 수다.
 * 그래서 이름이 실제로 있는지는 `bot.teacherName` 으로 가르고, 부르는 말만 호칭이 붙은
 * `assignedBy` 를 쓴다. 정본 카드에 아직 교사 표시명이 없어 실제 반에서는 빈 목록이고,
 * 그때 카드는 선생님 줄 자체를 접는다.
 * @param rooms - 참여 중인 방
 * @returns 「김보람 선생님」처럼 호칭까지 붙은 서로 다른 이름들
 */
export function teacherNames(rooms: readonly RoomSlot[]): string[] {
  return Array.from(
    new Set(rooms.filter((room) => room.bot.teacherName).map((room) => room.enrollment.assignedBy)),
  );
}
