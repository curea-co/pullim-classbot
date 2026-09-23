/**
 * 봇 관리 — 목록과 봇별 설정이 **정본**(`GET /classbot/me/bots` · `PATCH /classbot/bots/:id`)을 읽고 쓴다
 * (계획 PR 5d · `proc/spec/03 § 4.4`).
 *
 * 못박는 것: 줄이 mock 카탈로그가 아니라 내 봇 목록에서 오는 것 · 그 목록이 늦고 끊기고 실패하고 비는 네 상태를
 * 화면이 갈라 말하는 것 · **없는 칸(`subject`·`grade`·`tone` null)을 빈 글자로 그리지 않는 것** ·
 * 「읽는 중」과 「내 봇이 아니다」를 가르는 것(종전 `notFound()` 자리) · 붙은 반을 **이름이 아니라 수**로 말하는 것 ·
 * 고치기가 바뀐 칸만 싣고(지우면 null) 안 바뀌면 서버를 두드리지 않는 것 · 시간대 스케줄이 이 봇의 등급을 따라가는 것 ·
 * `?tab=` 이 목록을 지나 상세까지 이어지는 것.
 *
 * 훅은 모듈째 바꿔 끼운다 — 목록이 비동기라 옛 테스트처럼 모듈 로드 시점에 `it.each(getManagedBots())` 로
 * 줄을 셀 수 없다.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotDto } from '@/lib/api/classbot-dto';
import TeacherBotsPage from '../page';
import TeacherBotSettingsPage from '../[botId]/page';

/** 다 채운 봇 — L4 라 스케줄 회귀(머리 배지 ↔ L1~L5 표)를 여기서 잡는다. */
const FULL: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근',
  greeting: '안녕! 오늘은 뭘 볼까?', scope: 4, avatarEmoji: '📚', quickPrompts: [],
  isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: ['cls_1', 'cls_2'], createdAt: '', updatedAt: '',
};

/** 이름만 있는 봇 — 과목·학년·말투·인사말이 전부 null 이고 어느 반에도 안 붙었다. */
const BARE: BotDto = {
  id: 'bot_2', operatorId: 't1', name: '이름만 봇', subject: null, grade: null, tone: null,
  greeting: null, scope: 3, avatarEmoji: null, quickPrompts: [],
  isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: [], createdAt: '', updatedAt: '',
};

/* ── 훅 바꿔 끼우기 — 모듈 수준 가변 상태 ─────────────────────── */

let bots: BotDto[] = [];
let listPending = false;
let listError: ApiError | null = null;
const refetch = jest.fn();
const updateMutate = jest.fn();
const archiveMutate = jest.fn();
const restoreMutate = jest.fn();
let updateError: unknown = null;

jest.mock('@/hooks/api/bot', () => ({
  // 훅만 갈아 끼우고 나머지는 진짜를 쓴다 — 실패 문구 표(`lib/bot-failure-message.ts`)가 이 모듈의
  // `BotAttachError` 로 `instanceof` 를 재서, 빼면 그 자리가 `instanceof undefined` 로 터진다.
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBots: () => ({
    // 읽는 중·실패에는 `data` 가 없다 — react-query 가 그렇고, 화면이 그때 빈 목록을 「0개」로 읽으면 안 된다.
    data: listPending || listError ? undefined : bots,
    isPending: listPending,
    isError: listError !== null,
    error: listError,
    refetch,
  }),
  useMyBot: (botId: string) => ({
    bot: listPending || listError ? undefined : bots.find((b) => b.id === botId),
    isPending: listPending,
    error: listError,
  }),
  useUpdateBot: () => ({
    mutate: updateMutate,
    isPending: false,
    isError: updateError !== null,
    error: updateError,
  }),
  useArchiveBot: () => ({ mutate: archiveMutate, isPending: false }),
  useRestoreBot: () => ({ mutate: restoreMutate, isPending: false }),
}));

const toastSuccess = jest.fn();
const toastMessage = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: jest.fn(),
    message: (...args: unknown[]) => toastMessage(...args),
  },
}));

beforeEach(() => {
  bots = [FULL, BARE];
  listPending = false;
  listError = null;
  updateError = null;
  refetch.mockClear();
  updateMutate.mockReset();
  archiveMutate.mockReset();
  restoreMutate.mockReset();
  toastSuccess.mockReset();
  toastMessage.mockReset();
});

async function renderList(searchParams: { tab?: string | string[] } = {}) {
  render(await TeacherBotsPage({ searchParams: Promise.resolve(searchParams) }));
}

async function renderDetail(botId: string, searchParams: { tab?: string | string[] } = {}) {
  render(
    await TeacherBotSettingsPage({
      params: Promise.resolve({ botId }),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

/* ── 목록 ─────────────────────────────────────────────────── */

describe('봇 관리 목록 — 정본을 읽는다', () => {
  it('내 봇 목록이 준 순서 그대로 줄을 세운다', async () => {
    await renderList();
    const rows = within(screen.getByTestId('bot-manage-list')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const full = screen.getByTestId('bot-manage-card-bot_1');
    expect(within(full).getByText('문학 도우미')).toBeInTheDocument();
    expect(within(full).getByText('국어 · 고2')).toBeInTheDocument();
    // 안전 등급 이름은 scopeMeta 하나만 쓴다 — 목록·상세·운영 화면이 같은 출처를 읽는다
    expect(within(full).getByText('L4')).toBeInTheDocument();
    expect(within(full).getByText('친근')).toBeInTheDocument();
  });

  it('과목·학년·말투가 없는 봇은 그 칸을 통째로 뺀다 — 빈 글자도 가운뎃점도 없다', async () => {
    await renderList();
    const bare = screen.getByTestId('bot-manage-card-bot_2');

    expect(within(bare).getByText('이름만 봇')).toBeInTheDocument();
    expect(within(bare).getByText('L3')).toBeInTheDocument();
    expect(within(bare).queryByText(/·/)).toBeNull();
    expect(within(bare).queryByText(/null/)).toBeNull();
    expect(within(bare).queryByText('말투')).toBeNull();
  });

  it('줄마다 링크는 하나뿐이고 그 봇의 설정으로 간다', async () => {
    await renderList();
    for (const bot of [FULL, BARE]) {
      const links = within(screen.getByTestId(`bot-manage-card-${bot.id}`)).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', `/teacher/bots/${bot.id}`);
    }
  });

  it('운영 사실(운영 중·멈춤·인원·낸 과제)은 목록에 두지 않는다 — 운영 화면 몫', async () => {
    await renderList();
    const list = screen.getByTestId('bot-manage-list');
    expect(within(list).queryAllByText(/운영 중|멈춤/)).toHaveLength(0);
    expect(within(list).queryAllByText(/\d+명/)).toHaveLength(0);
    expect(within(list).queryAllByText(/낸 과제/)).toHaveLength(0);
  });

  // 07 § 6.6 「버튼은 단어로」의 두 단어 한도 — 「새 클래스봇 만들기」가 아니라 「새 클래스봇」.
  it('봇 만들러 가는 길이 헤더에 있고 이름은 두 단어다', async () => {
    await renderList();
    const cta = screen.getByTestId('bots-new-cta');
    expect(cta).toHaveAttribute('href', '/teacher/builder');
    expect(cta).toHaveTextContent('새 클래스봇');
  });

  it('옛 경로가 실어 보낸 탭을 봇 링크까지 이어 붙인다', async () => {
    await renderList({ tab: 'drift' });
    const link = within(screen.getByTestId('bot-manage-card-bot_1')).getByRole('link');
    expect(link).toHaveAttribute('href', '/teacher/bots/bot_1?tab=drift');
  });

  it('모르는 탭·배열은 실어 나르지 않는다', async () => {
    await renderList({ tab: 'nope' });
    expect(within(screen.getByTestId('bot-manage-card-bot_1')).getByRole('link')).toHaveAttribute(
      'href',
      '/teacher/bots/bot_1',
    );
    screen.getByTestId('bot-manage-list').remove();

    await renderList({ tab: ['drift', 'safety'] });
    expect(within(screen.getByTestId('bot-manage-card-bot_1')).getByRole('link')).toHaveAttribute(
      'href',
      '/teacher/bots/bot_1',
    );
  });
});

describe('봇 관리 목록 — 목록이 늦고 끊기고 실패하고 빈다', () => {
  it('읽는 중이면 뼈대만 — 줄도 빈 상태도 만들러 가는 길도 아직 없다', async () => {
    listPending = true;
    await renderList();

    expect(screen.getByTestId('bot-manage-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('bot-manage-list')).toBeNull();
    expect(screen.queryByText('아직 만든 봇이 없어요')).toBeNull();
    expect(screen.queryByTestId('bots-new-cta')).toBeNull();
  });

  it('세션이 끊기면 에러 카드가 아니라 로그인 안내다', async () => {
    listError = new ApiError('unauthorized', 401);
    await renderList();

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByText('봇 관리를 보려면 먼저 로그인해 주세요.')).toBeInTheDocument();
    expect(screen.queryByTestId('bot-manage-list')).toBeNull();
  });

  it('읽기가 실패하면 다시 시도할 수 있다', async () => {
    listError = new ApiError('boom', 500);
    await renderList();

    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('한 개도 없으면 빈 상태와 봇 만들러 가는 길을 준다', async () => {
    bots = [];
    await renderList();

    expect(screen.getByText('아직 만든 봇이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '봇 만들기' })).toHaveAttribute('href', '/teacher/builder');
    expect(screen.queryByTestId('bot-manage-list')).toBeNull();
    // 봇 만들러 가는 길은 화면에 하나만 — 빈 상태가 맡으므로 헤더 CTA 는 내린다 (07 § 6.6.2(2))
    expect(screen.queryByTestId('bots-new-cta')).toBeNull();
  });
});

/* ── 봇별 설정 ─────────────────────────────────────────────── */

describe('봇별 설정 — 머리', () => {
  it('이름·과목·학년과 붙은 반 **수**를 읽어준다 — 반 이름은 정본에 없어 지어내지 않는다', async () => {
    await renderDetail('bot_1');

    expect(screen.getByRole('heading', { level: 1, name: '문학 도우미 운영 규칙' })).toBeInTheDocument();
    expect(screen.getByText('국어 · 고2 · 붙은 반 2개')).toBeInTheDocument();
    expect(within(screen.getByTestId('bot-scope-chip')).getByText('L4')).toBeInTheDocument();
  });

  it('과목·학년이 없고 붙은 반도 없으면 그렇다고만 말한다', async () => {
    await renderDetail('bot_2');

    expect(screen.getByRole('heading', { level: 1, name: '이름만 봇 운영 규칙' })).toBeInTheDocument();
    expect(screen.getByText('아직 붙은 학급이 없어요')).toBeInTheDocument();
    expect(within(screen.getByTestId('bot-scope-chip')).getByText('L3')).toBeInTheDocument();
  });

  it('목록으로 돌아가는 길이 있다', async () => {
    await renderDetail('bot_1');
    expect(screen.getByRole('link', { name: /봇 관리/ })).toHaveAttribute('href', '/teacher/bots');
  });
});

describe('봇별 설정 — 「모른다」와 「내 봇이 아니다」를 가른다', () => {
  it('읽는 중에는 없다고 하지 않는다 — 뼈대만', async () => {
    listPending = true;
    await renderDetail('bot_없는봇');

    expect(screen.getByTestId('bot-settings-loading')).toBeInTheDocument();
    expect(screen.queryByText('없는 봇이에요')).toBeNull();
  });

  it('다 읽었는데 내 봇 중에 없으면 「없는 봇이에요」 — 404 를 이 자리가 대신한다', async () => {
    await renderDetail('bot_없는봇');

    expect(screen.getByText('없는 봇이에요')).toBeInTheDocument();
    // 「봇 관리」는 뒤로 가기 링크도 쓰는 글자라 빈 상태 안에서 집는다.
    expect(within(screen.getByTestId('empty-state')).getByRole('link', { name: '봇 관리' })).toHaveAttribute(
      'href',
      '/teacher/bots',
    );
    expect(screen.queryByTestId('bot-identity')).toBeNull();
  });

  it('세션이 끊기면 로그인 안내, 실패하면 다시 시도', async () => {
    listError = new ApiError('unauthorized', 401);
    await renderDetail('bot_1');
    expect(screen.getByText('봇 관리를 보려면 먼저 로그인해 주세요.')).toBeInTheDocument();
    screen.getByText('봇 관리를 보려면 먼저 로그인해 주세요.').remove();

    listError = new ApiError('boom', 500);
    await renderDetail('bot_1');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('봇별 설정 — 탭', () => {
  it('기본 탭은 안전 등급 — 시간대 스케줄이 보인다', async () => {
    await renderDetail('bot_1');
    expect(screen.getByText('안전 등급 시간대 스케줄')).toBeInTheDocument();
  });

  it('?tab=drift 면 이탈 대응이 보인다', async () => {
    await renderDetail('bot_1', { tab: 'drift' });
    expect(screen.getByText('이탈 대응 강도')).toBeInTheDocument();
    expect(screen.queryByText('안전 등급 시간대 스케줄')).toBeNull();
  });

  it('탭 링크는 그 봇 안에 머무른다', async () => {
    await renderDetail('bot_1');
    expect(screen.getByRole('link', { name: '이탈 대응' })).toHaveAttribute(
      'href',
      '/teacher/bots/bot_1?tab=drift',
    );
  });

  it('「봇 이름·말투」 탭은 없다 — 그 일을 위 「이 봇」 칸이 하므로 화면이 제 말을 뒤집지 않는다', async () => {
    await renderDetail('bot_1');
    expect(screen.queryByText(/봇 이름·말투/)).toBeNull();
    expect(screen.getByTestId('bot-edit-toggle')).toBeInTheDocument();
  });

  it('아직 안 온 탭은 그대로 「준비 중」이다', async () => {
    await renderDetail('bot_1', { tab: 'evaluation' });
    expect(screen.getByText('평가 규칙 설정은 준비 중이에요')).toBeInTheDocument();
    expect(screen.queryByText('안전 등급 시간대 스케줄')).toBeNull();
  });
});

/**
 * 안전 등급 시간대 스케줄 — **같은 화면이 제 말을 뒤집지 않는지.**
 *
 * 스케줄이 상수 한 벌이던 때 L4 봇에서 머리 배지는 「L4」인데 바로 아래 L1~L5 표에서 L4 에 「쓰는 중」이
 * 안 붙었다. 가운데 두 칸이 그 봇의 등급을 읽게 고친 자리를 여기서 잡는다 — 이제 등급의 권위는 정본이다.
 */
describe('봇별 설정 — 스케줄은 이 봇의 등급을 따라간다', () => {
  /** 스케줄 한 칸이 그린 등급 (`L1`~`L5`) */
  function slotShort(slotId: string) {
    return within(screen.getByTestId(`safety-slot-${slotId}`)).getByText(/^L[1-5]$/).textContent;
  }

  /** L1~L5 표에서 그 등급에 「쓰는 중」이 붙었나 */
  function isInUse(level: number) {
    return within(screen.getByTestId(`safety-level-${level}`)).queryByText('쓰는 중') !== null;
  }

  it('L4 봇이면 방과 후·저녁 두 칸이 L4 이고 표에서도 L4 가 「쓰는 중」이다', async () => {
    await renderDetail('bot_1');

    expect(slotShort('slot-after')).toBe('L4');
    expect(slotShort('slot-evening')).toBe('L4');
    expect(within(screen.getByTestId('bot-scope-chip')).getByText('L4')).toBeInTheDocument();
    expect(isInUse(4)).toBe(true);
  });

  it('양 끝 칸은 고정이다 — 수업 시간 L1, 밤 L5', async () => {
    await renderDetail('bot_1');

    expect(slotShort('slot-class')).toBe('L1');
    expect(slotShort('slot-night')).toBe('L5');
    expect(isInUse(1)).toBe(true);
    expect(isInUse(5)).toBe(true);
  });

  it('서버 등급이 L1~L5 밖이면 표를 그리지 않는다 — 아무 칸이나 칠하지 않는다', async () => {
    bots = [{ ...FULL, scope: 9 }];
    await renderDetail('bot_1');

    expect(screen.getByTestId('safety-scope-unreadable')).toBeInTheDocument();
    expect(screen.queryByTestId('safety-slot-slot-after')).toBeNull();
    expect(isInUse(1)).toBe(false);
    expect(within(screen.getByTestId('bot-scope-chip')).getByText('9')).toBeInTheDocument();
  });
});

/* ── 봇 고치기 — PATCH /classbot/bots/:id ────────────────────── */

describe('봇 고치기', () => {
  it('닫혀 있을 때는 지금 말투·인사말을 보여준다', async () => {
    await renderDetail('bot_1');

    expect(screen.getByTestId('bot-identity-facts')).toHaveTextContent('말투 · 친근');
    expect(screen.getByTestId('bot-greeting')).toHaveTextContent('안녕! 오늘은 뭘 볼까?');
    expect(screen.queryByTestId('bot-edit-form')).toBeNull();
  });

  it('값이 미리 차 있고, 바뀐 칸만 보낸다 — 지운 인사말은 null', async () => {
    await renderDetail('bot_1');
    fireEvent.click(screen.getByTestId('bot-edit-toggle'));

    expect(screen.getByTestId('bot-edit-name-input')).toHaveValue('문학 도우미');
    expect(screen.getByTestId('bot-edit-tone-input')).toHaveValue('친근');
    expect(screen.getByTestId('bot-edit-greeting-input')).toHaveValue('안녕! 오늘은 뭘 볼까?');
    expect(screen.getByTestId('bot-edit-scope-select')).toHaveValue('4');

    fireEvent.change(screen.getByTestId('bot-edit-greeting-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('bot-edit-scope-select'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('bot-edit-submit'));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_1', patch: { greeting: null, scope: 2 } });
  });

  it('비어 있던 칸을 채우면 그 칸만 간다', async () => {
    await renderDetail('bot_2');
    fireEvent.click(screen.getByTestId('bot-edit-toggle'));

    expect(screen.getByTestId('bot-edit-tone-input')).toHaveValue('');
    fireEvent.change(screen.getByTestId('bot-edit-tone-input'), { target: { value: ' 차분 ' } });
    fireEvent.click(screen.getByTestId('bot-edit-submit'));

    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_2', patch: { tone: '차분' } });
  });

  it('바꾼 것이 없으면 서버를 두드리지 않는다', async () => {
    await renderDetail('bot_1');
    fireEvent.click(screen.getByTestId('bot-edit-toggle'));
    fireEvent.click(screen.getByTestId('bot-edit-submit'));

    expect(updateMutate).not.toHaveBeenCalled();
    expect(toastMessage).toHaveBeenCalledWith('바꾼 것이 없어요');
  });

  it('이름을 비우면 보낼 수 없다 — 이름 없는 봇을 만들지 않는다', async () => {
    await renderDetail('bot_1');
    fireEvent.click(screen.getByTestId('bot-edit-toggle'));

    fireEvent.change(screen.getByTestId('bot-edit-name-input'), { target: { value: '  ' } });
    expect(screen.getByTestId('bot-edit-submit')).toBeDisabled();
  });

  // 글자가 반 상세 「봇」 탭·빌더와 같은 것은 우연이 아니라 **표가 한 벌**이어서다(`lib/bot-failure-message.ts`).
  // 그 표의 갈래별 문구는 거기서 따로 검증한다 — 여기서는 이 화면이 그 표를 읽는다는 것만 못박는다.
  it('실패하면 그 뜻을 말한다 — 네 화면이 읽는 같은 표에서', async () => {
    updateError = new ApiError('not found', 404);
    await renderDetail('bot_1');
    fireEvent.click(screen.getByTestId('bot-edit-toggle'));

    expect(screen.getByTestId('bot-edit-error')).toHaveTextContent(
      '고치려던 봇을 찾을 수 없어요. 내 봇이어야 해요.',
    );
  });
});
