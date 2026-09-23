/** pullim-api 정본 마켓 상세 상태. */
import { ApiError } from '@pullim-classbot/api-client';
import { render, screen } from '@testing-library/react';

import type { MarketplaceBotItem } from '@/hooks/api/types';
import { MarketplaceBotDetail } from '../marketplace-bot-detail';

let queryError: ApiError | null = null;
let queryBot: MarketplaceBotItem | null = null;
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBot: () => ({
    data: queryBot ? { bot: queryBot } : undefined,
    error: queryError,
    isError: Boolean(queryError),
    isPending: false,
  }),
}));

jest.mock('../self-add-button', () => ({
  SelfAddButton: () => null,
}));

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

beforeEach(() => {
  queryError = null;
  queryBot = null;
});

function renderDetail(viewer: 'student' | 'teacher') {
  return render(
    <MarketplaceBotDetail
      botId="official-math"
      backHref={viewer === 'student' ? '/classbot/discover' : '/teacher/marketplace'}
      backLabel="봇 마켓"
      viewer={viewer}
    />,
  );
}

it('404 `BOT_NOT_FOUND`는 서버 원문 대신 안내형 비가용 상태로 그린다', () => {
  queryError = new ApiError('BOT_NOT_FOUND', 404, 'BOT_NOT_FOUND');
  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-unavailable')).toBeInTheDocument();
  expect(screen.queryByText('BOT_NOT_FOUND')).not.toBeInTheDocument();
  expect(screen.queryByTestId('marketplace-detail-error')).not.toBeInTheDocument();
});

it('5xx 오류는 장애 카드로 그린다', () => {
  queryError = new ApiError('서버 오류', 500);
  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-error')).toHaveTextContent('서버 오류');
});

it('공식 봇은 사람 소유자·게시일 대신 풀림 공식 배지를 그린다', () => {
  queryBot = officialBot;
  renderDetail('teacher');

  expect(screen.getAllByText(/풀림 공식/).length).toBeGreaterThan(0);
  expect(screen.queryByText('만든 선생님')).not.toBeInTheDocument();
  expect(screen.queryByText('공개한 날')).not.toBeInTheDocument();
});

it('교사에게는 게시 UI 없이 수업방 활용 길만 안내한다', () => {
  queryBot = officialBot;
  renderDetail('teacher');

  expect(screen.getByText('풀림 공식 봇을 수업에 활용해 보세요')).toBeInTheDocument();
  expect(screen.queryByText(/게시|공유/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '내 수업방으로 가기' })).toHaveAttribute(
    'href',
    '/teacher/classroom',
  );
});

it('학생에게는 담기가 전용 공간을 만든다고 안내한다', () => {
  queryBot = officialBot;
  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-self-add')).toHaveTextContent('전용 공간');
  expect(screen.getByTestId('marketplace-detail-self-add')).toHaveTextContent('참여 코드');
});
