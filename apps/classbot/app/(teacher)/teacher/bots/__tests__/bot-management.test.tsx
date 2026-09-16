import { render, screen, within } from '@testing-library/react';
import { scopeMeta } from '@/lib/mock/tutor';
import { classBots } from '@/lib/mock/classbot';
import * as botPolicy from '@/lib/mock/classbot-bot-policy';
import TeacherBotsPage from '../page';
import TeacherBotSettingsPage from '../[botId]/page';

/**
 * 봇 관리 — 목록이 봇들을 보여주고, 봇을 누르면 그 봇의 설정으로 가고,
 * 봇이 없으면 빈 상태와 만들러 가는 길이 보이는지 (`proc/spec/03 § 4.4`).
 *
 * 목록에 무엇이 오르는지는 카탈로그(`classBots`)가 정한다 — 여기서 봇 수를 못 박지 않는다.
 */

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

/** 「봇이 하나도 없을 때」를 보려고 카탈로그를 비우는 스위치 */
const mockNoBots = { on: false };
jest.mock('@/lib/mock/classbot-bot-policy', () => {
  const actual = jest.requireActual('@/lib/mock/classbot-bot-policy');
  return {
    ...actual,
    getManagedBots: () => (mockNoBots.on ? [] : actual.getManagedBots()),
  };
});

const { getManagedBots } = botPolicy;

async function renderList(searchParams: { tab?: string } = {}) {
  render(await TeacherBotsPage({ searchParams: Promise.resolve(searchParams) }));
}

async function renderDetail(botId: string, searchParams: { tab?: string } = {}) {
  render(
    await TeacherBotSettingsPage({
      params: Promise.resolve({ botId }),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

describe('봇 관리 목록', () => {
  it('카탈로그의 봇을 모두 줄로 보여준다', async () => {
    await renderList();
    const rows = within(screen.getByTestId('bot-manage-list')).getAllByRole('listitem');
    expect(rows).toHaveLength(classBots.length);

    for (const bot of getManagedBots()) {
      const row = screen.getByTestId(`bot-manage-card-${bot.botId}`);
      expect(within(row).getByText(bot.botName)).toBeInTheDocument();
      expect(within(row).getByText(`${bot.subject} · ${bot.grade}`)).toBeInTheDocument();
      // 안전 등급 이름은 scopeMeta 하나만 쓴다 — 목록·운영 화면이 같은 출처를 읽는다
      expect(within(row).getByText(scopeMeta[bot.scope].short)).toBeInTheDocument();
      expect(within(row).getByText(bot.tone)).toBeInTheDocument();
    }
  });

  it('줄마다 링크는 하나뿐이고 그 봇의 설정으로 간다', async () => {
    await renderList();
    for (const bot of getManagedBots()) {
      const links = within(screen.getByTestId(`bot-manage-card-${bot.botId}`)).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', `/teacher/bots/${bot.botId}`);
    }
  });

  it('운영 사실(운영 중·멈춤·인원·낸 과제)은 목록에 두지 않는다 — 운영 화면 몫', async () => {
    await renderList();
    const list = screen.getByTestId('bot-manage-list');
    expect(within(list).queryAllByText(/운영 중|멈춤/)).toHaveLength(0);
    expect(within(list).queryAllByText(/\d+명/)).toHaveLength(0);
    expect(within(list).queryAllByText(/낸 과제/)).toHaveLength(0);
  });

  // 07 § 6.6 「버튼은 단어로」 — 「새 봇 만들기」가 아니라 「새 봇」
  it('봇 만들러 가는 길이 헤더에 있고 이름은 한 단어다', async () => {
    await renderList();
    const cta = screen.getByTestId('bots-new-cta');
    expect(cta).toHaveAttribute('href', '/teacher/builder');
    expect(cta).toHaveTextContent('새 봇');
  });

  it('옛 경로가 실어 보낸 탭을 봇 링크까지 이어 붙인다', async () => {
    await renderList({ tab: 'drift' });
    const [first] = getManagedBots();
    const link = within(screen.getByTestId(`bot-manage-card-${first.botId}`)).getByRole('link');
    expect(link).toHaveAttribute('href', `/teacher/bots/${first.botId}?tab=drift`);
  });

  it('모르는 탭은 실어 나르지 않는다', async () => {
    await renderList({ tab: 'nope' });
    const [first] = getManagedBots();
    const link = within(screen.getByTestId(`bot-manage-card-${first.botId}`)).getByRole('link');
    expect(link).toHaveAttribute('href', `/teacher/bots/${first.botId}`);
  });
});

describe('봇 관리 목록 — 봇이 하나도 없을 때', () => {
  beforeEach(() => { mockNoBots.on = true; });
  afterEach(() => { mockNoBots.on = false; });

  it('빈 상태와 봇 만들러 가는 길을 준다', async () => {
    await renderList();

    expect(screen.getByText('아직 만든 봇이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '봇 만들기' })).toHaveAttribute('href', '/teacher/builder');
    expect(screen.queryByTestId('bot-manage-list')).not.toBeInTheDocument();
    // 봇 만들러 가는 길은 화면에 하나만 — 빈 상태가 맡으므로 헤더 CTA 는 내린다 (07 § 6.6.2(2))
    expect(screen.queryByTestId('bots-new-cta')).not.toBeInTheDocument();
  });
});

describe('봇별 설정', () => {
  it('그 봇의 이름·과목·학년과 지금 안전 등급을 헤더가 읽어준다', async () => {
    const [bot] = getManagedBots();
    await renderDetail(bot.botId);

    expect(
      screen.getByRole('heading', { level: 1, name: `${bot.botName} 운영 규칙` }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${bot.subject} · ${bot.grade}`))).toBeInTheDocument();
    expect(within(screen.getByTestId('bot-scope-chip')).getByText(scopeMeta[bot.scope].short))
      .toBeInTheDocument();
  });

  it('기본 탭은 안전 등급 — 시간대 스케줄이 보인다', async () => {
    const [bot] = getManagedBots();
    await renderDetail(bot.botId);
    expect(screen.getByText('안전 등급 시간대 스케줄')).toBeInTheDocument();
  });

  it('?tab=drift 면 이탈 대응이 보인다', async () => {
    const [bot] = getManagedBots();
    await renderDetail(bot.botId, { tab: 'drift' });
    expect(screen.getByText('이탈 대응 강도')).toBeInTheDocument();
    expect(screen.queryByText('안전 등급 시간대 스케줄')).not.toBeInTheDocument();
  });

  it('탭 링크는 그 봇 안에 머무른다', async () => {
    const [bot] = getManagedBots();
    await renderDetail(bot.botId);
    expect(screen.getByRole('link', { name: '이탈 대응' })).toHaveAttribute(
      'href',
      `/teacher/bots/${bot.botId}?tab=drift`,
    );
  });

  it('목록으로 돌아가는 길이 있다', async () => {
    const [bot] = getManagedBots();
    await renderDetail(bot.botId);
    expect(screen.getByRole('link', { name: /봇 관리/ })).toHaveAttribute('href', '/teacher/bots');
  });

  it('카탈로그에 없는 봇이면 404 로 보낸다', async () => {
    await expect(renderDetail('cb_없는봇')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

/**
 * 안전 등급 시간대 스케줄 — **같은 화면이 제 말을 뒤집지 않는지.**
 *
 * 스케줄이 상수 한 벌이던 때(`08:00 L1 / 15:00 L3 / 19:00 L3 / 22:00 L5`) L4 봇에서
 * 머리 배지는 「L4」인데 바로 아래 L1~L5 표에서 L4 에 「쓰는 중」이 안 붙었다 —
 * 스케줄 어디에도 L4 가 없어서다. 가운데 두 칸이 그 봇의 등급을 읽게 고친 자리를 여기서 잡는다.
 */
describe('봇별 설정 — 안전 등급 스케줄은 그 봇의 등급을 따라간다', () => {
  /** L4 봇(영어봇 `cb_002`) — 부딪치던 자리. 등급의 권위는 카탈로그라 여기서 집어 온다 */
  function l4Bot() {
    const bot = getManagedBots().find(b => b.scope === 4);
    if (!bot) throw new Error('카탈로그에 L4 봇이 없다 — 이 회귀 테스트의 전제가 깨졌다');
    return bot;
  }

  /** 스케줄 한 칸이 그린 등급 (`L1`~`L5`) */
  function slotShort(slotId: string) {
    return within(screen.getByTestId(`safety-slot-${slotId}`)).getByText(/^L[1-5]$/).textContent;
  }

  /** L1~L5 표에서 그 등급에 「쓰는 중」이 붙었나 */
  function isInUse(level: number) {
    return within(screen.getByTestId(`safety-level-${level}`)).queryByText('쓰는 중') !== null;
  }

  it('L4 봇이면 방과 후·저녁 두 칸이 L4 로 그려진다', async () => {
    const bot = l4Bot();
    await renderDetail(bot.botId);

    expect(slotShort('slot-after')).toBe('L4');
    expect(slotShort('slot-evening')).toBe('L4');
  });

  it('L4 봇의 L1~L5 표에서 L4 가 「쓰는 중」이다 — 머리 배지와 어긋나지 않는다', async () => {
    const bot = l4Bot();
    await renderDetail(bot.botId);

    expect(within(screen.getByTestId('bot-scope-chip')).getByText('L4')).toBeInTheDocument();
    expect(isInUse(4)).toBe(true);
  });

  it('양 끝 칸은 고정이다 — 수업 시간 L1, 밤 L5', async () => {
    const bot = l4Bot();
    await renderDetail(bot.botId);

    expect(slotShort('slot-class')).toBe('L1');
    expect(slotShort('slot-night')).toBe('L5');
    expect(isInUse(1)).toBe(true);
    expect(isInUse(5)).toBe(true);
  });

  // 봇 하나가 우연히 맞는 것으로는 부족하다 — 카탈로그의 모든 봇에 같은 말이 서야 한다
  it.each(getManagedBots().map(b => [b.botId, b.scope] as [string, number]))(
    '%s — 머리 배지가 읽은 등급이 L1~L5 표에서도 「쓰는 중」이다',
    async (botId, scope) => {
      await renderDetail(botId);
      expect(isInUse(scope)).toBe(true);
    },
  );
});
