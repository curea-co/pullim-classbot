'use client';

import { useMemo } from 'react';

import { useMarketplaceBots } from '@/hooks/api/marketplace';
import { useMySelfBots } from '@/hooks/api/self-bots';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import { classBots as botCatalog, type ClassBot } from '@/lib/mock/classbot';
import { useMyRooms } from '@/components/classbot/home/my-rooms';

/**
 * 이 봇이 학생에게 온 경로.
 *
 * - `class` — 선생님이 낸 참여 코드로 들어간 반의 봇. **과제가 여기서 오고**, 그 반의
 *   선생님이 학생의 학습을 본다.
 * - `self`  — 학생이 봇 마켓에서 직접 담은 봇. 대화만 있고 반 관계는 없다 —
 *   `enrollments` 행이 없으므로 과제도, 관제소 노출도, 참여 인원 집계도 따라오지 않는다
 *   (계약 §1).
 */
export type StudentBotSource = 'class' | 'self';

/** 학생 화면 한 칸 — 봇 + 그 봇이 어느 경로로 왔는지. */
export interface StudentBotSlot {
  bot: ClassBot;
  source: StudentBotSource;
}

export interface StudentBotsResult {
  /** 반 봇 먼저, 그다음 담은 봇(담은 순). */
  slots: StudentBotSlot[];
  classCount: number;
  selfCount: number;
  /**
   * 아직 「봇이 없다」고 단정하면 안 되는 구간.
   *
   * 담은 봇은 **두 소스가 다 와야** 목록에 오른다 — 담은 기록(로컬 하이드레이션)과
   * 그 봇의 실제 정보(마켓 조회). 하나라도 안 왔는데 빈 상태를 그리면, 담은 봇이 있는
   * 학생에게 「아무것도 없어요」가 한 번 번쩍인다.
   */
  isLoading: boolean;
}

/** 봇 성격 기본값 — 마켓 행이 알려주지 않는 칸. `components/classbot/home/my-rooms.ts` 와 같은 규약. */
const UNKNOWN_BOT_DEFAULTS = {
  quickPrompts: [],
  scope: 3,
  isLive: false,
} satisfies Partial<ClassBot>;

/**
 * 마켓 한 칸을 화면이 쓰는 봇으로 옮긴다.
 *
 * 시드 봇(`cb_001`…)은 카탈로그 쪽이 빠른 질문·커리큘럼까지 갖고 있어 그 위에 덮는다.
 * 다만 **과목·학년·선생님·소속·인삿말은 마켓 값이 이긴다** — 카탈로그는 데모 고정값이고
 * 마켓 행이 지금 게시된 사실이라서다(`my-rooms.ts` 의 `toSlot` 과 같은 판단).
 * @param item - `GET /api/marketplace/bots` 한 칸
 * @returns 챗·웰빙이 그대로 그릴 수 있는 봇
 */
function toClassBot(item: MarketplaceBotItem): ClassBot {
  const seeded = botCatalog.find((b) => b.id === item.botId);
  const character: Pick<ClassBot, 'quickPrompts' | 'scope' | 'isLive' | 'currentLesson'> =
    seeded ?? UNKNOWN_BOT_DEFAULTS;
  return {
    ...character,
    id: item.botId,
    name: item.name,
    avatarEmoji: item.avatarEmoji,
    teacherName: item.teacherName,
    organization: item.organization,
    subject: item.subject,
    grade: item.grade,
    tone: item.tone,
    greeting: item.greeting,
    enrolledCount: item.enrolledCount,
  };
}

/**
 * 학생이 대화할 수 있는 봇 전부 — **반 봇 + 담은 봇을 한 목록으로** (계약 §5).
 *
 * 예전에는 학습 모드(`lib/store/student-mode.ts`)로 갈라 한 번에 한쪽만 보여 줬다.
 * 그 분기는 걷었다 — 학생 입장에서 둘은 「대화할 수 있는 봇」이라는 한 종류이고,
 * 갈라 두면 마켓에서 담은 봇이 **어느 화면에서도 열리지 않는 진열장**이 된다.
 *
 * 같은 봇이 양쪽에 다 있을 수 있다 — 먼저 담아 두고 나중에 선생님 코드로 들어간 경우다.
 * 그때는 **한 번만** 싣고 **반 관계가 이긴다**: 그 봇에서 과제가 오고 선생님이 보고 있다는
 * 사실이 「내가 담았다」보다 학생이 알아야 할 것이라서다.
 *
 * 담은 봇의 정보는 마켓 조회에서 온다. 게시가 내려간 봇은 조회에 없으므로 목록에서
 * 조용히 빠진다 — 담은 기록은 그대로 두고(계약 §4 저장소는 담은 사실만 갖는다) 화면에서만 빠진다.
 * @returns 봇 목록 + 종류별 개수 + 로딩 구간
 */
export function useStudentBots(): StudentBotsResult {
  /*
    반 봇은 **홈과 같은 출처**(`useMyRooms`)에서 온다.
    예전엔 `useMyClassBots()`(zustand 스토어)만 봤는데, 그 스토어는 **mock 참여만** 담는다.
    참여 코드로 실제 반에 들어간 학생은 행이 DB 에 생기므로 스토어가 비어 있고,
    그 결과 **홈은 「참여 중인 클래스 5곳」인데 대화는 「아직 대화할 봇이 없어요」** 가 됐다 —
    같은 학생, 같은 순간에. 코드로 들어간 반의 봇과 말을 못 하면 들어간 의미가 없다.
  */
  const { rooms: classRooms, isLoading: roomsLoading } = useMyRooms();
  const selfBots = useMySelfBots();
  const market = useMarketplaceBots();

  const marketById = useMemo(
    () => new Map((market.data?.bots ?? []).map((b) => [b.botId, b])),
    [market.data],
  );

  // 반 목록은 스토어에서 매 렌더 새 배열로 온다(`bridge()`) — id 문자열로 눌러 memo 를 안정시킨다.
  const classKey = classRooms.map((c) => c.bot.id).join('|');

  const slots = useMemo<StudentBotSlot[]>(() => {
    const out: StudentBotSlot[] = classRooms.map((c) => ({ bot: c.bot, source: 'class' }));
    const seen = new Set(out.map((s) => s.bot.id));

    // 담은 순서대로 — 담을 때마다 기존 칸이 자리를 바꾸지 않게.
    const added = [...(selfBots.data ?? [])].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    for (const row of added) {
      if (seen.has(row.botId)) continue; // 반 관계가 이긴다
      const item = marketById.get(row.botId);
      if (!item) continue; // 게시가 내려갔거나 마켓 조회가 아직 안 왔다
      seen.add(row.botId);
      out.push({ bot: toClassBot(item), source: 'self' });
    }
    return out;
    // classRooms 는 매 렌더 새 배열이라 deps 에 두면 memo 가 무의미해진다 — 내용 키(classKey)로 대신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classKey, selfBots.data, marketById]);

  return {
    slots,
    classCount: slots.filter((s) => s.source === 'class').length,
    selfCount: slots.filter((s) => s.source === 'self').length,
    // 담은 기록이 하나도 없으면 마켓 조회를 기다릴 이유가 없다 — 반 봇만으로 화면을 확정한다.
    // 반 목록도 이제 서버에서 오므로 그 구간을 함께 기다린다 — 안 그러면 코드로 들어간
    // 학생에게 「대화할 봇이 없어요」가 한 번 번쩍이고 나서 목록이 채워진다.
    isLoading:
      roomsLoading ||
      selfBots.isLoading ||
      ((selfBots.data?.length ?? 0) > 0 && market.isPending),
  };
}

/**
 * 봇 목록만 필요한 화면용 얇은 래퍼(웰빙 체크인·게이지·봇 한 마디).
 * 종류 구분이 필요하면 `useStudentBots()` 를 쓴다.
 * @returns 반 봇 + 담은 봇을 합친 목록
 */
export function useModeBots(): ClassBot[] {
  return useStudentBots().slots.map((s) => s.bot);
}
