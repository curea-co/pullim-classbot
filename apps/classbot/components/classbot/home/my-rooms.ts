'use client';

import { useMemo } from 'react';

import { useMyClassrooms } from '@/hooks/api/classroom';
import { isUnauthorized } from '@/lib/api/classbot-client';
import { classNameOf, type BotCardDto } from '@/lib/api/classbot-dto';
import { isScopeLevel } from '@/lib/mock';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';

/**
 * 학생이 참여 중인 수업방 한 칸 — 홈·내 정보·학습 기록이 같은 모양으로 읽는다.
 *
 * 소스는 **하나**다 — pullim-api 정본 `GET /classbot/bots?role=student`(`useMyClassrooms`).
 * 종전에는 서버가 401 을 주면 localStorage(`pullim-class-enrollment`)의 데모 방으로 갈아탔다.
 * 그 길은 2026-09-16 계획 결정 ②·§07(「학생·내 수업방 — 걷는 것: 목 폴백 · class-enrollment persist」)로
 * 닫혔다 — 비로그인은 이 화면에 오지 않고(RoleGuard), 401 은 로그인으로 간다(`lib/api/classbot-client.ts`).
 */
export interface RoomSlot {
  bot: ClassBot;
  enrollment: StudentEnrollment;
  /**
   * 어디서 온 방인가. 이제 **'api' 만 만들어진다** — 'local' 은 종전 데모 방의 표식이었고 더는 생기지
   * 않는다. union 을 남긴 이유는 「나가기」 분기(`app/(student)/classbot/classroom/page.tsx`)가 이 값을
   * 읽기 때문이다 — 서버에 탈퇴 문이 아직 없어 'api' 방은 나가기가 없고, 그 문과 함께 PR 5 가 정리한다.
   */
  source: 'local' | 'api';
}

/** '김수학' → '김수학 선생님' (이미 붙어 있으면 그대로). */
function withHonorific(teacherName: string): string {
  return teacherName.endsWith('선생님') ? teacherName : `${teacherName} 선생님`;
}

const TONES = ['정중', '친근', '스파르타', '차분', '열정'] as const satisfies readonly ClassBot['tone'][];

/**
 * 서버가 string 으로 준 말투를 화면 union 으로 — 목록에 없으면 undefined(폴백은 호출부).
 * `null` 도 받는다 — `bots` 의 말투 칸은 비울 수 있고(`PATCH /bots/:id` 의 null), 그게 그대로 실린다.
 */
function toneOf(raw: string | null | undefined): ClassBot['tone'] | undefined {
  return TONES.find((t) => t === raw);
}

/**
 * 서버가 준 봇 카드 한 장을 화면이 쓰는 슬롯으로 옮긴다.
 *
 * 카드 `id` 는 **반 id** 다 — 탐색 키가 아직 반이라(ADR-092 open ①) 대화·과제·멤버십이 전부 이 값으로
 * 걸린다. `bot.id` 에도 같은 값을 넣는 것은 그 때문이고, 진짜 봇 id(`card.botId`)로 갈아 끼우는 일은
 * 겹치는 자리가 여럿이라(담은 봇과의 중복 판정 · 카탈로그 조회 키) **별건**이다.
 *
 * **서버가 명시적으로 주는 칸은 서버 값이 이긴다** — 반 이름·봇 이름·과목·학년·아바타·말투·인사·범위·
 * 라이브·인원(`profile`). 그건 봇의 성격이 아니라 이 학생이 들어간 **그 반의 사실**이라서다.
 * 그중 **이름은 두 칸이다**(pullim-api #679): `name` 이 봇 이름, `className` 이 반 이름 —
 * 한 값을 두 자리에 쓰면 반 이름이 화면에서 사라진다(`lib/api/classbot-dto.ts` 의 `classNameOf` 머리주석).
 * 카탈로그(`classBots`, 시드 `cb_001`…)에서 가져오는 것은
 * 서버에 없는 대화용 보조 필드뿐이다 — `quickPrompts`(서버는 문장만 주고 화면은 응답키가 필요하다) ·
 * `currentLesson`(서버 모양이 다르다) · 그리고 아직 응답에 없는 **선생님 이름·소속**.
 *
 * 선생님 이름·소속은 정본 카드에 없다(계획 §10 해소 5 — 표시명 조인은 pullim-api PR 2 `members`).
 * 그래서 카탈로그가 채우는 그 두 칸(`teacherName` · `organization`)은 **시드 봇(`cb_001`…)에서만**
 * 값이 붙는다 — 실제 반의 id 는 uuid 라 아래 `classBots.find(…)` 가 반드시 빗나가고 둘 다 빈 값이다.
 * 그 빈 값은 「없다」가 아니라 **「모른다」**이니, 읽는 쪽은 아는 척하지 말고 자리를 접어야 한다:
 * 홈 카드는 선생님 줄을 접고(`joined-classes.tsx`), 내 수업방 카드는 소속 줄을 숨긴다
 * (`app/(student)/classbot/classroom/page.tsx`). 이름을 모르면 부르는 말은 「선생님」이다.
 * 수강 시각도 카드에 없어(`enrolledAt` 은 참여 응답에만) 빈 값이다 —
 * 화면은 빈 값이면 참여일 줄을 숨긴다.
 *
 * 그 두 칸만 놓고 보면 카탈로그 조회는 **런타임에선 죽은 코드**다. 그래도 지금 걷지 않는 이유는
 * 같은 조회가 `quickPrompts`·`currentLesson`·과목·학년·말투 폴백까지 한꺼번에 물고 있어서다 —
 * 걷는다면 `toSlot` 의 모양 전체를 함께 다시 잡아야 하고, **걷을 자리는 여기**다.
 * @param card - `GET /classbot/bots?role=student` 한 장
 * @returns 홈·목록이 그대로 그릴 수 있는 슬롯
 */
export function toSlot(card: BotCardDto): RoomSlot {
  const seeded = classBots.find((b) => b.id === card.id);
  const profile = card.profile;
  const teacherName = seeded?.teacherName ?? '';
  const organization = seeded?.organization ?? '';
  // `profile` 이 실리는 조건이 「profile 행이 있다」에서 **「붙은 봇이 있다」**로 바뀌었다(#679).
  // 그래서 봇이 붙은 반은 이제 그 봇의 등급(`bots.scope`)이 여기로 들어온다 — 아래 `?? 3` 은
  // **봇이 아예 안 붙은 반**의 자리다(그런 반은 대화 상대가 없으니 등급을 물을 데도 없다).
  const profileScope = profile && isScopeLevel(profile.scope) ? profile.scope : undefined;

  const bot: ClassBot = {
    id: card.id,
    name: card.name,
    avatarEmoji: profile?.avatarEmoji ?? seeded?.avatarEmoji ?? '🤖',
    teacherName,
    organization,
    subject: profile?.subject ?? seeded?.subject ?? '',
    grade: profile?.grade ?? seeded?.grade ?? '',
    tone: toneOf(profile?.tone) ?? seeded?.tone ?? '친근',
    greeting: profile?.greeting ?? seeded?.greeting ?? '',
    quickPrompts: seeded?.quickPrompts ?? [],
    scope: profileScope ?? seeded?.scope ?? 3,
    isLive: profile?.isLive ?? seeded?.isLive ?? false,
    ...(seeded?.currentLesson ? { currentLesson: seeded.currentLesson } : {}),
    enrolledCount: profile?.enrolledCount ?? seeded?.enrolledCount ?? 0,
  };

  return {
    bot,
    enrollment: {
      botId: card.id,
      classroomId: card.id,
      // **`card.name` 이 아니다.** #679 뒤로 그건 봇 이름이라, 여기에 쓰면 봇 이름이 반 이름 자리
      // 넷(내 수업방 제목·나가기·과제 링크·내 정보 줄)과 홈 「참여 중인 클래스」 줄까지 덮는다.
      classroomLabel: classNameOf(card),
      assignedBy: teacherName ? withHonorific(teacherName) : '선생님',
      assignedAt: '',
      via: organization,
    },
    source: 'api',
  };
}

/** `useMyRooms()` 결과 — 목록과 「아직 모른다」·「못 읽었다」를 함께 준다. */
export interface MyRoomsResult {
  rooms: RoomSlot[];
  /**
   * 아직 「참여한 방이 없다」로 단정하면 안 되는 구간 — 세션 복원 전과 첫 조회 중.
   * `useMyClassrooms` 가 세션 복원 전에는 묻지 않으므로 그 구간도 여기에 든다.
   */
  isLoading: boolean;
  /**
   * 서버 목록을 **못 읽었다**(5xx·네트워크). 이때 `rooms` 는 비어 있지만 그건 「방이 없다」가
   * 아니라 「모른다」다 — **반 목록으로 빈 상태를 가르는 화면은 이 값을 반드시 봐야 한다.**
   * 지금 그런 화면은 넷이다: 홈 · 봇 대화 · 내 수업방 · 내 정보 · 학습 기록.
   *
   * **401 은 여기 들지 않는다.** 그건 고장이 아니라 세션이 끊긴 것이고, 로그인으로 가는 중이다.
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
 * 내가 참여 중인 수업방 — 서버 행만 쓴다.
 * @returns 참여 중인 방 · 로딩 · 실패 · 재시도
 */
export function useMyRooms(): MyRoomsResult {
  const { data, isPending, error, refetch } = useMyClassrooms();

  // 화면의 목록 key 는 `enrollment.classroomId` 다 — bot == class 라 지금은 봇 id 와 같지만,
  // 봇을 반에서 떼는 날(계획 §05 bots 표) 갈리는 쪽이 이 칸이다.
  const rooms = useMemo<RoomSlot[]>(() => (data ?? []).map(toSlot), [data]);

  return {
    rooms,
    isLoading: isPending,
    isError: Boolean(error) && !isUnauthorized(error),
    retry: () => void refetch(),
  };
}
