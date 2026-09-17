/**
 * 반 상세 「봇」 탭 — 「지금 붙은 봇」을 **모른다 · 없다 · 이 봇** 셋으로 갈라 그리고, 새 봇을 만들어 붙이고, 고치고, 뗀다
 * (계획 PR 5b · `../class-bot-tab.tsx` 머리주석).
 *
 * 못박는 것: 모르는 상태를 「없다」로 그리지 않고 으뜸 버튼도 「없다」고 알 때만인 것 · 「다른 봇으로 바꾸기」 고르개가
 * 없는 것 · 만들어 붙이기가 비운 칸을 보내지 않는 것 · **붙이기만 실패하면 폼이 닫히고 「다시 붙이기」(PUT 만)가 서는 것 —
 * 봇을 또 만들지 않는다** · 떼기가 되묻고 `{ botId: null }` 로 가는 것 · 고치기가 바뀐 칸만 싣고(지우면 null) 안 바뀌면
 * 서버를 두드리지 않는 것 · 실패 문구가 문마다 갈리는 것.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotDto, ClassDto } from '@/lib/api/classbot-dto';
import { BotAttachError } from '@/hooks/api/bot';
import { ClassBotTab, botFailureMessage } from '../class-bot-tab';

const BOT: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근', greeting: '안녕! 오늘은 뭘 볼까?',
  scope: 4, avatarEmoji: '📚', quickPrompts: [], isPublished: false, publishedAt: null, classIds: ['cls_1'],
  createdAt: '', updatedAt: '',
};
const CLASS_BASE: ClassDto = {
  id: 'cls_1', operatorId: 't1', orgId: null, name: '고2 국어 A반', description: null, subject: null, grade: null,
  isActive: true, bot: null, joinCode: null, createdAt: '', updatedAt: '',
};

let known: ClassDto | undefined;
let knownBot: BotDto | undefined;
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
  useKnownClassSummary: () => known,
  useAssignClassBot: () => ({ mutate: assignMutate, isPending: false }),
}));
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useKnownBot: () => knownBot,
  useCreateBotForClass: () => ({ mutate: createMutate, isPending: false, isError: createError !== null, error: createError }),
  useUpdateBot: () => ({ mutate: updateMutate, isPending: false, isError: updateError !== null, error: updateError }),
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
    // 내 봇 목록을 읽는 문이 없다 — 고르개를 지어내지 않는다.
    expect(screen.queryByRole('combobox', { name: /다른 봇/ })).toBeNull();
    expect(screen.queryByText(/다른 봇으로/)).toBeNull();
  });

  it('없으면 「붙은 봇이 없어요」 — 그때만 새 봇 버튼이 으뜸이다', () => {
    known = CLASS_BASE;
    tab();
    expect(screen.getByTestId('class-bot-none')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-detach')).toBeNull();
    expect(screen.getByTestId('class-bot-create-toggle')).toHaveClass('bg-pullim-blue-600');
  });

  it('요약만 알면 이름·아바타를 그리고 과목·말투·등급은 모른다고 한다 · 고치기·떼기가 선다', () => {
    known = { ...CLASS_BASE, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    tab();
    expect(screen.getByTestId('class-bot-name')).toHaveTextContent('문학 도우미');
    expect(screen.getByTestId('class-bot-facts-unknown')).toBeInTheDocument();
    expect(screen.queryByTestId('class-bot-facts')).toBeNull();
    expect(screen.getByTestId('class-bot-edit-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('class-bot-detach')).toBeInTheDocument();
  });

  it('이 세션이 만들거나 고친 봇이면 과목·학년·말투·등급·인사말까지', () => {
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
