'use client';

/**
 * 「참여 중인 클래스」 카드가 쓰는 파생값.
 *
 * 여기 있는 것은 전부 **이미 화면에 들어와 있는 데이터에서 세는 일**뿐이다 —
 * 새 요청을 내지 않는다. 반 목록은 `useMyRooms()` 가 소스다.
 */

import type { RoomSlot } from './my-rooms';

/** 학원·학교 이름을 못 찾았을 때의 묶음 이름. */
const UNKNOWN_ORG = '그 밖의 수업방';

/** 이 반을 어디서 들었나 — 참여 경로(학원·학교)가 먼저고, 없으면 봇의 소속. */
function orgOf(room: RoomSlot): string {
  return room.enrollment.via || room.bot.organization || UNKNOWN_ORG;
}

/** 학원·학교 한 묶음. */
export interface OrgGroup {
  org: string;
  rooms: RoomSlot[];
}

/**
 * 학원·학교로 묶는다 — 「같은 학원에서 네 반, 학교에서 한 반」이 한눈에 보이는 축.
 * 봇 카드에도 반 목록에도 없는 정보라, 홈 카드가 자리값을 하는 근거가 여기다.
 * 순서는 들어온 순서를 지킨다(먼저 나온 학원이 위).
 * @param rooms - 참여 중인 방
 * @returns 학원·학교별 묶음
 */
export function groupByOrg(rooms: readonly RoomSlot[]): OrgGroup[] {
  const groups: OrgGroup[] = [];
  for (const room of rooms) {
    const org = orgOf(room);
    const hit = groups.find((g) => g.org === org);
    if (hit) hit.rooms.push(room);
    else groups.push({ org, rooms: [room] });
  }
  return groups;
}

/**
 * 선생님 수 — 같은 선생님의 두 반은 한 명으로 센다.
 * @param rooms - 참여 중인 방
 * @returns 서로 다른 선생님 수
 */
export function teacherCount(rooms: readonly RoomSlot[]): number {
  return new Set(rooms.map((r) => r.enrollment.assignedBy).filter(Boolean)).size;
}
