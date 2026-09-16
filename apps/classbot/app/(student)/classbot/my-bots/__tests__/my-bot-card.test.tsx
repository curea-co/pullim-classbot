/**
 * 담은 봇 한 칸 — **이름 밑에 사람을 적는 자리**(spec `03 § 4.13.3`).
 *
 * 마켓 카드에서 걷어낸 그 칸이 담고 나면 다시 나왔다. 담은 봇 카드는 마켓에서 온 값을
 * 그대로 흘려 「풀림 공식 · 풀림」을 적었고, 그건 회사가 사람 이름 자리에 앉은 것이다.
 *
 * 여기서 보는 것은 셋이다: ① 공식 봇에서 그 줄이 배지로 바뀌는가 ② **교사 봇이 종전
 * 그대로인가** ③ **못 찾은 봇의 폴백 문구가 살아 있는가**. 세 갈래가 한 자리를 나눠 쓰므로
 * 하나를 고치다 나머지를 삼키는 것이 이 변경에서 제일 쉬운 실수다.
 */
import { render, screen } from '@testing-library/react';

import { MyBotCard } from '../my-bot-card';
import type { SelfBotRow } from '@/hooks/api/self-bots';
import type { MarketplaceBotItem } from '@/hooks/api/types';

const row: SelfBotRow = { botId: 'cb_001', addedAt: '2026-09-01T09:00:00.000Z' };

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

/**
 * 시드가 넣는 공식 봇 그대로 — `teacherName`·`organization` 에 **값이 있다.**
 * 카드가 그 값을 안 쓰는 것이지 빈 칸이라 안 나오는 게 아니다.
 */
const officialBot: MarketplaceBotItem = {
  ...teacherBot,
  teacherName: '풀림 공식',
  organization: '풀림',
  scope: 4,
  isOfficial: true,
};

const renderCard = (bot: MarketplaceBotItem | null) =>
  render(<MyBotCard row={row} bot={bot} onRemove={() => {}} isRemoving={false} />);

it('담은 공식 봇은 이름 밑이 「풀림 공식」 배지다 — 마켓 카드와 한 벌', () => {
  renderCard(officialBot);

  const badge = screen.getByTestId(`my-bot-official-${row.botId}`);
  expect(badge.textContent).toContain('풀림 공식');
  // 보이는 글자에서 줄어든 뜻은 마켓 카드와 **같은 한 마디**로 낭독기에 남긴다.
  expect(badge.textContent).toContain('풀림이 제공하는 공식 봇이에요');
});

it('담은 공식 봇 카드는 교사 이름·소속을 적지 않는다 — 회사가 사람 행세를 하지 않는다', () => {
  renderCard(officialBot);

  expect(screen.queryByText('풀림 공식 · 풀림')).not.toBeInTheDocument();
});

it('담은 교사 봇은 종전 그대로 이름·소속을 적는다 — 이 줄을 걷지 않았다', () => {
  renderCard(teacherBot);

  expect(screen.getByText('김수학 선생님 · 대치프리미엄 수학학원')).toBeInTheDocument();
  expect(screen.queryByTestId(`my-bot-official-${row.botId}`)).not.toBeInTheDocument();
});

/*
  공식 봇 분기가 **같은 자리에 먼저 있던 폴백**을 삼키지 않는지 본다. 마켓에서 못 찾은 봇은
  `bot` 이 null 로 오고, 그때 이 줄은 이름 대신 상태를 적는다 — 「공유가 내려갔다」는 말은
  담은 학생에게 이 카드가 남아 있는 까닭 그 자체라 지워지면 안 된다.
*/
it('마켓에서 못 찾은 봇은 폴백 문구가 그대로 선다 — 공식 봇 분기가 이 자리를 가로채지 않는다', () => {
  renderCard(null);

  expect(screen.getByText(/공유가 내려가 마켓에서는 안 보여요/)).toBeInTheDocument();
  expect(screen.queryByTestId(`my-bot-official-${row.botId}`)).not.toBeInTheDocument();
});
