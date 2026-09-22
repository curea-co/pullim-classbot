'use client';

import { useMemo } from 'react';

import type { ClassBot } from '@/lib/mock/classbot';
import { useMyConversationRooms } from '@/components/classbot/home/my-rooms';

/**
 * 이 봇이 학생에게 온 경로.
 *
 * - `class` — 선생님이 낸 참여 코드로 들어간 반의 봇. **과제가 여기서 오고**, 그 반의
 *   선생님이 학생의 학습을 본다.
 * - `self`  — 학생이 봇 마켓에서 담아 ADR-094가 만든 자습방. classId와 멤버십이 있어
 *   기존 SSE 대화는 쓰지만, 실제 교사 반은 아니므로 과제·교사 열람 고지는 없다.
 */
export type StudentBotSource = 'class' | 'self';

/**
 * 선생님 반의 봇 한 칸 — **단위는 반이다**(완성 설계 § 6.2 · 해소 3 · 계획 PR 5a).
 *
 * 서버가 대화를 반 단위로 저장·인가하므로(`POST/GET /classbot/classes/:classId/chat`) 챗이 고르는
 * 것은 봇이 아니라 반이다. 한 봇이 두 반에 걸려 있으면 칸도 둘이다 — 기록이 다르고 보는 선생님이
 * 다르다. `classId` 가 그 반의 pullim-api id 이고 `bot.id` 는 지금도 같은 값이지만
 * **같다고 기대하지 마라** — 카드의 탐색 키가 아직 반이라(ADR-092 open ①) `toSlot` 이 그 값을 양쪽에
 * 넣고 있을 뿐이다. 진짜 봇 id 는 이미 카드에 따로 온다(`BotCardDto.botId` · pullim-api #679).
 * *(`[2026-09-19 정정]` 종전에는 「`bots` 표가 오면 갈린다」고 적었다. 그 표는 왔는데 이 칸은 안 갈렸다 —
 * 갈린 것은 **이름**(`name` ↔ `className`)이 먼저다.)*
 */
export interface ClassBotSlot {
  source: 'class';
  bot: ClassBot;
  /** 대화 단위 — 그 반의 pullim-api class id. */
  classId: string;
  /** 반 이름 — 선택기 라벨(`classSlotLabel`). */
  classLabel: string;
}

/** ADR-094 자습방 한 칸 — 담기가 만든 반 id 로 일반 반과 같은 SSE 대화 경로를 쓴다. */
export interface SelfBotSlot {
  source: 'self';
  bot: ClassBot;
  classId: string;
  classLabel?: undefined;
}

/** 학생 화면 한 칸 — 반의 봇이거나 담은 봇. `source` 로 가른다. */
export type StudentBotSlot = ClassBotSlot | SelfBotSlot;

/**
 * 칸의 React key · URL 정체 — 일반 반과 자습방 모두 서로 다른 classId로.
 *
 * `bot.id` 를 key 로 쓰면 같은 봇이 두 반에 걸린 학생에게서 겹친다(위 `ClassBotSlot` 주석).
 * 두 접두사는 목록을 읽을 때 출처도 함께 드러내고, 이후 키 계약이 bot 단위로 다시 바뀌더라도
 * 일반 반과 자습방의 React 상태가 섞이지 않게 한다.
 * @param slot - 학생 화면 한 칸
 * @returns `class:<classId>` 또는 `self:<classId>`
 */
export function studentBotSlotKey(slot: StudentBotSlot): string {
  return slot.source === 'class' ? `class:${slot.classId}` : `self:${slot.classId}`;
}

/**
 * 반 칸의 표시 이름 — 「<반 이름> · <봇 이름>」.
 *
 * **그 「그때」가 왔다.** 종전 이 주석은 「지금은 bot == class 라 두 이름이 같아 한 번만 적는다 ·
 * `bots` 표가 오면 둘이 갈린다」로 앞날을 예고하고 있었는데, pullim-api #679 가 카드의 `name` 을
 * 봇 이름으로 옮기고 반 이름을 `className` 으로 따로 내면서 실제로 갈렸다 — 「중1 수학 QA반 ·
 * QA 수학 선생님」처럼 두 마디로 선다.
 *
 * 그래도 같으면 한 번만 적는 가지는 **남긴다.** 둘은 여전히 같아질 수 있다 —
 * 봇을 안 붙인 반은 서버가 `name` 을 반 이름으로 떨어뜨리고(#679), 교사가 봇에 반과 같은 이름을
 * 지을 수도 있다. 그때 「고2 미적분 A반 · 고2 미적분 A반」을 학생에게 보이지 않는다.
 * @param slot - 반 칸
 * @returns 선택기 칩·헤더에 쓰는 이름
 */
export function classSlotLabel(slot: ClassBotSlot): string {
  return slot.bot.name === slot.classLabel ? slot.classLabel : `${slot.classLabel} · ${slot.bot.name}`;
}

export interface StudentBotsResult {
  /** 정본 카드 순서. 일반 반과 자습방을 `isSelfStudy`로만 분류한다. */
  slots: StudentBotSlot[];
  classCount: number;
  selfCount: number;
  /** 정본 학생 카드 목록의 첫 조회 중. */
  isLoading: boolean;
  /** 정본 학생 카드 목록을 못 읽은 상태. 선택적 마켓/자기주도 요청은 이 값을 바꾸지 않는다. */
  isError: boolean;
  /** 정본 학생 카드 목록을 다시 읽기. */
  retry: () => void;
}

/**
 * 학생이 대화할 수 있는 봇 전부 — **반 봇 + 담은 봇을 한 목록으로** (계약 §5).
 *
 * 예전에는 학습 모드(`lib/store/student-mode.ts`)로 갈라 한 번에 한쪽만 보여 줬다.
 * 그 분기는 걷었다 — 학생 입장에서 둘은 「대화할 수 있는 봇」이라는 한 종류이고,
 * 갈라 두면 마켓에서 담은 봇이 **어느 화면에서도 열리지 않는 진열장**이 된다.
 *
 * 같은 봇이 일반 반과 자습방 양쪽에 있어도 classId가 다르므로 둘 다 싣는다. 기록과 교사
 * 열람 여부가 다른 대화방을 botId가 같다는 이유로 접으면 안 된다. 표시 정보도 카드에 함께
 * 오므로 채팅 목록은 선택적인 마켓 조회에 의존하지 않는다.
 * @returns 봇 목록 + 종류별 개수 + 로딩 구간
 */
export function useStudentBots(): StudentBotsResult {
  const {
    rooms: classRooms,
    isLoading: roomsLoading,
    isError: roomsError,
    retry: retryRooms,
  } = useMyConversationRooms();
  const slots = useMemo<StudentBotSlot[]>(
    () =>
      classRooms.map((room) => {
        const classId = room.enrollment.classroomId;
        return room.isSelfStudy
          ? { source: 'self' as const, bot: room.bot, classId }
          : {
              source: 'class' as const,
              bot: room.bot,
              classId,
              classLabel: room.enrollment.classroomLabel,
            };
      }),
    [classRooms],
  );

  return {
    slots,
    classCount: slots.filter((s) => s.source === 'class').length,
    selfCount: slots.filter((s) => s.source === 'self').length,
    isLoading: roomsLoading,
    // 일반 반과 자습방은 같은 정본 카드 목록이다. 선택적인 자기주도/마켓 조회 실패가
    // 일반 반 채팅 전체를 오류로 바꾸던 두 번째 실패 축은 없다.
    isError: roomsError,
    retry: retryRooms,
  };
}

/**
 * **반 봇만** — 웰빙 3면(체크인 반응 · 게이지의 봇 한 마디 · 웰빙 카드)이 쓴다.
 *
 * 담은 봇을 여기 섞지 않는다. 웰빙 코멘트는 「**선생님 반의 봇**이 학생의 컨디션에 건네는
 * 말」이고, 그 반의 교사가 학생의 학습을 보고 있다는 전제 위에 선다. 담기는 반 참여가
 * 아니어서 `enrollments` 행도 교사 관제도 따라오지 않는다(자기주도 계약 §1) — 그 봇이
 * 학생의 컨디션에 말을 건네는 자리에 설 근거가 없다.
 *
 * 종전 이름은 `useModeBots()` 였고 학습 모드별 목록을 뜻했다. 모드가 폐기되고 이 훅이
 * **반 봇 + 담은 봇**을 합쳐 돌려주게 되자, 반에 참여하지 않고 봇만 담은 학생에게도 그 봇의
 * 웰빙 코멘트가 떴다 — 그래서 이름과 범위를 함께 좁혔다.
 * 두 종류가 다 필요하면 `useStudentBots()` 를 쓴다(챗·홈이 그쪽이다).
 *
 * 단위는 **봇**이다 — 반 칸이 반마다 하나가 된 뒤(`ClassBotSlot`)에도 여기서는 같은 봇을 한 번만 돌려준다.
 * 웰빙 한 마디는 「이 봇이 건네는 말」이라 반이 둘이어도 봇이 두 번 말할 이유가 없다.
 * @returns 참여한 반의 봇 목록(봇마다 하나)
 */
export function useClassBots(): ClassBot[] {
  const { slots } = useStudentBots();
  return useMemo(() => {
    const seen = new Set<string>();
    const out: ClassBot[] = [];
    for (const s of slots) {
      if (s.source !== 'class' || seen.has(s.bot.id)) continue;
      seen.add(s.bot.id);
      out.push(s.bot);
    }
    return out;
  }, [slots]);
}
