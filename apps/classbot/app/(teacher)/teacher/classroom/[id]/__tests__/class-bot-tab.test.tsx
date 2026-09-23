/**
 * 반 상세 「봇」 탭 — 「지금 붙은 봇」을 **모른다 · 없다 · 이 봇** 셋으로 갈라 그리고, 새 봇을 만들어 붙이고, 고치고, 뗀다
 * (계획 PR 5b · `../class-bot-tab.tsx` 머리주석).
 *
 * 못박는 것: 모르는 상태를 「없다」로 그리지 않고 으뜸 버튼도 「없다」고 알 때만인 것 · **「다른 봇으로 바꾸기」
 * 고르개가 내 봇 목록에서 서고 지금 붙은 봇을 빼는 것**(계획 PR 5d · `GET /me/bots`) · 만들어 붙이기가 비운 칸을
 * 보내지 않는 것 · **붙이기만 실패하면 폼이 닫히고 「다시 붙이기」(PUT 만)가 서는 것 — 봇을 또 만들지 않는다** ·
 * 떼기가 되묻고 `{ botId: null }` 로 가는 것 · 고치기가 바뀐 칸만 싣고(지우면 null) 안 바뀌면 서버를 두드리지
 * 않는 것 · 실패 문구가 문마다 갈리는 것.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotDto, ClassDto } from '@/lib/api/classbot-dto';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import { BotAttachError } from '@/hooks/api/bot';
import { botFailureMessage } from '@/lib/bot-failure-message';
import { ClassBotTab } from '../class-bot-tab';

const BOT: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근', greeting: '안녕! 오늘은 뭘 볼까?',
  scope: 4, avatarEmoji: '📚', quickPrompts: [], isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: ['cls_1'],
  createdAt: '', updatedAt: '',
};
const CLASS_BASE: ClassDto = {
  id: 'cls_1', operatorId: 't1', orgId: null, name: '고2 국어 A반', description: null, subject: null, grade: null,
  isActive: true, isSelfStudy: false, bot: null, joinCode: null, createdAt: '', updatedAt: '',
};
const OFFICIAL: MarketplaceBotItem = {
  botId: 'official_math',
  name: '풀림 수학 코치',
  avatarEmoji: '➗',
  subject: '수학',
  grade: '중등',
  tone: '차분',
  greeting: '수학을 같이 풀어 보자.',
  scope: 3,
  blurb: '공식 수학 봇',
  teacherName: '풀림',
  organization: '풀림',
  publishedAt: '2026-09-22T00:00:00.000Z',
  enrolledCount: 0,
  isOfficial: true,
};

let known: ClassDto | undefined;
let knownBot: BotDto | undefined;
/** `useMyBots` 가 답할 목록과 상태 — 「다른 봇으로 바꾸기」 고르개가 이것을 읽는다. */
let myBots: BotDto[] | undefined;
let myBotsPending: boolean;
let myBotsError: unknown;
let marketplaceBots: MarketplaceBotItem[];
let marketplacePending: boolean;
let marketplaceError: unknown;
/**
 * `useOperatorClasses` — 고르개가 `classIds` 를 반 이름으로 옮길 때 쓴다.
 *
 * `name`(봇 이름)과 `className`(반 이름) 둘을 다 들려 보낸다 — pullim-api #679 로 카드의 `name` 이
 * 봇 이름이 됐고, **이 줄이 부르는 것은 반 이름**이다. 같은 봇이 여러 반을 섬기므로 여기서 `name` 을
 * 읽으면 「지금 붙어 있는 반」 줄이 같은 글자만 늘어놓는다.
 */
let operatorClasses: { id: string; name: string; className: string }[] | undefined;
type CreateHandlers = { onSuccess: (r: { bot: BotDto; class: ClassDto }) => void; onError: (e: unknown) => void };
type AssignHandlers = { onSuccess: () => void; onError: (e: unknown) => void };
/** 다음 「만들어 붙이기」가 어떻게 끝나는지 — 테스트가 갈아 끼운다. 비우면 아무 콜백도 부르지 않는다. */
let createOutcome: { error: unknown } | null = null;
let attachOutcome: { error: unknown } | null = null;
const assignMutate = jest.fn((_vars: unknown, handlers?: AssignHandlers) => {
  if (!handlers) return;
  if (attachOutcome) handlers.onError(attachOutcome.error);
  else handlers.onSuccess();
});
const createMutate = jest.fn((_vars: unknown, handlers?: CreateHandlers) => {
  if (handlers && createOutcome) handlers.onError(createOutcome.error);
});
const updateMutate = jest.fn();
let createError: unknown = null;
let updateError: unknown = null;

jest.mock('@/hooks/api/classroom', () => ({
  useClassDetail: () => ({ data: known }),
  useOperatorClasses: () => ({ data: operatorClasses }),
  useAssignClassBot: () => ({ mutate: assignMutate, isPending: false }),
}));
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBot: () => ({ bot: knownBot, isPending: false, error: null }),
  useMyBots: () => ({
    data: myBots,
    isPending: myBotsPending,
    isError: myBotsError !== null,
    error: myBotsError,
  }),
  useCreateBotForClass: () => ({ mutate: createMutate, isPending: false, isError: createError !== null, error: createError }),
  useUpdateBot: () => ({ mutate: updateMutate, isPending: false, isError: updateError !== null, error: updateError }),
}));
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBots: () => ({
    data: { bots: marketplaceBots },
    isPending: marketplacePending,
    isError: marketplaceError !== null,
    error: marketplaceError,
  }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
const toastMessage = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    message: (...args: unknown[]) => toastMessage(...args),
  },
}));

beforeEach(() => {
  known = undefined;
  knownBot = undefined;
  myBots = [];
  myBotsPending = false;
  myBotsError = null;
  marketplaceBots = [];
  marketplacePending = false;
  marketplaceError = null;
  operatorClasses = [];
  createError = null;
  updateError = null;
  createOutcome = null;
  attachOutcome = null;
  assignMutate.mockClear();
  createMutate.mockClear();
  updateMutate.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  toastMessage.mockReset();
});

const tab = () => render(<ClassBotTab classId="cls_1" classroomName="고2 국어 A반" />);

describe('지금 붙은 봇 — 셋으로 가른다', () => {
  it('모르면 「아직 불러올 수 없어요」 — 없다고 하지 않고, 떼기·고치기도 없고, 새 봇 버튼은 으뜸이 아니다', () => {
    tab();
    expect(screen.getByTestId('class-bot-unknown')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-none')).toBeNull();
    expect(screen.getByTestId('class-bot-create-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('class-bot-create-toggle')).not.toHaveClass('bg-pullim-blue-600');
    expect(screen.queryByTestId('class-bot-detach')).toBeNull();
    expect(screen.queryByTestId('class-bot-edit-toggle')).toBeNull();
    // 「바꾸기」는 모를 때도 낸다 — 고르개가 여는 것은 내 봇 목록이고 그건 이 반을 몰라도 읽힌다.
    expect(screen.getByTestId('class-bot-swap-toggle')).toBeInTheDocument();
  });

  it('없으면 「붙은 봇이 없어요」 — 그때만 새 봇 버튼이 으뜸이다', () => {
    known = CLASS_BASE;
    tab();
    expect(screen.getByTestId('class-bot-none')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-detach')).toBeNull();
    expect(screen.getByTestId('class-bot-create-toggle')).toHaveClass('bg-pullim-blue-600');
  });

  it('반 상세만 왔고 봇 목록이 아직이면 이름·아바타만 그린다 · 고치기·떼기는 선다', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    tab();
    expect(screen.getByTestId('class-bot-name')).toHaveTextContent('문학 도우미');
    expect(screen.getByTestId('class-bot-facts-unknown')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-facts')).toBeNull();
    expect(screen.getByTestId('class-bot-edit-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('class-bot-detach')).toBeInTheDocument();
  });

  it('내 봇 목록에서 그 봇을 찾으면 과목·학년·말투·등급·인사말까지', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    knownBot = BOT;
    tab();
    const facts = screen.getByTestId('class-bot-facts');
    expect(facts).toHaveTextContent('국어');
    expect(facts).toHaveTextContent('고2');
    expect(facts).toHaveTextContent('말투 · 친근');
    expect(facts).toHaveTextContent('L4 · 교육 범위');
    expect(screen.getByTestId('class-bot-greeting')).toHaveTextContent('안녕! 오늘은 뭘 볼까?');
  });

  it('붙은 봇이 공식 봇이면 상세를 보여 주되 교사 소유 봇처럼 고치게 하지 않는다', () => {
    known = {
      ...CLASS_BASE,
      bot: { id: OFFICIAL.botId, name: OFFICIAL.name, avatarEmoji: OFFICIAL.avatarEmoji },
    };
    marketplaceBots = [OFFICIAL];
    tab();

    expect(screen.getByTestId('class-bot-facts')).toHaveTextContent('수학');
    expect(screen.getByTestId('class-bot-greeting')).toHaveTextContent('수학을 같이 풀어 보자.');
    expect(screen.queryByTestId('class-bot-edit-toggle')).toBeNull();
    expect(screen.getByTestId('class-bot-detach')).toBeInTheDocument();
  });
});

describe('다른 봇으로 바꾸기 — GET /me/bots 에서 고른다', () => {
  const OTHER: BotDto = {
    ...BOT, id: 'bot_2', name: '독해 도우미', subject: '국어', grade: '중3', tone: '차분', scope: 3,
    avatarEmoji: null, classIds: ['cls_9'],
  };

  function openSwap() {
    tab();
    fireEvent.click(screen.getByTestId('class-bot-swap-toggle'));
  }

  it('지금 붙은 봇은 고를 수 없다 — 나머지만 선다', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    myBots = [BOT, OTHER];
    openSwap();
    expect(screen.getByTestId('class-bot-swap-bot_2')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-swap-bot_1')).toBeNull();
  });

  it('반 상세를 아직 못 읽어도 지금 붙은 봇은 못 고른다 — `classIds` 가 반 상세와 다른 문이라 그때도 선다', () => {
    // 반 상세가 읽는 중이면 `currentBotId` 는 null 이다. 그 잣대 하나면 bot_1 이 목록에 그대로 서고,
    // 고르는 순간 서버는 멱등 200 · 화면은 「봇을 바꿨어요」 — 아무것도 안 바뀌었는데.
    known = undefined;
    myBots = [BOT, OTHER];
    openSwap();
    expect(screen.queryByTestId('class-bot-swap-bot_1')).toBeNull();
    expect(screen.getByTestId('class-bot-swap-bot_2')).toBeInTheDocument();

    // 고를 자리 자체가 없으니 멱등 PUT 도, 「봇을 바꿨어요」 토스트도 일어날 수 없다
    expect(screen.queryByTestId('class-bot-swap-pick-bot_1')).toBeNull();
    expect(assignMutate).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('이름을 일부만 찾으면 개수로 물러선다 — 못 찾은 반이 말없이 사라지지 않는다', () => {
    myBots = [{ ...OTHER, classIds: ['cls_9', 'cls_8'] }];
    operatorClasses = [{ id: 'cls_9', name: '국어 도우미', className: '중3 국어 B반' }];
    openSwap();

    const rooms = screen.getByTestId('class-bot-swap-rooms-bot_2');
    expect(rooms).toHaveTextContent('지금 붙어 있는 반 2개');
    expect(rooms).not.toHaveTextContent('중3 국어 B반');
  });

  it('봇마다 과목·학년·말투·등급과 이미 붙어 있는 반을 적는다', () => {
    myBots = [OTHER];
    operatorClasses = [{ id: 'cls_9', name: '국어 도우미', className: '중3 국어 B반' }];
    openSwap();
    const row = screen.getByTestId('class-bot-swap-bot_2');
    expect(row).toHaveTextContent('국어');
    expect(row).toHaveTextContent('중3');
    expect(row).toHaveTextContent('말투 · 차분');
    expect(row).toHaveTextContent('L3 · 교과 범위');
    // 부르는 것은 **반** 이름이다 — 카드의 `name`(「국어 도우미」)은 봇 이름이다(#679).
    expect(screen.getByTestId('class-bot-swap-rooms-bot_2')).toHaveTextContent('지금 붙어 있는 반 · 중3 국어 B반');
    expect(screen.getByTestId('class-bot-swap-rooms-bot_2')).not.toHaveTextContent('국어 도우미');
  });

  it('반 이름을 못 읽었으면 개수만 말한다 — id 를 보여주지 않는다', () => {
    myBots = [OTHER];
    operatorClasses = undefined;
    openSwap();
    const rooms = screen.getByTestId('class-bot-swap-rooms-bot_2');
    expect(rooms).toHaveTextContent('지금 붙어 있는 반 1개');
    expect(rooms).not.toHaveTextContent('cls_9');
  });

  it('어느 반에도 안 붙은 봇은 그렇다고 말한다', () => {
    myBots = [{ ...OTHER, classIds: [] }];
    openSwap();
    expect(screen.getByTestId('class-bot-swap-rooms-bot_2')).toHaveTextContent('아직 어느 반에도 안 붙어 있어요');
  });

  it('고르면 PUT { botId } 한 번 — 성공하면 닫히고 토스트가 반 이름을 말한다', () => {
    myBots = [OTHER];
    openSwap();
    fireEvent.click(screen.getByTestId('class-bot-swap-pick-bot_2'));
    expect(assignMutate).toHaveBeenCalledTimes(1);
    expect(assignMutate.mock.calls[0][0]).toEqual({ classId: 'cls_1', botId: 'bot_2' });
    expect(toastSuccess).toHaveBeenCalled();
    expect(screen.queryByTestId('class-bot-swap-form')).toBeNull();
  });

  it('풀림 공식 봇도 같은 고르개에서 반에 붙일 수 있다', () => {
    marketplaceBots = [OFFICIAL];
    openSwap();

    const row = screen.getByTestId('class-bot-swap-official_math');
    expect(row).toHaveTextContent('풀림 공식');
    expect(row).toHaveTextContent('수학');
    fireEvent.click(screen.getByTestId('class-bot-swap-pick-official_math'));

    expect(assignMutate).toHaveBeenCalledTimes(1);
    expect(assignMutate.mock.calls[0][0]).toEqual({ classId: 'cls_1', botId: 'official_math' });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('붙이기가 실패하면 고르개는 열린 채로 남고 까닭을 토스트로 말한다', () => {
    myBots = [OTHER];
    attachOutcome = { error: new ApiError('남의 봇', 404) };
    openSwap();
    fireEvent.click(screen.getByTestId('class-bot-swap-pick-bot_2'));
    expect(toastError).toHaveBeenCalledWith('붙이려던 봇을 찾을 수 없어요. 내 봇이어야 해요.');
    expect(screen.getByTestId('class-bot-swap-form')).toBeInTheDocument();
  });

  it('읽는 중이면 「불러오는 중」 — 빈 목록을 「없다」로 뭉개지 않는다', () => {
    myBotsPending = true;
    myBots = undefined;
    openSwap();
    expect(screen.getByTestId('class-bot-swap-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-swap-empty')).toBeNull();
  });

  it('못 읽었으면 그렇다고 말한다 — 「고를 봇이 없다」가 아니다', () => {
    myBotsError = new ApiError('안 됨', 500);
    myBots = undefined;
    openSwap();
    expect(screen.getByTestId('class-bot-swap-error')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-swap-empty')).toBeNull();
  });

  it('읽었는데 고를 봇이 하나도 없으면 새로 만들라고 한다', () => {
    myBots = [];
    openSwap();
    expect(screen.getByTestId('class-bot-swap-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-swap-pending')).toBeNull();
  });

  it('고르개를 다시 누르면 닫힌다', () => {
    myBots = [OTHER];
    openSwap();
    expect(screen.getByTestId('class-bot-swap-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('class-bot-swap-toggle'));
    expect(screen.queryByTestId('class-bot-swap-form')).toBeNull();
    cleanup();
  });
});

describe('새 봇 만들어 붙이기', () => {
  it('이름만 채우면 보낼 수 있고, 비운 칸은 싣지 않는다 — 등급은 기본 3', () => {
    known = CLASS_BASE;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    const submit = screen.getByTestId('class-bot-create-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('bot-name-input'), { target: { value: ' 문학 도우미 ' } });
    fireEvent.change(screen.getByTestId('bot-tone-input'), { target: { value: '친근' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({ classId: 'cls_1', bot: { name: '문학 도우미', scope: 3, tone: '친근' } });
  });

  it('붙은 봇이 있거나 모르면 「새 봇으로 바뀐다」고 미리 말한다 — 없으면 말하지 않는다', () => {
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    expect(screen.getByTestId('class-bot-replace-note')).toBeInTheDocument();
  });

  it('없는 반에서는 바뀐다는 말이 없다', () => {
    known = CLASS_BASE;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    expect(screen.queryByTestId('class-bot-replace-note')).toBeNull();
  });

  it('붙이기만 실패하면 폼이 닫히고 「다시 붙이기」만 남는다 — 다시 붙이기는 PUT 만 부르고 봇을 또 만들지 않는다', () => {
    createOutcome = { error: new BotAttachError(BOT, new ApiError('forbidden', 403)) };
    known = CLASS_BASE;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    fireEvent.change(screen.getByTestId('bot-name-input'), { target: { value: '문학 도우미' } });
    fireEvent.click(screen.getByTestId('class-bot-create-submit'));
    expect(createMutate).toHaveBeenCalledTimes(1);

    // 폼은 닫혔다 — 제출할 길이 없다.
    expect(screen.queryByTestId('class-bot-create-form')).toBeNull();
    expect(screen.queryByTestId('class-bot-create-submit')).toBeNull();
    const orphan = screen.getByTestId('class-bot-orphan');
    expect(orphan).toHaveTextContent('「문학 도우미」 봇은 만들어졌어요');
    expect(screen.getByTestId('class-bot-orphan-reason')).toHaveTextContent('이 반의 운영 교사만 봇을 붙이거나 뗄 수 있어요.');
    expect(screen.getByTestId('class-bot-orphan-reason')).toHaveTextContent('다시 붙이면 봇을 새로 만들지 않아요.');

    fireEvent.click(screen.getByTestId('class-bot-attach-retry'));
    expect(assignMutate).toHaveBeenCalledTimes(1);
    expect(assignMutate.mock.calls[0][0]).toEqual({ classId: 'cls_1', botId: 'bot_1' });
    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('봇을 붙였어요', { description: '문학 도우미' });
  });

  it('다시 붙이기도 실패하면 그 이유로 바뀌고 다시 붙이기는 그대로 남는다', () => {
    createOutcome = { error: new BotAttachError(BOT, new ApiError('boom', 500)) };
    attachOutcome = { error: new ApiError('not found', 404) };
    known = CLASS_BASE;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    fireEvent.change(screen.getByTestId('bot-name-input'), { target: { value: '문학 도우미' } });
    fireEvent.click(screen.getByTestId('class-bot-create-submit'));
    expect(screen.getByTestId('class-bot-orphan-reason')).toHaveTextContent('봇을 붙이지 못했어요. 잠시 후 다시 시도해 주세요.');

    fireEvent.click(screen.getByTestId('class-bot-attach-retry'));
    expect(screen.getByTestId('class-bot-orphan-reason')).toHaveTextContent('붙이려던 봇을 찾을 수 없어요. 내 봇이어야 해요.');
    expect(screen.getByTestId('class-bot-attach-retry')).toBeInTheDocument();
    expect(createMutate).toHaveBeenCalledTimes(1);
  });

  it('만들기부터 실패하면 폼은 열린 채 그 뜻을 말한다', () => {
    createError = new ApiError('forbidden', 403);
    known = CLASS_BASE;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-create-toggle'));
    expect(screen.getByTestId('class-bot-create-form')).toBeInTheDocument();
    expect(screen.getByTestId('class-bot-create-error')).toHaveTextContent('선생님 계정만 봇을 만들거나 고칠 수 있어요.');
  });
});

describe('봇 떼기', () => {
  it('되묻고, 떼면 { botId: null } 로 간다', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    tab();
    fireEvent.click(screen.getByTestId('class-bot-detach'));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('문학 도우미를 「고2 국어 A반」에서 뗄까요?');
    expect(assignMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('class-bot-detach-confirm'));
    expect(assignMutate).toHaveBeenCalledTimes(1);
    expect(assignMutate.mock.calls[0][0]).toEqual({ classId: 'cls_1', botId: null });
  });

  it('그만두면 아무 데도 가지 않는다', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    tab();
    fireEvent.click(screen.getByTestId('class-bot-detach'));
    fireEvent.click(screen.getByTestId('class-bot-detach-cancel'));
    expect(assignMutate).not.toHaveBeenCalled();
  });
});

describe('봇 고치기', () => {
  beforeEach(() => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
  });

  it('아는 봇이면 값이 미리 차 있고, 바뀐 칸만 보낸다 — 지운 인사말은 null · 힌트는 「비우면 없앰」', () => {
    knownBot = BOT;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-edit-toggle'));
    expect(screen.getByTestId('bot-edit-name-input')).toHaveValue('문학 도우미');
    expect(screen.getByTestId('bot-edit-greeting-input')).toHaveValue('안녕! 오늘은 뭘 볼까?');
    expect(screen.getByTestId('bot-edit-scope-select')).toHaveValue('4');
    expect(screen.getAllByText('비우면 없앰')).toHaveLength(2);

    fireEvent.change(screen.getByTestId('bot-edit-greeting-input'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('bot-edit-scope-select'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('class-bot-edit-submit'));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_1', patch: { greeting: null, scope: 2 } });
  });

  it('요약만 알면 이름만 차 있고 비워 둔 칸은 보내지 않는다 — 힌트도 「비우면 그대로」', () => {
    tab();
    fireEvent.click(screen.getByTestId('class-bot-edit-toggle'));
    expect(screen.getByTestId('class-bot-edit-partial-note')).toBeInTheDocument();
    expect(screen.getByTestId('bot-edit-scope-select')).toHaveValue('');
    expect(screen.getAllByText('비우면 그대로')).toHaveLength(2);
    expect(screen.queryByText('비우면 없앰')).toBeNull();

    fireEvent.change(screen.getByTestId('bot-edit-name-input'), { target: { value: '시 도우미' } });
    fireEvent.click(screen.getByTestId('class-bot-edit-submit'));

    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_1', patch: { name: '시 도우미' } });
  });

  it('바꾼 것이 없으면 서버를 두드리지 않는다', () => {
    knownBot = BOT;
    tab();
    fireEvent.click(screen.getByTestId('class-bot-edit-toggle'));
    fireEvent.click(screen.getByTestId('class-bot-edit-submit'));
    expect(updateMutate).not.toHaveBeenCalled();
    expect(toastMessage).toHaveBeenCalledWith('바꾼 것이 없어요');
  });
});

describe('botFailureMessage', () => {
  it.each([
    [403, 'create', '선생님 계정만 봇을 만들거나 고칠 수 있어요.'],
    [403, 'detach', '이 반의 운영 교사만 봇을 붙이거나 뗄 수 있어요.'],
    [404, 'update', '고치려던 봇을 찾을 수 없어요. 내 봇이어야 해요.'],
    [404, 'attach', '붙이려던 봇을 찾을 수 없어요. 내 봇이어야 해요.'],
    [404, 'detach', '반을 찾을 수 없어요.'],
    [400, 'create', '입력을 다시 확인해 주세요. 이름은 100자까지, 등급은 1~5예요.'],
    [401, 'update', '로그인이 필요해요.'],
    [500, 'detach', '봇을 떼지 못했어요. 잠시 후 다시 시도해 주세요.'],
    [500, 'update', '봇을 고치지 못했어요. 잠시 후 다시 시도해 주세요.'],
    [500, 'attach', '봇을 붙이지 못했어요. 잠시 후 다시 시도해 주세요.'],
    [500, 'create', '봇을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ] as const)('%s · %s → %s', (status, action, message) => {
    expect(botFailureMessage(new ApiError('x', status), action)).toBe(message);
  });

  it('붙이기만 실패(BotAttachError)하면 봇 이름과 원인을 함께', () => {
    expect(botFailureMessage(new BotAttachError(BOT, new ApiError('x', 404)), 'create')).toBe(
      '「문학 도우미」 봇은 만들어졌는데 이 반에 붙이지 못했어요 — 붙이려던 봇을 찾을 수 없어요. 내 봇이어야 해요.',
    );
  });
});
