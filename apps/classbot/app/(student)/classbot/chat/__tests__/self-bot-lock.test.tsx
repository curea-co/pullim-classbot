/**
 * 담은 봇(source='self') 챗은 닫힌 레인이다(`../chat-lane.ts` · 리뷰 #350 Must 1).
 *
 * 화면 전체를 올려 본다 — 보는 것은 셋: 잠긴 봇에는 기록(`fetchChatHistory`)도 전송(`streamChat`)도
 * 나가지 않고, 입력칸·보내기·빠른 칩이 잠기며 안내 한 줄이 서는 것 · 반 봇은 종전대로 기록을 읽고
 * 입력칸이 열리는 것 · 선택기에서 담은 봇으로 갈아타면 그 순간 잠기는 것.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { StudentBotsResult } from '@/lib/store/mode-bots';

let studentBots: StudentBotsResult;
jest.mock('@/lib/store/mode-bots', () => ({
  ...jest.requireActual('@/lib/store/mode-bots'),
  useStudentBots: () => studentBots,
}));

jest.mock('@/lib/store/use-hydrated', () => ({ useStoresHydrated: () => true }));

jest.mock('@/lib/current-user', () => ({
  ...jest.requireActual('@/lib/current-user'),
  useCurrentUser: () => ({ id: 'sub-1', role: 'student', name: '서연', isAuthenticated: true }),
}));

const streamChat: jest.Mock<Promise<void>, unknown[]> = jest.fn(() => Promise.resolve());
const fetchChatHistory: jest.Mock<Promise<unknown[]>, unknown[]> = jest.fn(() => Promise.resolve([]));
jest.mock('@/lib/api/chat-stream', () => ({
  ...jest.requireActual('@/lib/api/chat-stream'),
  streamChat: (...args: unknown[]) => streamChat(...args),
  fetchChatHistory: (...args: unknown[]) => fetchChatHistory(...args),
}));

import ClassbotChatPage from '../page';
import { SELF_BOT_CHAT_LOCKED_NOTICE, SELF_BOT_CHAT_LOCKED_PLACEHOLDER, chatLaneFor } from '../chat-lane';
import { classBots } from '@/lib/mock/classbot';

const CLASS_BOT = classBots[0];
const SELF_BOT = classBots[1];

function bots(slots: StudentBotsResult['slots']): StudentBotsResult {
  return {
    slots,
    classCount: slots.filter((s) => s.source === 'class').length,
    selfCount: slots.filter((s) => s.source === 'self').length,
    isLoading: false,
    isError: false,
    retry: () => {},
  };
}

const textarea = () => screen.getByRole('textbox') as HTMLTextAreaElement;
const sendButton = () => screen.getByRole('button', { name: '질문 보내기' });
const quickChips = () => screen.queryAllByTitle(/수업 단계|자유 질문/);

beforeAll(() => {
  // jsdom 에는 Element.scrollTo 가 없다 — 챗 자동 추적이 부른다.
  if (!Element.prototype.scrollTo) {
    Object.defineProperty(Element.prototype, 'scrollTo', { value: () => {}, writable: true });
  }
});

beforeEach(() => {
  streamChat.mockClear();
  fetchChatHistory.mockClear();
});

describe('chatLaneFor', () => {
  it('반 봇은 sse, 담은 봇은 locked', () => {
    expect(chatLaneFor('class')).toBe('sse');
    expect(chatLaneFor('self')).toBe('locked');
  });
});

describe('담은 봇만 있을 때', () => {
  beforeEach(() => {
    studentBots = bots([{ bot: SELF_BOT, source: 'self' }]);
  });

  it('기록을 읽지 않고, 입력칸·보내기·빠른 칩을 잠근 채 안내 한 줄을 세운다', async () => {
    render(<ClassbotChatPage />);

    expect(await screen.findByText(SELF_BOT_CHAT_LOCKED_NOTICE)).toBeInTheDocument();
    expect(textarea()).toBeDisabled();
    expect(textarea()).toHaveAttribute('placeholder', SELF_BOT_CHAT_LOCKED_PLACEHOLDER);
    expect(sendButton()).toBeDisabled();
    expect(quickChips()).toHaveLength(0);

    // 정본 서버에는 이 봇의 반이 없다 — 어느 문도 두드리지 않는다.
    expect(fetchChatHistory).not.toHaveBeenCalled();
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('보내기를 눌러도 전송이 나가지 않는다', async () => {
    render(<ClassbotChatPage />);
    await screen.findByText(SELF_BOT_CHAT_LOCKED_NOTICE);

    fireEvent.submit(sendButton().closest('form') as HTMLFormElement);

    expect(streamChat).not.toHaveBeenCalled();
  });
});

describe('반 봇만 있을 때', () => {
  beforeEach(() => {
    studentBots = bots([{ bot: CLASS_BOT, source: 'class' }]);
  });

  it('종전대로 기록을 읽고 입력칸이 열린다 — 안내는 없다', async () => {
    render(<ClassbotChatPage />);

    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith(CLASS_BOT.id));
    expect(textarea()).not.toBeDisabled();
    expect(screen.queryByText(SELF_BOT_CHAT_LOCKED_NOTICE)).toBeNull();
    expect(quickChips().length).toBeGreaterThan(0);
  });
});

describe('반 봇과 담은 봇이 함께 있을 때', () => {
  beforeEach(() => {
    studentBots = bots([
      { bot: CLASS_BOT, source: 'class' },
      { bot: SELF_BOT, source: 'self' },
    ]);
  });

  it('담은 봇은 선택기에 그대로 보이고, 고르면 그 순간 잠긴다 — 그 봇의 기록은 읽지 않는다', async () => {
    render(<ClassbotChatPage />);
    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith(CLASS_BOT.id));
    expect(screen.queryByText(SELF_BOT_CHAT_LOCKED_NOTICE)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: `${SELF_BOT.name} — 내가 담은 봇` }));

    expect(await screen.findByText(SELF_BOT_CHAT_LOCKED_NOTICE)).toBeInTheDocument();
    expect(textarea()).toBeDisabled();
    expect(fetchChatHistory).toHaveBeenCalledTimes(1);
    expect(fetchChatHistory).not.toHaveBeenCalledWith(SELF_BOT.id);
  });
});
