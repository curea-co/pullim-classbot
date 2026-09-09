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
 * 마켓이 이 봇을 모를 때 — 그래도 대화는 되게 한다.
 *
 * 두 경우에 온다: ① 선생님이 공유를 내렸다 ② 마켓 조회가 401·오류로 끝났다(비로그인 데모).
 * 둘 다 **담은 사실 자체는 살아 있다.** 담은 목록(`SelfBotRow`)에는 `{ botId, addedAt }`
 * 두 칸뿐이라 이름을 알 데가 없으므로, 시드 카탈로그에 있으면 그것을 쓰고 없으면
 * 이름 자리에 **상태**를 적는다 — `my-bot-card.tsx` 가 쓰는 말과 **같은 문자열**이다.
 * 두 화면이 같은 봇을 다른 이름으로 부르면 안 된다.
 *
 * 「불러오지 못했어요」로 적지 않는 이유도 그 파일과 같다 — 실패한 게 아니라 찾을 자리에
 * 없는 것이고, 봇은 멀쩡하다.
 * @param botId - 담은 봇 id (`class_bots.id`)
 * @returns 챗·웰빙이 그대로 그릴 수 있는 봇
 */
function fallbackBot(botId: string): ClassBot {
  // 시드 봇(`cb_001`…)은 카탈로그가 전부 갖고 있다 — 비로그인 데모가 여기서 살아난다.
  const seeded = botCatalog.find((b) => b.id === botId);
  if (seeded) return seeded;
  return {
    ...UNKNOWN_BOT_DEFAULTS,
    id: botId,
    name: '지금은 마켓에 없는 봇',
    avatarEmoji: '🤖',
    teacherName: '',
    organization: '',
    subject: '',
    grade: '',
    tone: '친근',
    greeting: '안녕! 무엇이 궁금해?',
    enrolledCount: 0,
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
 * 담은 봇의 표시 정보(이름·아바타·과목)는 마켓 조회에서 온다. 그런데 **표시 정보가 없다고
 * 봇을 목록에서 빼지는 않는다** — 공유가 내려가도 이미 담아 간 학생의 봇은 계속 돈다는 것이
 * 설계고(청사진 §2), 담기와 공유는 별개다. 여기서 빼면 학생은 `/classbot/my-bots` 에서
 * 「담아 둔 봇은 그대로 남아 있어요」를 읽고도 **그 봇과 대화할 수 없는** 반쪽 상태가 된다.
 * 그래서 마켓에 없으면 `fallbackBot()` 으로 **아는 것만 채워** 싣는다
 * (`app/(student)/classbot/my-bots/my-bot-card.tsx` 와 같은 말·같은 판단).
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
  // 「아직 안 왔다」와 「와 봤더니 없더라」를 가르는 값. 앞은 기다리고, 뒤는 fallback 이다.
  const marketPending = market.isPending;

  const slots = useMemo<StudentBotSlot[]>(() => {
    const out: StudentBotSlot[] = classRooms.map((c) => ({ bot: c.bot, source: 'class' }));
    const seen = new Set(out.map((s) => s.bot.id));

    // 담은 순서대로 — 담을 때마다 기존 칸이 자리를 바꾸지 않게.
    const added = [...(selfBots.data ?? [])].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    for (const row of added) {
      if (seen.has(row.botId)) continue; // 반 관계가 이긴다
      const item = marketById.get(row.botId);
      // 마켓이 아직 답하지 않은 구간에는 자리표시자를 만들지 않는다 — 그 구간은 아래
      // `isLoading` 이 이미 들고 있어서, 여기서 채우면 진짜 이름이 오기 전에
      // 「지금은 마켓에 없는 봇」이 한 번 번쩍인다.
      if (!item && marketPending) continue;
      seen.add(row.botId);
      out.push({ bot: item ? toClassBot(item) : fallbackBot(row.botId), source: 'self' });
    }
    return out;
    // classRooms 는 매 렌더 새 배열이라 deps 에 두면 memo 가 무의미해진다 — 내용 키(classKey)로 대신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classKey, selfBots.data, marketById, marketPending]);

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
