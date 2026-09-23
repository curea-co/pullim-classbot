/**
 * 봇 수정 — 봇 관리·운영 화면의 「수정하기」와 만든 뒤 화면의 「고치기」가 오는 자리.
 *
 * 이 화면이 지켜야 할 것:
 *  - 첫 값은 **정본 한 행**(`GET /classbot/me/bots` → `draftFromBot`)에서 온다 — 이름·과목·학년·말투·답 범위
 *  - 읽는 중 · 로그인 끊김(401) · **내 봇이 아니다** 를 갈라 그린다 — 「모른다」를 「없다」로 그리지 않는다
 *  - 저장은 **바뀐 칸만** 싣고(`PATCH /classbot/bots/:id`), 바뀐 것이 없으면 서버를 두드리지 않는다
 *  - 정본에 칸이 없는 셋(수업 자료·평소에·틀렸을 때)은 기본값으로 열리고 **여기서 고칠 수는 있다**
 *  - 막는 판정은 빌더와 같은 것을 읽는다 — 「저장」도 「다음」도 위쪽 「단계」도 같이 막힌다
 *  - 반은 여기서 고치지 않는다 — 「채워진 것」이 읽어주기만 한다
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotDto } from '@/lib/api/classbot-dto';
import { emptyDraft, styleMeta, toneMeta, wrongMeta } from '@/components/builder/builder-types';
import { BotEditWorkspace } from '../edit-workspace';

const BOT: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '국어봇', subject: '국어', grade: '중3', tone: '차분',
  greeting: '안녕! 오늘은 뭘 볼까?', scope: 4, avatarEmoji: '📚', quickPrompts: ['오늘 배운 것 정리해 줘'],
  isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: ['cls_1', 'cls_2'], createdAt: '', updatedAt: '',
};

type MyBot = { bot: BotDto | undefined; isPending: boolean; error: ApiError | null };

/** `useMyBot` 이 무엇을 돌려줄지 — 테스트가 갈아 끼운다. */
let myBot: MyBot = { bot: BOT, isPending: false, error: null };
type UpdateHandlers = { onSuccess: (bot: BotDto) => void; onError: (e: unknown) => void };
/** 다음 저장이 어떻게 끝나는지. 비우면 성공하고 `BOT` 이 돌아온다. */
let updateOutcome: { error: unknown } | null = null;
const updateMutate = jest.fn((_vars: unknown, handlers?: UpdateHandlers) => {
  if (!handlers) return;
  if (updateOutcome) handlers.onError(updateOutcome.error);
  else handlers.onSuccess(BOT);
});

jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBot: () => myBot,
  useUpdateBot: () => ({ mutate: updateMutate, isPending: false }),
}));
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useAssignClassBot: () => ({ mutate: jest.fn(), isPending: false }),
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
  myBot = { bot: BOT, isPending: false, error: null };
  updateOutcome = null;
  updateMutate.mockClear();
  toastSuccess.mockReset();
  toastError.mockReset();
  toastMessage.mockReset();
});

const edit = () => render(<BotEditWorkspace botId="bot_1" />);
/** 헤더·아래 자리 둘 다 같은 「저장」이다 — 첫 자리를 누른다. */
const save = () => fireEvent.click(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })[0]);

/* ─── 읽는 동안 · 못 읽을 때 ─── */

describe('첫 값을 읽는 동안', () => {
  it('읽는 중에는 마당을 그리지 않는다 — 빈 빌더를 열어 「고치는 중」인 척하지 않는다', () => {
    myBot = { bot: undefined, isPending: true, error: null };
    edit();

    expect(screen.getByRole('heading', { level: 1, name: '봇 수정' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/봇 이름/)).toBeNull();
    expect(screen.queryByRole('button', { name: '고친 그대로 저장하기' })).toBeNull();
  });

  it('로그인이 끊기면(401) 고장 카드가 아니라 로그인 안내다', () => {
    myBot = { bot: undefined, isPending: false, error: new ApiError('unauthorized', 401) };
    edit();

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.queryByText('없는 봇이에요')).toBeNull();
  });

  it('보관된 봇의 직접 수정 주소는 편집 폼 대신 복구 안내를 보여준다', () => {
    myBot = {
      bot: { ...BOT, state: 'archived', archivedAt: '2026-09-23T00:00:00.000Z' },
      isPending: false,
      error: null,
    };
    edit();

    expect(screen.getByText('보관된 봇은 읽기 전용이에요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `${BOT.name} 봇 관리에서 복구하기` })).toHaveAttribute(
      'href',
      '/teacher/bots/bot_1',
    );
    expect(screen.queryByRole('button', { name: '고친 그대로 저장하기' })).toBeNull();
  });

  it('읽기가 실패하면 다시 시도를 권한다 — 「없는 봇」이라고 하지 않는다', () => {
    myBot = { bot: undefined, isPending: false, error: new ApiError('boom', 500) };
    edit();

    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    expect(screen.queryByText('없는 봇이에요')).toBeNull();
  });

  it('다 읽었는데 목록에 없으면 「없는 봇이에요」 — 지워졌거나 남의 봇이다', () => {
    myBot = { bot: undefined, isPending: false, error: null };
    edit();

    expect(screen.getByText('없는 봇이에요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '봇 관리로 가기' })).toHaveAttribute('href', '/teacher/bots');
    expect(screen.queryByLabelText(/봇 이름/)).toBeNull();
  });
});

/* ─── 첫 값 ─── */

describe('빈 빌더가 아니라 그 봇의 지금 값으로 열린다', () => {
  it('정본이 든 것이 마당과 「채워진 것」 양쪽에 실린다', () => {
    edit();

    expect(screen.getByRole('heading', { level: 1, name: '국어봇 수정하기' })).toBeInTheDocument();
    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('국어');
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('중3');
    expect(screen.getByTestId('summary-row-name')).toHaveTextContent('국어봇');
    expect(screen.getByTestId('summary-row-scope')).toHaveTextContent('L4');
    // 옛 말투 다섯이 빌더의 셋으로 접힌다 — 「차분」은 또박또박 쪽이다
    expect(screen.getByTestId('summary-row-tone')).toHaveTextContent(toneMeta.polite.label);

    // 이미 고른 값이 눌린 채로 보인다 — 「채워진 것」에만 있고 마당에는 안 눌려 있으면 안 된다
    expect(screen.getByRole('radio', { name: /국어/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '중3' })).toBeChecked();
    expect(screen.getByLabelText(/봇 이름/)).toHaveValue('국어봇');
  });

  it('정본에 칸이 없는 셋은 기본값으로 열린다 — 없는 값을 지어내지 않는다', () => {
    edit();

    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('없음');
    expect(screen.getByTestId('summary-row-style')).toHaveTextContent(styleMeta[emptyDraft.style].label);
    expect(screen.getByTestId('summary-row-wrong')).toHaveTextContent(wrongMeta[emptyDraft.wrong].label);
  });

  it('그 셋도 여기서 고칠 수는 있다 — 화면 안에서만 사는 값이라 저장에는 실리지 않는다', () => {
    edit();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 자료 골라 올리기' }));
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('1개 올림');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(styleMeta.ask.label) }));
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(wrongMeta.tell.label) }));
    expect(screen.getByTestId('summary-row-style')).toHaveTextContent(styleMeta.ask.label);
    expect(screen.getByTestId('summary-row-wrong')).toHaveTextContent(wrongMeta.tell.label);

    // 셋 다 정본에 칸이 없어 보낼 것이 없다 — 「저장」이 서버를 두드리지 않는다
    save();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(toastMessage).toHaveBeenCalledWith('바꾼 것이 없어요');
  });

  it('셋으로 표현 못 하는 말투는 원문을 그대로 든다 — 눌린 칩만 두면 교사가 제 말이 사라진 줄 안다', () => {
    myBot = { bot: { ...BOT, tone: '차분하고 다정하게' }, isPending: false, error: null };
    edit();

    expect(screen.getByText('지금 말투는 「차분하고 다정하게」예요')).toBeInTheDocument();
    expect(screen.getByTestId('bot-edit-custom-tone')).toHaveTextContent('그대로 두면 지금 말투가 남아요');

    // 말투를 실제로 건드리면 그때부터는 고른 것이 저장될 값이라 안내를 걷는다
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(toneMeta.firm.label) }));
    expect(screen.queryByTestId('bot-edit-custom-tone')).toBeNull();
  });

  it('셋 안의 말투면 그 안내를 띄우지 않는다 — 칩이 이미 그 말이다', () => {
    edit();
    expect(screen.queryByTestId('bot-edit-custom-tone')).toBeNull();
  });

  it('말투를 안 건드리면 저장에도 실리지 않는다 — 원문이 서버에 남는다', () => {
    myBot = { bot: { ...BOT, tone: '차분하고 다정하게' }, isPending: false, error: null };
    edit();

    fireEvent.click(screen.getByRole('radio', { name: '고1' }));
    save();

    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_1', patch: { grade: '고1' } });
  });

  it('붙어 있는 반은 읽어주기만 한다 — 고치는 자리는 여기가 아니다', () => {
    edit();

    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('2개 반에 붙어 있어요');
    expect(screen.queryByRole('group', { name: '어느 반에 넣을까요' })).toBeNull();
  });

  it('만드는 화면이 아니다 — 「생성」도 만든 뒤 화면도 없다', () => {
    edit();

    expect(screen.queryByRole('button', { name: '채운 그대로 봇 생성하기' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })).toHaveLength(1);
    expect(screen.queryByText('만들어졌어요')).toBeNull();
  });
});

/* ─── 저장 ─── */

describe('저장은 바뀐 칸만 싣는다', () => {
  it('학년만 바꾸면 학년만 간다 — 안 건드린 말투는 실리지 않는다', () => {
    edit();

    fireEvent.click(screen.getByRole('radio', { name: '고1' }));
    save();

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0][0]).toEqual({ botId: 'bot_1', patch: { grade: '고1' } });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('바꾼 것이 없으면 서버를 두드리지 않는다 — 빈 수정은 아무 일도 안 하면서 「저장했어요」만 남긴다', () => {
    edit();

    save();

    expect(updateMutate).not.toHaveBeenCalled();
    expect(toastMessage).toHaveBeenCalledWith('바꾼 것이 없어요');
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('한 번 저장한 뒤 곧바로 또 누르면 같은 칸이 다시 가지 않는다 — 첫 값을 돌아온 행으로 다시 심는다', () => {
    edit();

    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    save();
    expect(updateMutate).toHaveBeenCalledTimes(1);

    // 돌아온 행(`BOT`)의 이름은 「국어봇」이라 화면 값과 다시 갈린다 — 그래서 이번엔 그 한 칸만 간다
    save();
    expect(updateMutate).toHaveBeenCalledTimes(2);
    expect(updateMutate.mock.calls[1][0]).toEqual({ botId: 'bot_1', patch: { name: '별별봇' } });
  });

  it('실패하면 까닭을 말한다 — 문마다 갈린 문구를 그대로 읽는다', () => {
    updateOutcome = { error: new ApiError('not found', 404) };
    edit();

    fireEvent.click(screen.getByRole('radio', { name: '고1' }));
    save();

    expect(toastError).toHaveBeenCalledWith('고치려던 봇을 찾을 수 없어요. 내 봇이어야 해요.');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

/* ─── 마당 오가기 · 막기 ─── */

describe('마당은 빌더와 같이 움직인다', () => {
  it('마당 셋을 그대로 오간다 — 마당 3 에서는 아래 자리도 「저장」이 이어받는다', () => {
    edit();

    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: '봇이 보고 답할 것' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: '가르치는 법' })).toBeInTheDocument();

    // 헤더 한 자리 + 「다음」이 쓰던 아래 자리 — 자리가 둘이어도 부르는 것은 하나다
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })).toHaveLength(2);
  });

  it('되짚어 가는 「이전」은 막지 않는다', () => {
    edit();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
  });

  it('규칙을 어기면 「저장」이 막히고 서버를 두드리지 않는다 — 빌더와 같은 판정이다', () => {
    edit();

    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '봇' } });
    save();

    expect(screen.getByRole('alert')).toHaveTextContent('이름은 두 글자에서 서른 글자 사이로');
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('막힌 것을 고치면 오류가 사라진다', () => {
    edit();

    const nameInput = screen.getByLabelText(/봇 이름/);
    fireEvent.change(nameInput, { target: { value: '봇' } });
    save();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: '국어봇2' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('summary-row-name')).toHaveTextContent('국어봇2');
  });
});
