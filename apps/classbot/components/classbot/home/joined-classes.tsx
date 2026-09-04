'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { groupByOrg, teacherCount } from './joined-classes-data';
import type { RoomSlot } from './my-rooms';

/**
 * 참여 중인 클래스 — 「한 줄로 접고, 문을 크게 연다」.
 *
 * 홈은 같은 여섯 개를 두 번 적지 않는다. 바로 위 「내 봇」이 이미 그 여섯을 봇 이름·과목·
 * 마지막 대화까지 보여 주고 있고, 반 이름과 선생님까지 갖춘 **온전한 목록은
 * `/classbot/classroom` 에 이미 있다**(과목·학년 칩, 참여한 날, 과제 보기, 나가기까지).
 * 그래서 홈이 할 일은 목록을 세 번째로 베끼는 게 아니라 **규모를 말하고 문을 여는 것**이다.
 *
 * 대신 목록이 못 하던 말을 한다 — 몇 반인지, 선생님이 몇 분인지, **어느 학원·학교에서
 * 몇 반인지**. 여섯 줄을 읽어야 알던 것을 두 줄로 준다.
 *
 * **반별 「나가기」를 홈에 두지 않는 것은 의도다.** 그 버튼은 로컬(데모) 참여에만 붙는
 * 것이고(서버에 탈퇴 라우트가 아직 없어 실 참여에 붙이면 눌러도 아무 일이 없다), 같은
 * 게이트를 건 같은 버튼이 `/classbot/classroom` 의 반 카드에 이미 있다 — 이 카드가 그리로 보낸다.
 *
 * 그리고 이 링크는 홈의 **상시 참여 입구**다. 참여 코드 입력칸이 hero 에만 있으면 반이
 * 하나 생긴 순간 사라져 두 번째 선생님의 반에 들어갈 길이 없어진다. 그 문은 늘 열려 있어야 한다.
 */
export function JoinedClasses({ rooms }: { rooms: RoomSlot[] }) {
  if (rooms.length === 0) return null;

  const groups = groupByOrg(rooms);
  // 반이 하나면 세는 말(1명·1반)이 우스워진다 — 그럴 땐 이름을 그대로 부른다.
  const lead = rooms.length === 1 ? rooms[0].enrollment.assignedBy : `선생님 ${teacherCount(rooms)}명`;
  const stack = rooms.slice(0, 4);
  const rest = rooms.length - stack.length;

  return (
    <section className="pt-2">
      <Link
        href="/classbot/classroom"
        aria-label={`참여 중인 클래스 ${rooms.length}곳 — 내 수업방 열기`}
        className="group bg-card shadow-pullim-xs focus-visible:ring-pullim-blue-400/50 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 border-pullim-slate-200 flex flex-col gap-3 rounded-2xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex-row sm:items-center"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {/* 겹친 아바타 — 「이 방들이 내 방이다」를 한 덩어리로 말한다.
              시그니처 색은 바로 위 봇 카드가 이미 쓰고 있어 여기서는 중립 면으로 둔다. */}
          <span className="flex shrink-0 items-center -space-x-2" aria-hidden="true">
            {stack.map((room) => (
              <span
                // 같은 봇을 쓰는 반이 둘일 수 있다 — key 는 반 단위여야 한다.
                key={room.enrollment.classroomId}
                className="bg-pullim-slate-100 ring-card flex h-9 w-9 items-center justify-center rounded-full text-base ring-2"
              >
                {room.bot.avatarEmoji}
              </span>
            ))}
            {rest > 0 && (
              <span className="bg-pullim-slate-200 text-pullim-slate-600 ring-card text-2xs flex h-9 w-9 items-center justify-center rounded-full font-bold ring-2">
                +{rest}
              </span>
            )}
          </span>

          <span className="min-w-0">
            <span className="text-pullim-slate-900 block text-sm font-bold">
              참여 중인 클래스 {rooms.length}곳
            </span>
            {/* 모바일에서는 학원·학교가 두 줄까지 나온다 — 한 줄로 자르면 정작 이 카드가 새로 주는 말이 사라진다 */}
            <span className="mt-0.5 line-clamp-2 block">
              <span className="text-pullim-slate-600 text-2xs font-semibold">{lead}</span>
              {groups.map((g) => (
                <span key={g.org} className="text-pullim-slate-500 text-2xs">
                  {' · '}
                  {g.org}
                  {g.rooms.length > 1 && ` ${g.rooms.length}반`}
                </span>
              ))}
            </span>
          </span>
        </span>

        <span className="text-pullim-blue-600 group-hover:text-pullim-blue-700 inline-flex min-h-11 shrink-0 items-center gap-1 self-end text-xs font-semibold whitespace-nowrap sm:self-auto">
          내 수업방
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </section>
  );
}
