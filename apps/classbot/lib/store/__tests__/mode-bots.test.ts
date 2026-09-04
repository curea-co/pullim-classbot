/**
 * `useStudentBots()` — 반 봇과 담은 봇을 한 목록으로 (계약 §5).
 *
 * 예전 이 파일은 학습 모드별로 「각 모드는 자기 목록만」을 지켰다. 그 분기는 걷었다 —
 * 갈라 두면 마켓에서 담은 봇이 어느 화면에서도 열리지 않는 진열장이 된다.
 * 지금 지켜야 할 규칙은 셋이다: **둘 다 실린다 · 겹치면 한 번만 · 겹치면 반이 이긴다.**
 */
import { renderHook, act, waitFor } from '@testing-library/react';

import { useStudentBots } from '../mode-bots';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import type { SelfBotRow } from '@/hooks/api/self-bots';
import type { ClassBot } from '@/lib/mock';

/*
  반 봇 소스도 **훅 경계에서** 세운다.
  종전엔 실제 스토어에 mock 코드(`MATH-2024`)로 참여시켰는데, 그건 스토어 참여만
  담는 경로다. `useStudentBots` 가 홈과 같은 `useMyRooms()` 를 보도록 바뀐 뒤로
  그 방식은 실제 화면이 쓰는 길을 더 이상 흉내내지 못한다 —
  코드로 들어간 반은 DB 에 있고 스토어엔 없기 때문이다.
*/
let classRooms: { bot: ClassBot; source: 'api' | 'local' }[] = [];
let roomsLoading = false;
jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyRooms: () => ({ rooms: classRooms, isLoading: roomsLoading }),
}));

/** 반 봇 한 칸 — 화면이 읽는 필드만 채운다. */
const classRoom = (botId: string, name: string) => ({
  bot: {
    id: botId, name, avatarEmoji: '🧑‍🏫', teacherName: '김수학 선생님',
    organization: '대치프리미엄 수학학원', subject: '수학Ⅱ', grade: '고2',
    tone: '친근' as const, greeting: '안녕!', quickPrompts: [], scope: 3 as const,
    isLive: false, enrolledCount: 1,
  } as unknown as ClassBot,
  source: 'api' as const,
});

// 담은 봇 소스는 훅 계약(계약 §3)만 알면 된다 — 저장소 내부는 이 테스트의 관심사가 아니다.
let selfRows: SelfBotRow[] = [];
let selfLoading = false;
jest.mock('@/hooks/api/self-bots', () => ({
  useMySelfBots: () => ({ data: selfLoading ? undefined : selfRows, isLoading: selfLoading, isError: false }),
}));

// 마켓 조회도 훅 경계에서 세운다 — 여기서 검증할 것은 react-query 배선이 아니라 **합치는 규칙**이다.
let marketBots: MarketplaceBotItem[] = [];
let marketPending = false;
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBots: () => ({
    data: marketPending ? undefined : { bots: marketBots },
    isPending: marketPending,
  }),
}));

/** cb_001 = 데모 코드 MATH-2024 가 데려오는 봇. 마켓에도 같은 봇이 걸려 있을 수 있다. */
const marketBot = (botId: string, name: string): MarketplaceBotItem => ({
  botId,
  name,
  avatarEmoji: '🤖',
  subject: '수학',
  grade: '중2',
  tone: '친근',
  greeting: '안녕!',
  blurb: null,
  teacherName: '박마켓 선생님',
  organization: '풀림 마켓',
  publishedAt: '2026-09-01T00:00:00.000Z',
  enrolledCount: 3,
});

beforeEach(() => {
  selfRows = [];
  selfLoading = false;
  marketBots = [];
  marketPending = false;
  classRooms = [];
  roomsLoading = false;
});

const render = () => renderHook(() => useStudentBots());

it('반 봇만 있으면 반 봇만 — 담은 봇 소스가 비어도 목록이 선다', async () => {
  classRooms = [classRoom('cb_001', '수학봇')];
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.slots.map((s) => [s.bot.id, s.source])).toEqual([['cb_001', 'class']]);
});

it('담은 봇만 있으면 담은 봇만 — 반이 없어도 대화할 봇이 생긴다', async () => {
  marketBots = [marketBot('cb_009', '마켓 수학봇')];
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  const { result } = render();
  await waitFor(() => expect(result.current.slots).toHaveLength(1));
  expect(result.current.slots[0].source).toBe('self');
  expect(result.current.slots[0].bot.name).toBe('마켓 수학봇');
  expect(result.current).toMatchObject({ classCount: 0, selfCount: 1 });
});

it('둘 다 있으면 둘 다 — 반 봇이 먼저 실린다', async () => {
  marketBots = [marketBot('cb_009', '마켓 수학봇')];
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  classRooms = [classRoom('cb_001', '수학봇')];
  const { result } = render();
  await waitFor(() => expect(result.current.slots).toHaveLength(2));
  expect(result.current.slots.map((s) => [s.bot.id, s.source])).toEqual([
    ['cb_001', 'class'],
    ['cb_009', 'self'],
  ]);
});

// 먼저 담아 두고 나중에 선생님 코드로 들어간 학생 — 한 봇이 양쪽에 다 있다.
it('겹치면 한 번만 싣고 반 관계가 이긴다', async () => {
  marketBots = [marketBot('cb_001', '마켓에 걸린 수학봇')];
  selfRows = [{ botId: 'cb_001', addedAt: '2026-09-01T09:00:00.000Z' }];
  classRooms = [classRoom('cb_001', '수학봇')];
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.slots).toHaveLength(1);
  expect(result.current.slots[0].source).toBe('class');
  // 반 쪽 봇이 실렸다 — 마켓 행의 이름이 아니라 카탈로그 이름이다.
  expect(result.current.slots[0].bot.name).toBe('수학봇');
});

/*
  이 자리에 있던 「게시가 내려간 봇은 목록에서 빠진다」는 **뒤집혔다.**
  빼면 학생이 `my-bots` 에서 「담아 둔 봇은 그대로 남아 있어요」를 읽고도 그 봇과
  대화할 수 없는 반쪽 상태가 된다 — 아래 「공유가 내려간 봇」 묶음이 새 규칙이다.
*/
it('게시가 내려가도 담은 기록 자체는 건드리지 않는다', async () => {
  marketBots = []; // 마켓에 없다
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  // 담은 기록은 저장소의 것이고 마켓 조회가 지우지 않는다 — 그래서 칸이 남는다.
  expect(result.current.slots.map((x) => x.bot.id)).toEqual(['cb_009']);
  expect(result.current.selfCount).toBe(1);
});

it('담은 기록이 있는데 마켓이 아직 안 왔으면 로딩 — 빈 목록으로 단정하지 않는다', () => {
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  marketPending = true;
  const { result } = render();
  expect(result.current.isLoading).toBe(true);
});

it('담은 봇 소스가 하이드레이션 전이면 로딩', () => {
  selfLoading = true;
  const { result } = render();
  expect(result.current.isLoading).toBe(true);
});

it('담은 기록이 없으면 마켓을 기다리지 않는다 — 반 봇만으로 화면을 확정한다', () => {
  marketPending = true; // 마켓은 아직 안 왔지만
  classRooms = [classRoom('cb_001', '수학봇')];
  const { result } = render();
  expect(result.current.isLoading).toBe(false);
  expect(result.current.slots).toHaveLength(1);
});

/*
  ── 공유가 내려간 봇 ────────────────────────────────────────
  담기와 공유는 별개다. 선생님이 마켓에서 내려도 이미 담아 간 학생의 봇은 계속 돈다
  (청사진 §2). `my-bots` 화면이 학생에게 그렇게 약속하고 있으므로
  (「담아 둔 봇은 그대로 남아 있어요」), 대화 목록에서 빠지면 그 약속이 거짓이 된다.
*/
it('공유가 내려가도 담은 봇은 목록에 남는다 — 시드 봇이면 이름까지 지킨다', async () => {
  marketBots = []; // 마켓 조회는 끝났고(pending=false) 그 봇이 없다 = 공유가 내려갔다
  selfRows = [{ botId: 'cb_001', addedAt: '2026-09-01T09:00:00.000Z' }];
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.slots).toHaveLength(1);
  expect(result.current.slots[0].source).toBe('self');
  // 시드 카탈로그가 이름을 갖고 있으므로 「알 수 없는 봇」으로 떨어지지 않는다.
  expect(result.current.slots[0].bot.id).toBe('cb_001');
  expect(result.current.slots[0].bot.name).not.toBe('지금은 마켓에 없는 봇');
});

it('카탈로그에도 없는 봇이면 이름 자리에 상태를 적고, 그래도 대화는 열어 둔다', async () => {
  marketBots = [];
  selfRows = [{ botId: 'bot_teacher_made_42', addedAt: '2026-09-01T09:00:00.000Z' }];
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.slots).toHaveLength(1);
  // `my-bot-card.tsx` 와 **같은 문자열** — 두 화면이 같은 봇을 다르게 부르면 안 된다.
  expect(result.current.slots[0].bot.name).toBe('지금은 마켓에 없는 봇');
  expect(result.current.slots[0].bot.id).toBe('bot_teacher_made_42');
});

it('마켓이 아직 안 온 구간에는 자리표시자를 만들지 않는다 — 진짜 이름이 오기 전에 번쩍이지 않게', () => {
  marketPending = true;
  selfRows = [{ botId: 'bot_teacher_made_42', addedAt: '2026-09-01T09:00:00.000Z' }];
  const { result } = render();
  expect(result.current.isLoading).toBe(true);
  expect(result.current.slots).toHaveLength(0);
});
