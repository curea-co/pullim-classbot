/** ADR-094 교사 마켓 — 공식 봇 둘러보기만 남는다. */
import { render, screen } from '@testing-library/react';

import type { MarketplaceBotItem } from '@/hooks/api/types';
import { MarketplaceWorkspace } from '../marketplace-workspace';

const officialBot: MarketplaceBotItem = {
  botId: 'official-math',
  name: '수학 마스터',
  avatarEmoji: '📐',
  subject: '수학',
  grade: '초5~고1',
  tone: '차분',
  greeting: '안녕! 수학을 같이 풀어 보자.',
  scope: 4,
  blurb: '개념을 차근차근 짚어 줘요.',
  teacherName: '풀림 공식',
  organization: '풀림',
  publishedAt: '2026-09-20T00:00:00.000Z',
  enrolledCount: 0,
  isOfficial: true,
};

let bots: MarketplaceBotItem[] = [];
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBots: () => ({
    data: { bots },
    error: null,
    isError: false,
    isPending: false,
  }),
}));

beforeEach(() => {
  bots = [];
});

it('교사도 정본 공식 봇 목록을 둘러본다', () => {
  bots = [officialBot];
  render(<MarketplaceWorkspace />);

  expect(screen.getByTestId('marketplace-list')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '수학 마스터 봇 소개 보기' })).toHaveAttribute(
    'href',
    '/teacher/marketplace/official-math',
  );
});

it('ADR-094 범위 밖인 「내 봇 공유」·게시 UI를 그리지 않는다', () => {
  bots = [officialBot];
  render(<MarketplaceWorkspace />);

  expect(screen.queryByTestId('my-bot-sharing')).not.toBeInTheDocument();
  expect(screen.queryByText('내 봇 공유')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /공유하기|게시/ })).not.toBeInTheDocument();
});

it('빈 목록은 공식 봇 카탈로그의 빈 상태로 안내한다', () => {
  render(<MarketplaceWorkspace />);

  expect(screen.getByTestId('marketplace-empty')).toHaveTextContent('아직 공개된 봇이 없어요');
  expect(screen.getByTestId('marketplace-empty')).toHaveTextContent('풀림 공식 봇');
});
