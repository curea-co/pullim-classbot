'use client';

import { useMemo } from 'react';

import { useMyClassrooms } from '@/hooks/api/classroom';
import type { StudentClassroomItem } from '@/hooks/api/types';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';
import { useMyClassBots } from '@/lib/store/class-enrollment';

/**
 * 학생이 참여 중인 수업방 한 칸 — 홈·내 정보·학습 기록이 같은 모양으로 읽는다.
 *
 * 소스가 둘인 이유:
 *  - `api`  — `GET /api/me/classrooms`. **선생님이 발급한 코드로 들어온 진짜 방**이다.
 *  - `local` — `lib/store/class-enrollment` 의 localStorage. 데모 코드(`MATH-2024` 등)로
 *    들어온 방이고, prod 회귀 자동화(`tests/e2e`)가 이 경로로 화면을 연다.
 *
 * 둘을 합쳐야 하는 까닭: 스토어의 `useMyClassBots()` 는 mock 카탈로그(`classBots`)에
 * **있는 봇만** 통과시킨다(`bridge()`). 그래서 새로 만든 반의 봇 id 는 스토어에 넣어도
 * 목록에서 조용히 사라진다 — 실 참여를 스토어로는 표현할 수 없다.
 */
export interface RoomSlot {
  bot: ClassBot;
  enrollment: StudentEnrollment;
  /** 'local' 만 「나가기」가 실제로 동작한다(서버에 탈퇴 라우트가 아직 없다). */
  source: 'local' | 'api';
}

/** 봇 성격 기본값 — 카탈로그에 없는 새 봇은 이름·과목만 알고 성격은 아직 모른다. */
const UNKNOWN_BOT_DEFAULTS = {
  tone: '친근',
  greeting: '',
  quickPrompts: [],
  scope: 3,
  isLive: false,
  enrolledCount: 0,
} as const satisfies Partial<ClassBot>;

/** '김수학' → '김수학 선생님' (이미 붙어 있으면 그대로) — 서버 `enrollments` 표기와 맞춘다. */
function withHonorific(teacherName: string): string {
  return teacherName.endsWith('선생님') ? teacherName : `${teacherName} 선생님`;
}

/**
 * 서버가 준 수업방 한 칸을 화면이 쓰는 슬롯으로 옮긴다.
 *
 * 시드 봇(`cb_001`…)은 카탈로그 쪽이 성격·인삿말·말투까지 갖고 있어 그쪽을 쓴다.
 * 다만 **과목·학년·선생님·소속은 카탈로그가 아니라 서버 값이 이긴다** — 그건 봇의 성격이 아니라
 * 이 학생이 들어간 **그 반의 사실**이라서다. 카탈로그를 통째로 쓰던 동안
 * 「고2 미적분 A반」이 카탈로그의 `수학 · 중2` 로 찍혔다(서버는 `수학Ⅱ · 고2`) —
 * 반 이름은 고2 인데 배지는 중2 인, 화면 안에서 서로 어긋나는 상태였다.
 * @param item - `GET /api/me/classrooms` 한 칸
 * @returns 홈·목록이 그대로 그릴 수 있는 슬롯
 */
function toSlot(item: StudentClassroomItem): RoomSlot {
  const seeded = classBots.find((b) => b.id === item.botId);
  const bot: ClassBot = seeded
    ? {
        ...seeded,
        subject: item.subject,
        grade: item.grade,
        teacherName: item.teacherName,
        organization: item.organization,
      }
    : {
        id: item.botId,
        name: item.botName,
        avatarEmoji: item.botAvatarEmoji,
        teacherName: item.teacherName,
        organization: item.organization,
        subject: item.subject,
        grade: item.grade,
        ...UNKNOWN_BOT_DEFAULTS,
      };
  return {
    bot,
    enrollment: {
      botId: item.botId,
      classroomId: item.classroomId,
      classroomLabel: item.label,
      assignedBy: withHonorific(item.teacherName),
      assignedAt: item.joinedAt,
      via: item.via,
    },
    source: 'api',
  };
}

/** `useMyRooms()` 결과 — 목록과 「아직 모른다」를 함께 준다. */
export interface MyRoomsResult {
  rooms: RoomSlot[];
  /** 서버 목록이 아직 안 왔다 — 「참여한 방이 없다」로 단정하면 안 되는 구간. */
  isLoading: boolean;
}

/**
 * 내가 참여 중인 수업방 — 서버 목록 + 데모 스토어를 합쳐 돌려준다.
 *
 * 같은 봇이 양쪽에 있으면 **서버 행이 이긴다**(참여 시각·반 이름이 최신이다).
 * 서버가 401 을 주면(로그인도 개발용 신원 쿠키도 없는 데모) 스토어만 남는다 —
 * 지금까지의 데모 동작 그대로다.
 * @returns 참여 중인 방과 로딩 여부
 */
export function useMyRooms(): MyRoomsResult {
  const local = useMyClassBots();
  const { data, isPending } = useMyClassrooms();

  const rooms = useMemo(() => {
    const apiRooms = (data?.classrooms ?? []).map(toSlot);
    const seen = new Set(apiRooms.map((r) => r.bot.id));
    const localRooms: RoomSlot[] = local
      .filter((slot) => !seen.has(slot.bot.id))
      .map((slot) => ({ ...slot, source: 'local' }));
    return [...apiRooms, ...localRooms];
  }, [data, local]);

  return { rooms, isLoading: isPending };
}
