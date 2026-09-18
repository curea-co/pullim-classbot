'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { BotAvatar } from '@/components/classbot/bot-avatar';
import { SectionHeading } from '@/components/shell/section-heading';

import { roomNames, teacherNames } from './joined-classes-data';
import type { RoomSlot } from './my-rooms';

/**
 * 참여 중인 클래스 — 「한 줄로 접고, 문을 크게 연다」.
 *
 * 홈은 같은 여섯 개를 두 번 적지 않는다. 바로 위 「내 봇」이 이미 그 여섯을 봇 이름·과목·
 * 마지막 대화까지 보여 주고 있고, 반 이름과 선생님까지 갖춘 **온전한 목록은
 * `/classbot/classroom` 에 이미 있다**(과목·학년 칩, 참여한 날, 과제 보기, 나가기까지).
 * 그래서 홈이 할 일은 목록을 세 번째로 베끼는 게 아니라 **어느 반에 들어가 있는지를 이름으로
 * 말하고 문을 여는 것**이다.
 *
 * 대신 목록이 못 하던 말을 한다 — **내가 어느 반에 들어가 있는지**를 이름으로, 그리고 이름을
 * 아는 선생님이 누구인지를. 여섯 줄을 읽어야 알던 것을 두 줄로 준다.
 *
 * 굵은 줄이 학원·학교 이름이던 때가 있었다. 정본 봇 카드에 소속 칸이 없어 모든 반이
 * 「그 밖의 수업방」 한 묶음으로 떨어졌고, 그래서 축을 **반 이름**으로 바꿨다 —
 * 까닭과 되살릴 자리는 `joined-classes-data.ts` 의 `roomNames()` 에 적어 두었다.
 *
 * **카드가 반 수를 글자로 말하는 것은 이름이 넘칠 때뿐이다**(「그 밖에 2곳」 + 아바타 배지의 `+2`).
 * 선생님 줄은 이름을 아는 반이 있을 때만 서는데, 정본을 읽는 실제 반은 `bot.teacherName` 이 늘
 * 비어 **언제나 접힌다** — 그래서 반 1~3곳인 실계정 카드에는 글자로 적힌 수가 아예 없고, 수는
 * 링크의 `aria-label` 에만 남는다. 세는 말이 필요해지면 그 자리를 다시 열 것.
 *
 * **제목은 카드 밖 `SectionHeading` 이다** — 「내 봇」·「오늘 할 일」과 같은 h2 체계.
 * 그래서 카드 본문은 제목을 되풀이하지 않고, 제목이 못 하는 말(반 이름, 아는 선생님)만 한다.
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

  // 굵은 줄이 말하는 것 — 내가 어느 반에 있는지. 제목이 밖으로 나가며 비운 자리다.
  // 아바타에 그릴 반(`shown`)과 접힌 수(`hidden`)를 **같은 계산에서** 받는다 — 여기서 따로 세면
  // 배지의 `+N` 과 이름 줄의 「그 밖에 N곳」이 서로 다른 수를 가리킬 길이 생긴다.
  const { shown, hidden, line } = roomNames(rooms);
  // 작은 줄은 **아는 이름만** 부른다. 한두 분이면 그대로, 더 많으면 세어서.
  // 한 분도 못 알아보면(정본 카드에 교사 표시명이 없는 실제 반) 줄 자체를 접는다 —
  // 「선생님」이라고만 적힌 줄은 학생에게 아무것도 알려 주지 못한다.
  const teachers = teacherNames(rooms);
  const teacherLine = teachers.length <= 2 ? teachers.join(' · ') : `선생님 ${teachers.length}명`;

  return (
    <section className="pt-2">
      <SectionHeading title="참여 중인 클래스" />
      <Link
        href="/classbot/classroom"
        // 카드가 말하는 문구는 다듬으면 바뀐다 — e2e 가 잡을 자리는 이 고정 손잡이다.
        data-testid="joined-classes"
        aria-label={`참여 중인 클래스 ${rooms.length}곳 — 내 수업방 열기`}
        className="group bg-card shadow-pullim-xs focus-visible:ring-pullim-blue-400/50 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 border-pullim-slate-200 flex flex-col gap-3 rounded-2xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex-row sm:items-center"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {/* 겹친 아바타 — 「이 방들이 내 방이다」를 한 덩어리로 말한다.
              바로 위 봇 카드와 같은 `BotAvatar` 다. 같은 반을 두 곳에서 보는 것이니
              두 자리의 배지가 서로 달라 보이면 안 된다. */}
          <span className="flex shrink-0 items-center -space-x-2" aria-hidden="true">
            {shown.map((room) => (
              <BotAvatar
                // 같은 봇을 쓰는 반이 둘일 수 있다 — key 는 반 단위여야 한다.
                key={room.enrollment.classroomId}
                subject={room.bot.subject}
                name={room.bot.name}
                size="md"
                className="ring-card ring-2"
              />
            ))}
            {hidden > 0 && (
              <span className="bg-pullim-slate-200 text-pullim-slate-600 ring-card text-2xs flex h-9 w-9 items-center justify-center rounded-md font-bold ring-2">
                +{hidden}
              </span>
            )}
          </span>

          <span className="min-w-0">
            {/* 모바일에서는 반 이름이 두 줄까지 나온다 — 한 줄로 자르면 정작 이 카드가 새로 주는 말이 사라진다.
                `block` 을 함께 주지 않는 이유: `line-clamp-2` 가 이미 `display:-webkit-box` 라 둘이 서로를 덮는다. */}
            <span className="text-pullim-slate-900 line-clamp-2 text-sm font-bold">{line}</span>
            {teacherLine && (
              <span className="text-pullim-slate-600 text-2xs mt-0.5 block font-semibold">
                {teacherLine}
              </span>
            )}
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
