/**
 * `useStudentBots()` — 반 봇과 담은 봇을 한 목록으로 (계약 §5).
 *
 * 예전 이 파일은 학습 모드별로 「각 모드는 자기 목록만」을 지켰다. 그 분기는 걷었다 —
 * 갈라 두면 마켓에서 담은 봇이 어느 화면에서도 열리지 않는 진열장이 된다.
 * 지금 지켜야 할 규칙은 셋이다: **둘 다 실린다 · 겹치면 한 번만 · 겹치면 반이 이긴다.**
 */
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useClassBots, useStudentBots } from '../mode-bots';
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
let roomsError = false;
const retryRooms = jest.fn();
jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyRooms: () => ({
    rooms: classRooms,
    isLoading: roomsLoading,
    isError: roomsError,
    retry: retryRooms,
  }),
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
let selfError = false;
jest.mock('@/hooks/api/self-bots', () => ({
  // 무효화 키는 실제 모듈과 **같은 값**이어야 한다 — `retry` 가 이 키로 다시 읽는다.
  selfBotKeys: { mine: ['self-bots'] as const },
  useMySelfBots: () => ({
    data: selfLoading || selfError ? undefined : selfRows,
    isLoading: selfLoading,
    isError: selfError,
  }),
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

/**
 * 테스트 하나가 쓰는 QueryClient.
 *
 * `useStudentBots()` 는 `useQueryClient()` 로 담은 봇 쿼리를 다시 읽으므로 provider 가
 * 있어야 한다(종전엔 세 소스를 다 mock 해서 없이도 돌았다).
 */
let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  selfRows = [];
  selfLoading = false;
  selfError = false;
  marketBots = [];
  marketPending = false;
  classRooms = [];
  roomsLoading = false;
  roomsError = false;
  retryRooms.mockClear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});

const render = () => renderHook(() => useStudentBots(), { wrapper: Wrapper });

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

/*
  웰빙 3면(체크인 반응 · 게이지의 봇 한 마디 · 웰빙 카드)은 **반 봇만** 읽어야 한다.
  웰빙 코멘트는 「선생님 반의 봇이 학생의 컨디션에 건네는 말」이고 그 반의 교사가 학습을
  본다는 전제 위에 선다 — 담기는 반 참여가 아니어서 그 관계가 없다(계약 §1).
  종전 `useModeBots()` 가 둘을 합쳐 돌려주면서, 반 없이 봇만 담은 학생에게도 그 봇의 웰빙
  코멘트가 떴다.
*/
it('useClassBots 는 담은 봇을 섞지 않는다 — 웰빙은 반 봇만 읽는다', () => {
  marketBots = [marketBot('cb_009', '마켓 영어봇')];
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  classRooms = [classRoom('cb_001', '수학봇')];

  const both = renderHook(() => useStudentBots(), { wrapper: Wrapper });
  expect(both.result.current.slots.map((s) => s.bot.id)).toEqual(['cb_001', 'cb_009']);

  const classOnly = renderHook(() => useClassBots(), { wrapper: Wrapper });
  expect(classOnly.result.current.map((b) => b.id)).toEqual(['cb_001']);
});

it('반이 없고 담은 봇만 있으면 useClassBots 는 빈 목록이다', () => {
  marketBots = [marketBot('cb_009', '마켓 영어봇')];
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  classRooms = [];

  const { result } = renderHook(() => useClassBots(), { wrapper: Wrapper });
  expect(result.current).toEqual([]);
});

// 교사가 봇 이름·아바타를 고치면 그 갱신이 챗·홈까지 와야 한다.
// 종전 memo 키는 **봇 id 만** 이은 문자열이라, id 가 같으면 이름이 바뀐 응답을 흘려보냈다.
it('봇 id 가 같아도 이름·아바타가 바뀌면 목록이 따라온다', () => {
  classRooms = [classRoom('cb_001', '수학봇')];
  const { result, rerender } = render();
  expect(result.current.slots[0].bot.name).toBe('수학봇');

  const renamed = classRoom('cb_001', '미적분봇');
  renamed.bot = { ...renamed.bot, avatarEmoji: '📐' } as typeof renamed.bot;
  classRooms = [renamed];
  rerender();

  expect(result.current.slots[0].bot.name).toBe('미적분봇');
  expect(result.current.slots[0].bot.avatarEmoji).toBe('📐');
});

// 한 선생님이 「중2 A반」·「중2 B반」에 같은 봇을 걸어 둔 학생 — 반은 둘, 봇은 하나다.
// `useMyRooms()` 는 그 두 반을 일부러 다 남긴다(목록 단위가 반이라 그게 맞다). 그러나 챗의
// 단위는 봇이라, 그대로 옮기면 같은 봇 버튼이 두 개 뜨고 `bot.id` React key 까지 겹친다.
it('같은 봇으로 반이 둘이어도 대화 상대는 하나다', () => {
  marketBots = [];
  selfRows = [];
  classRooms = [classRoom('cb_001', '수학봇'), classRoom('cb_001', '수학봇')];
  const { result } = render();
  expect(result.current.slots).toHaveLength(1);
  expect(result.current.slots[0].bot.id).toBe('cb_001');
  expect(result.current.classCount).toBe(1);
  // key 로 쓰이는 값이 유일해야 한다 — 중복이면 React 가 같은 자리를 두 번 그린다.
  const ids = result.current.slots.map((s) => s.bot.id);
  expect(new Set(ids).size).toBe(ids.length);
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

/* ── 못 읽은 것을 「없다」로 그리지 않는다 ──────────────────────────────────
 * 담은 봇의 출처가 서버로 갈리면서 `useMySelfBots().isError` 에 처음으로 진짜 값이
 * 들어왔다. localStorage 시절엔 실패할 데가 없어 항상 false 였고, 그래서 이 훅이 그 값을
 * 안 보고 있었다 — 그대로 두면 5xx 한 번에 담아 둔 봇이 통째로 사라진 것처럼 보인다.
 * ------------------------------------------------------------------------ */

it('담은 봇을 못 읽으면 「봇이 없다」가 아니라 isError 다 — 반 봇이 멀쩡해도', async () => {
  classRooms = [classRoom('cb_001', '수학봇')];
  selfError = true;
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  // 반 봇은 그대로 실린다 — 못 읽은 것은 담은 봇 쪽이다.
  expect(result.current.slots.map((s) => s.bot.id)).toEqual(['cb_001']);
  // 그리고 화면이 「이게 전부」라고 단정하지 않도록 오류를 싣는다.
  expect(result.current.isError).toBe(true);
});

it('반도 담은 봇도 못 읽으면 빈 목록 + isError — 데이터 유실처럼 보이지 않게', async () => {
  roomsError = true;
  selfError = true;
  const { result } = render();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.slots).toHaveLength(0);
  expect(result.current.isError).toBe(true);
});

it('retry 는 반 목록과 담은 봇을 **둘 다** 다시 읽는다', async () => {
  roomsError = true;
  selfError = true;
  const invalidate = jest.spyOn(
    // 같은 client 인스턴스를 봐야 호출이 잡힌다.
    queryClient,
    'invalidateQueries',
  );
  const { result } = render();
  await waitFor(() => expect(result.current.isError).toBe(true));

  result.current.retry();

  expect(retryRooms).toHaveBeenCalledTimes(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['self-bots'] });
});

it('비로그인 데모는 이 값으로 빨개지지 않는다 — 서버를 아예 부르지 않아 isError 가 false 다', async () => {
  // 훅이 데모에서 주는 모양: 로컬 목록 + isError false.
  marketBots = [marketBot('cb_009', '마켓 수학봇')];
  selfRows = [{ botId: 'cb_009', addedAt: '2026-09-01T09:00:00.000Z' }];
  selfError = false;
  const { result } = render();
  await waitFor(() => expect(result.current.slots).toHaveLength(1));
  expect(result.current.isError).toBe(false);
});
