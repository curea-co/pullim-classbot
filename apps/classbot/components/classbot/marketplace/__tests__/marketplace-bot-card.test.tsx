/**
 * 마켓 카드 — **공식 봇이 걷는 칸**(spec `03 § 4.13.1` 의 표).
 *
 * 카드는 교사 봇을 전제로 짜여 있었다. 풀림이 제공하는 봇에는 소유자가 없어서
 * (`class_bots.teacher_id` 가 NULL) 그 전제를 그대로 두면 카드가 **사실이 아닌 것을 말한다** —
 * 회사 이름이 사람 이름 자리에 앉고, 아무도 올린 적 없는 날이 「올림」으로 읽히고,
 * 갓 선 봇의 0명이 정보인 척한다. 여기서 보는 것은 그 넷이 실제로 갈리는가이고,
 * **교사 봇 쪽이 종전 그대로인가**를 한 건으로 같이 잠근다 — 갈라 그리다 멀쩡한 쪽을
 * 같이 걷어내는 것이 이 변경에서 제일 쉬운 실수다.
 */
import { render, screen } from '@testing-library/react';

import type { MarketplaceBotItem } from '@/hooks/api/types';
import { formatPublishedAt } from '../format';
import { MarketplaceBotCard } from '../marketplace-bot-card';

// 담기 버튼은 저장소를 물고 있어 이 테스트의 관심사가 아니다 — 카드가 적는 값만 본다.
jest.mock('../self-add-button', () => ({
  SelfAddButton: () => null,
}));

const teacherBot: MarketplaceBotItem = {
  botId: 'cb_teacher_001',
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
 * 시드가 넣는 공식 봇의 모양 그대로 — `teacherName`·`organization` 에 **값이 있다**.
 * 카드가 그 값을 안 쓰는 것이지 빈 칸이라 안 나오는 게 아니라서, 여기에 굳이 채워 둔다.
 */
const officialBot: MarketplaceBotItem = {
  ...teacherBot,
  botId: 'cb_official_001',
  name: '수학 마스터',
  teacherName: '풀림 공식',
  organization: '풀림',
  scope: 4, // 시드가 공식 봇 셋에 넣는 등급(`03 § 4.13.1`). 카드가 안 그릴 뿐 값은 있다
  enrolledCount: 0,
  isOfficial: true,
};

const renderCard = (bot: MarketplaceBotItem, isMine = false) =>
  render(<MarketplaceBotCard bot={bot} href={`/classbot/discover/${bot.botId}`} isMine={isMine} />);

it('공식 봇은 사람 이름 자리에 「풀림 공식」 배지가 선다', () => {
  renderCard(officialBot);

  const badge = screen.getByTestId('marketplace-card-official');
  expect(badge).toBeInTheDocument();
  // 보이는 글자는 두 어절, 잃은 뜻은 낭독기 쪽에 남긴다.
  expect(badge.textContent).toContain('풀림 공식');
  expect(badge.textContent).toContain('풀림이 제공하는 공식 봇이에요');
});

it('공식 봇 카드는 교사 이름·소속을 적지 않는다 — 회사가 사람 행세를 하지 않는다', () => {
  renderCard(officialBot);

  expect(screen.queryByText(/풀림 공식 · 풀림/)).not.toBeInTheDocument();
  expect(screen.queryByText('풀림')).not.toBeInTheDocument();
});

it('공식 봇 카드에는 「…에 올림」이 없다 — 올린 사람이 없다', () => {
  renderCard(officialBot);

  expect(screen.queryByText(/에 올림/)).not.toBeInTheDocument();
});

it('공식 봇의 참여 0명은 칸을 비운다 — 갓 선 봇의 정상 상태지 정보가 아니다', () => {
  renderCard(officialBot);

  // 낭독기용 이름표(「참여 학생」)까지 함께 사라져야 칸이 빈 것이다.
  expect(screen.queryByText('참여 학생')).not.toBeInTheDocument();
  expect(screen.queryByText('0명')).not.toBeInTheDocument();
});

it('공식 봇이어도 참여한 학생이 있으면 그 수는 적는다 — 세는 규칙 자체는 같다', () => {
  renderCard({ ...officialBot, enrolledCount: 3 });

  expect(screen.getByText('참여 학생')).toBeInTheDocument();
  expect(screen.getByText('3명')).toBeInTheDocument();
});

/*
  이 한 건은 **막는 장치를 확인하는 것이 아니다.** 카드에는 「공식 봇이면 `isMine` 을
  무시한다」는 가지가 없고, 두지도 않았다(그런 가지를 두면 `ownBotIds` 가 이미 답한 것을
  카드가 한 번 더 답하게 된다). 공식 봇에 「내 봇」이 안 붙는 까닭은 위에서 이미 갈린다 —
  `ownBotIds` 는 「내가 게시한 봇」이고 공식 봇에는 게시한 사람이 없다. 그래서 여기서 보는
  것은 **카드를 제대로 부른 자리에서 그 배지가 안 뜬다**는 사실뿐이다. `isMine` 을 켜서
  부르면 배지는 뜬다 — 그건 카드의 잘못이 아니라 잘못 부른 것이다.
*/
it('공식 봇에는 「내 봇」 배지가 붙지 않는다 — `ownBotIds` 에 들 수 없는 봇이다', () => {
  renderCard(officialBot);

  expect(screen.queryByText('내 봇')).not.toBeInTheDocument();
});

it('교사 봇은 내가 올린 것이면 「내 봇」이 그대로 붙는다 — 이 배지를 걷지 않았다', () => {
  renderCard(teacherBot, true);

  expect(screen.getByText('내 봇')).toBeInTheDocument();
});

it('교사 봇 카드는 종전 그대로 — 이름·소속·올린 날·참여 수를 다 적는다', () => {
  renderCard(teacherBot);

  expect(screen.getByText('김수학 선생님 · 대치프리미엄 수학학원')).toBeInTheDocument();
  /*
    날짜 글자를 `2026년 9월 2일` 로 **박아 쓰지 않는다.** `formatPublishedAt` 은 로컬 시간대로
    끊는데(`getFullYear`/`getMonth`/`getDate`) 이 리포는 테스트 TZ 를 고정하지 않는다 —
    UTC 자정 값을 박아 두면 한국에서는 통과하고 UTC 서쪽에서는 하루 밀려 깨진다.
    여기서 볼 것은 「무슨 날짜냐」가 아니라 **그 줄을 그리느냐**다.
  */
  expect(screen.getByText(/에 올림/).textContent).toBe(
    `${formatPublishedAt(teacherBot.publishedAt)}에 올림`,
  );
  expect(screen.getByText('참여 학생')).toBeInTheDocument();
  expect(screen.getByText('12명')).toBeInTheDocument();
  expect(screen.queryByTestId('marketplace-card-official')).not.toBeInTheDocument();
});

it('교사 봇의 0명은 그대로 적는다 — 게시한 본인에게는 「아직 아무도 안 들어왔다」가 값이다', () => {
  renderCard({ ...teacherBot, enrolledCount: 0 });

  expect(screen.getByText('0명')).toBeInTheDocument();
});
