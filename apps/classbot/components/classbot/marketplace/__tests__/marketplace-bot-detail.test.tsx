/**
 * 봇 상세 — **내려간 봇의 404 는 고장이 아니다.**
 *
 * 이 라우트의 404 는 「없는 주소」가 아니라 「지금은 공개돼 있지 않은 봇」이라는 정상
 * 응답이다(공유가 내려갔거나 아직 안 걸린 봇). 빨간 장애 카드로 그리면 흔한 상태를
 * 서비스 고장으로 오인하게 만들고, 제목 밑 설명(「지금은 이 봇을 볼 수 없어요」)과도
 * 어긋난다. 5xx 만 장애로 남는다.
 *
 * 안내 문구는 보는 사람에 따라 갈린다 — **교사는 담지 않는다.**
 */
import { render, screen } from '@testing-library/react';

import { MarketplaceBotDetail } from '../marketplace-bot-detail';
import { ApiClientError } from '@/lib/api/client-fetch';

let queryError: ApiClientError | null = null;
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBot: () => ({
    data: undefined,
    error: queryError,
    isError: Boolean(queryError),
    isPending: false,
  }),
}));

// 담기 버튼은 저장소를 물고 있어 이 테스트의 관심사가 아니다 — 상태 분기만 본다.
jest.mock('../self-add-button', () => ({
  SelfAddButton: () => null,
}));

beforeEach(() => {
  queryError = null;
});

const renderDetail = (viewer: 'student' | 'teacher') =>
  render(
    <MarketplaceBotDetail
      botId="cb_001"
      backHref="/classbot/discover"
      backLabel="봇 마켓"
      viewer={viewer}
    />,
  );

it('404 는 안내형 비가용 상태로 — 빨간 장애 카드로 그리지 않는다', () => {
  queryError = new ApiClientError('찾을 수 없어요.', 404, 'NOT_FOUND');

  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-unavailable')).toBeInTheDocument();
  expect(screen.queryByTestId('marketplace-detail-error')).not.toBeInTheDocument();
});

it('404 문구에 서버 원문을 싣지 않는다 — 비가용은 우리가 하는 말이다', () => {
  queryError = new ApiClientError('찾을 수 없어요.', 404, 'NOT_FOUND');

  renderDetail('student');

  expect(screen.queryByText('찾을 수 없어요.')).not.toBeInTheDocument();
});

it('학생에게는 담아 둔 봇이 계속 돈다고 알린다', () => {
  queryError = new ApiClientError('찾을 수 없어요.', 404, 'NOT_FOUND');

  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-unavailable').textContent).toContain(
    '이미 담아 둔 봇이라면',
  );
});

it('교사에게는 담기 이야기를 하지 않는다 — 교사는 담지 않는다', () => {
  queryError = new ApiClientError('찾을 수 없어요.', 404, 'NOT_FOUND');

  renderDetail('teacher');

  const box = screen.getByTestId('marketplace-detail-unavailable');
  expect(box.textContent).not.toContain('담아 둔');
  expect(box.textContent).toContain('다시 공유하면');
});

it('5xx 는 그대로 장애 카드 — 이건 진짜 고장이다', () => {
  queryError = new ApiClientError('서버 오류', 500, 'INTERNAL');

  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-error')).toBeInTheDocument();
  expect(screen.queryByTestId('marketplace-detail-unavailable')).not.toBeInTheDocument();
});

it('401 은 로그인 안내 — 404 분기가 그 자리를 가로채지 않는다', () => {
  queryError = new ApiClientError('로그인이 필요해요.', 401, 'AUTH_REQUIRED');

  renderDetail('student');

  expect(screen.getByTestId('marketplace-detail-signin')).toBeInTheDocument();
  expect(screen.queryByTestId('marketplace-detail-unavailable')).not.toBeInTheDocument();
});
