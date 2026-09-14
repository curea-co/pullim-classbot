'use client';

import { useMemo } from 'react';

import { useMyClassrooms } from '@/hooks/api/classroom';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { StudentClassroomItem } from '@/hooks/api/types';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';
import { useClassEnrollmentStore, useMyClassBots } from '@/lib/store/class-enrollment';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

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
 * 시드 봇(`cb_001`…)은 카탈로그 쪽이 성격·인삿말·말투까지 갖고 있어 **그것만** 쓴다.
 * 나머지, 곧 **서버가 명시적으로 주는 칸은 전부 서버 값이 이긴다** — 이름·아바타·과목·학년·
 * 선생님·소속. 그건 봇의 성격이 아니라 이 학생이 들어간 **그 반의 사실**이라서다.
 * 카탈로그를 통째로 쓰던 동안 「고2 미적분 A반」이 카탈로그의 `수학 · 중2` 로 찍혔고
 * (서버는 `수학Ⅱ · 고2`), 교사가 시드 봇의 **이름·아바타를 바꿔도** 홈·수업방·챗에 옛 mock
 * 이름이 계속 떴다 — 화면 안에서 서로 어긋나는 상태였다.
 *
 * 카탈로그에서 가져오는 것은 **대화용 보조 필드**뿐이다(`quickPrompts`·`scope`·`isLive`·
 * `currentLesson`·`greeting`·`tone`). 서버에 그 칸이 없어서 그렇다.
 * @param item - `GET /api/me/classrooms` 한 칸
 * @returns 홈·목록이 그대로 그릴 수 있는 슬롯
 */
function toSlot(item: StudentClassroomItem): RoomSlot {
  const seeded = classBots.find((b) => b.id === item.botId);
  const bot: ClassBot = seeded
    ? {
        ...seeded,
        // 서버가 주는 표시 필드는 서버가 이긴다 — 교사가 이름·아바타를 고칠 수 있다.
        name: item.botName,
        avatarEmoji: item.botAvatarEmoji,
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

/** `useMyRooms()` 결과 — 목록과 「아직 모른다」·「못 읽었다」를 함께 준다. */
export interface MyRoomsResult {
  rooms: RoomSlot[];
  /**
   * 아직 「참여한 방이 없다」로 단정하면 안 되는 구간 — **소스 둘 다** 기준이다.
   *
   * 서버 조회만 보면 안 된다. 비로그인 데모는 서버가 **401 로 먼저 끝나는데**
   * localStorage 하이드레이션은 그보다 늦다 — 그 틈에 `rooms=[]` · `isLoading=false` 가 되어
   * **저장된 데모 반이 있는 학생에게 빈 상태가 한 번 번쩍이고** 뒤늦게 카드가 나타난다.
   */
  isLoading: boolean;
  /**
   * 서버 목록을 **못 읽었다**(5xx·네트워크). 이때 `rooms` 는 비어 있지만 그건 「방이 없다」가
   * 아니라 「모른다」다 — **반 목록으로 빈 상태를 가르는 화면은 이 값을 반드시 봐야 한다.**
   * 지금 그런 화면은 넷이다: 홈 · 봇 대화 · 내 수업방 · 내 정보 · 학습 기록.
   *
   * **401 은 여기 들지 않는다.** 그건 고장이 아니라 신원이 없는 데모이고, 그 경우의 정답은
   * 아래 `rooms` 가 이미 담고 있다(로컬 방).
   *
   * 반대로 **이 값을 흘려도 되는 소비부**가 있다 — 받은 과제 목록·과제 대화
   * (`app/(student)/classbot/assignment/*`)는 `rooms` 를 **헤더 페르소나(아바타·이름) 조인**에만
   * 쓰고, 그 화면의 빈·오류 판정은 `useVisibleAssignment(s)` 가 따로 진다. 반 목록이 늦거나
   * 실패해도 과제는 그대로 렌더되고 페르소나만 비므로, 그쪽에서 이 값을 보면 **과제가 있는데
   * 오류 화면**이 된다.
   */
  isError: boolean;
  /** 실패했을 때 다시 읽기. */
  retry: () => void;
}

/**
 * 내가 참여 중인 수업방.
 *
 * **소스는 상황에 따라 하나다 — 섞지 않는다.**
 *  - **신원이 있으면**(서버가 200) 서버 행만 쓴다. 로컬 스토어(`pullim-class-enrollment`)는
 *    **사용자별 저장소가 아니라 전역 배열**이라, 같은 브라우저에서 익명 데모나 다른 학생이
 *    전에 참여한 mock 방이 지금 로그인한 학생의 목록에 섞여 든다. 그건 남의 방이다.
 *  - **신원이 없으면**(서버가 401) 로컬 방만 쓴다 — prod 는 공개·비로그인이라 이 경로가
 *    데모의 정본이고, prod 회귀 자동화(`tests/e2e`)도 이 길로 반에 들어간다.
 *  - **못 읽었으면**(5xx·네트워크) 빈 목록 + `isError` 다. 로컬로 대신 채우지 않는다 —
 *    식별된 사용자에게 남의 데모 방을 보여 주는 셈이 된다.
 * @returns 참여 중인 방 · 로딩 · 실패 · 재시도
 */
export function useMyRooms(): MyRoomsResult {
  const local = useMyClassBots();
  // 스토어 하이드레이션도 기다린다 — 위 `isLoading` 주석의 그 틈을 막는다.
  const localHydrated = useStoresHydrated(useClassEnrollmentStore);
  const { data, isPending, error, refetch } = useMyClassrooms();

  // 신원이 없다 = 데모다. 고장이 아니다.
  const unidentified = error instanceof ApiClientError && error.status === 401;
  const isError = Boolean(error) && !unidentified;

  const rooms = useMemo<RoomSlot[]>(() => {
    // 화면의 목록 key 는 봇이 아니라 `enrollment.classroomId` 다 — 서버가 같은 봇으로 여러
    // 반을 주는 경우가 있어서(그 반들은 전부 남는다).
    if (unidentified) return local.map((slot) => ({ ...slot, source: 'local' }));
    return (data?.classrooms ?? []).map(toSlot);
  }, [data, local, unidentified]);

  return {
    rooms,
    // 로컬을 쓰는 경로에서만 하이드레이션을 기다린다 — 신원이 있으면 로컬을 안 읽는다.
    isLoading: isPending || (unidentified && !localHydrated),
    isError,
    retry: () => void refetch(),
  };
}
