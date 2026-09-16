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
import type { MarketplaceBotItem } from '@/hooks/api/types';

let queryError: ApiClientError | null = null;
let queryBot: MarketplaceBotItem | null = null;
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBot: () => ({
    data: queryBot ? { bot: queryBot } : undefined,
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
  queryBot = null;
});

const teacherBot: MarketplaceBotItem = {
  botId: 'cb_001',
  name: '수학 도우미',
  avatarEmoji: '📐',
  subject: '수학',
  grade: '중2',
  tone: '친근',
  greeting: '안녕! 오늘도 같이 풀어 보자.',
  scope: 3,
  blurb: '개념부터 차근차근 짚어 주는 봇이에요.',
  teacherName: '김수학 선생님',
  organization: '대치프리미엄 수학학원',
  publishedAt: '2026-09-02T00:00:00.000Z',
  enrolledCount: 12,
  isOfficial: false,
};

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

/*
  아래 둘은 **한정을 걷은 문장**을 잠근다(spec `03 § 4.13.3`). 마켓에는 풀림이 만든 기본 봇도
  같이 서므로 「선생님들이 공유한 봇」·「선생님이 만들어 공유한 봇」은 이제 참이 아니다.
  목록 쪽 같은 문장은 #331 이 고쳤고, **상세에 한 벌씩 더 있었다.**
*/
it('로그인 안내는 「선생님들이」로 한정하지 않는다 — 목록과 같은 말로 맞춘다', () => {
  queryError = new ApiClientError('로그인이 필요해요.', 401, 'AUTH_REQUIRED');

  renderDetail('student');

  const box = screen.getByTestId('marketplace-detail-signin');
  expect(box.textContent).not.toContain('선생님들이');
  // `marketplace-bot-list.tsx` 와 **같은 문자열**이다 — 한 화면이 두 말로 설명하지 않는다.
  expect(box.textContent).toContain('공유된 봇은 로그인한 뒤에 둘러볼 수 있어요.');
});

it('한 줄 소개가 없으면 만든 사람을 단정하지 않는 말로 대신한다', () => {
  // 교사가 소개를 안 적었거나, 공식 봇이 이 길에 닿았을 때 — 둘 다 같은 자리다.
  queryBot = { ...teacherBot, blurb: null };

  renderDetail('student');

  expect(screen.queryByText('선생님이 만들어 공유한 봇이에요.')).not.toBeInTheDocument();
  expect(screen.getByText('마켓에 공유된 봇이에요.')).toBeInTheDocument();
});

it('한 줄 소개가 있으면 그대로 쓴다 — 폴백이 소개를 덮지 않는다', () => {
  queryBot = teacherBot;

  renderDetail('student');

  expect(screen.getByText(teacherBot.blurb as string)).toBeInTheDocument();
  expect(screen.queryByText('마켓에 공유된 봇이에요.')).not.toBeInTheDocument();
});
