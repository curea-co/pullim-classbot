/**
 * 「내가 담은 봇」 화면 — **마켓이 막혀도 담은 목록은 지우지 않는다.**
 *
 * 담은 사실은 내 저장소(`useMySelfBots`)의 것이고 마켓은 이름표만 붙인다. 예전엔 마켓이
 * 401 이면 로그인 안내가 목록을 통째로 덮어서, 같은 봇과 **대화는 되는데 이 화면에서는
 * 안 보이는** 갈린 상태가 생겼다(`lib/store/mode-bots.ts` 는 401 에도 담은 봇을 싣는다).
 * 두 화면이 같은 저장소를 읽으니 답도 같아야 한다 — 이 파일이 그 계약을 못박는다.
 */
import { render, screen } from '@testing-library/react';

import MyBotsPage from '../page';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import type { SelfBotRow } from '@/hooks/api/self-bots';

// 담은 목록 — 저장소 내부가 아니라 훅 계약(계약 §3)만 세운다.
let selfRows: SelfBotRow[] = [];
let selfLoading = false;
jest.mock('@/hooks/api/self-bots', () => ({
  useMySelfBots: () => ({
    data: selfLoading ? undefined : selfRows,
    isLoading: selfLoading,
    isError: false,
  }),
  useRemoveSelfBot: () => ({ mutate: jest.fn(), isPending: false }),
}));

// 마켓 — 이름표 공급원. 여기서 검증할 것은 react-query 배선이 아니라 **막혔을 때의 규약**이다.
let marketBots: MarketplaceBotItem[] = [];
let marketError: ApiClientError | null = null;
let marketPending = false;
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBots: () => ({
    data: marketPending || marketError ? undefined : { bots: marketBots },
    error: marketError,
    isError: Boolean(marketError),
    isPending: marketPending,
    refetch: jest.fn(),
  }),
}));

beforeEach(() => {
  selfRows = [];
  selfLoading = false;
  marketBots = [];
  marketError = null;
  marketPending = false;
});

const added = (botId: string): SelfBotRow => ({
  botId,
  addedAt: '2026-09-01T09:00:00.000Z',
});

it('마켓이 401 이어도 담은 봇이 있으면 목록을 그린다 — 대화되는 봇이 여기서 사라지지 않게', () => {
  selfRows = [added('cb_001')];
  marketError = new ApiClientError('로그인이 필요해요.', 401, 'AUTH_REQUIRED');

  render(<MyBotsPage />);

  expect(screen.getByTestId('my-bots-list')).toBeInTheDocument();
  expect(screen.queryByTestId('my-bots-signin')).not.toBeInTheDocument();
  // 목록을 지우는 대신, 이름을 못 붙인 까닭만 한 줄로 적는다.
  const notice = screen.getByTestId('my-bots-label-notice').textContent ?? '';
  expect(notice).toContain('아직 준비 중');
  // 로그인해도 이 401 은 그대로다 — 하라고 시킬 수 없는 일을 시키지 않는다.
  expect(notice).not.toContain('로그인');
});

it('마켓이 401 이어도 시드 봇은 카탈로그가 이름을 되찾아 준다', () => {
  selfRows = [added('cb_001')];
  marketError = new ApiClientError('로그인이 필요해요.', 401, 'AUTH_REQUIRED');

  render(<MyBotsPage />);

  // 이름 자리에 상태(「지금은 마켓에 없는 봇」)가 아니라 진짜 이름이 온다.
  expect(screen.queryByText('지금은 마켓에 없는 봇')).not.toBeInTheDocument();
});

it('마켓이 오류여도 목록은 남는다 — 까닭만 달라진다', () => {
  selfRows = [added('cb_001')];
  marketError = new ApiClientError('서버 오류', 500, 'INTERNAL');

  render(<MyBotsPage />);

  expect(screen.getByTestId('my-bots-list')).toBeInTheDocument();
  expect(screen.getByTestId('my-bots-label-notice').textContent).toContain('읽어 오지 못했어요');
});

it('담은 것도 없고 마켓도 401 이면 빈 상태가 「마켓이 준비 중」까지 말한다', () => {
  selfRows = [];
  marketError = new ApiClientError('로그인이 필요해요.', 401, 'AUTH_REQUIRED');

  render(<MyBotsPage />);

  const box = screen.getByTestId('my-bots-signin');
  expect(box).toBeInTheDocument();
  expect(screen.queryByTestId('my-bots-list')).not.toBeInTheDocument();
  /*
    이 401 은 **로그인해도 안 풀린다** — 마켓은 같은 오리진 route handler 가 답하고 그
    핸들러에 OS 세션을 풀 열쇠가 없다(`lib/current-user.ts`). 그래서 이 갈래는 로그인한
    사람에게도 뜬다. 여기에 「로그인하면 담은 봇을 볼 수 있어요」를 적으면 로그인한 사람을
    로그인 화면으로 보내 놓고 아무 일도 일어나지 않게 만든다 — 그 문구를 못 박아 막는다.
  */
  expect(box.textContent).not.toContain('로그인');
  expect(box.textContent).toContain('아직 준비 중');
});

it('마켓이 답하면 담은 것이 없을 때 그냥 빈 상태 — 마켓 이야기를 덧붙이지 않는다', () => {
  selfRows = [];
  marketBots = [];

  render(<MyBotsPage />);

  expect(screen.getByTestId('my-bots-empty')).toBeInTheDocument();
});

it('마켓이 아직 안 왔으면 뼈대만 — 이름이 늦게 바뀌어 번쩍이지 않게', () => {
  selfRows = [added('cb_001')];
  marketPending = true;

  render(<MyBotsPage />);

  expect(screen.queryByTestId('my-bots-list')).not.toBeInTheDocument();
  expect(screen.queryByTestId('my-bots-empty')).not.toBeInTheDocument();
});
