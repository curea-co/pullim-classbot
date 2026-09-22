/**
 * 챗의 단위는 **반**이다(완성 설계 § 6.2 · 해소 3 · 계획 PR 5a).
 *
 * 화면 전체를 올려 본다 — 보는 것은 넷: 같은 봇이 두 반에 걸리면 칩도 둘이고 이름은 반 이름인 것 ·
 * 칩을 바꾸면 기록(`fetchChatHistory`)이 **그 반 id** 로 다시 읽히고 URL 이 `?classId=` 로 따라오는 것 ·
 * `?classId=` 딥링크가 반을 고르고 `?bot=` 은 그 봇의 첫 반으로 접히는 것 · 반 대화 상단에
 * 「선생님이 이 대화를 볼 수 있어요」가 서고 담은 봇에는 없는 것. 전송(`streamChat`)도 반 id 로 나간다.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { StudentBotsResult } from '@/lib/store/mode-bots';

let studentBots: StudentBotsResult;
jest.mock('@/lib/store/mode-bots', () => ({
  ...jest.requireActual('@/lib/store/mode-bots'),
  useStudentBots: () => studentBots,
}));

jest.mock('@/lib/current-user', () => ({
  ...jest.requireActual('@/lib/current-user'),
  useCurrentUser: () => ({ id: 'sub-1', role: 'student', name: '서연', isAuthenticated: true }),
}));

let search = new URLSearchParams();
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace, prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/classbot/chat',
  useSearchParams: () => search,
}));

const streamChat: jest.Mock<Promise<void>, unknown[]> = jest.fn(() => Promise.resolve());
const fetchChatHistory: jest.Mock<Promise<unknown[]>, unknown[]> = jest.fn(() => Promise.resolve([]));
jest.mock('@/lib/api/chat-stream', () => ({
  ...jest.requireActual('@/lib/api/chat-stream'),
  streamChat: (...args: unknown[]) => streamChat(...args),
  fetchChatHistory: (...args: unknown[]) => fetchChatHistory(...args),
}));

import ClassbotChatPage from '../page';
import { CLASS_CHAT_TEACHER_VISIBLE_NOTICE } from '../chat-lane';
import { classBots } from '@/lib/mock/classbot';

const BOT = classBots[0];
const SELF_BOT = classBots[1];
type Slot = StudentBotsResult['slots'][number];
/** 같은 봇이 걸린 두 반 — 봇 id 는 하나, 반 id 는 둘. */
const A: Slot = { source: 'class', bot: BOT, classId: 'cls_a', classLabel: '중2 A반' };
const B: Slot = { source: 'class', bot: BOT, classId: 'cls_b', classLabel: '중2 B반' };
const SELF: Slot = { source: 'self', bot: SELF_BOT };

function bots(slots: Slot[]): StudentBotsResult {
  return {
    slots,
    classCount: slots.filter((s) => s.source === 'class').length,
    selfCount: slots.filter((s) => s.source === 'self').length,
    isLoading: false,
    isError: false,
    retry: () => {},
  };
}

const chip = (name: string) => screen.getByRole('button', { name });
const disclosure = () => screen.queryByText(CLASS_CHAT_TEACHER_VISIBLE_NOTICE);
/** 반 칩의 이름 — 반 이름과 봇 이름이 다르므로 「반 · 봇」(`classSlotLabel`)에 그룹 이름이 붙는다. */
const CHIP_A = `중2 A반 · ${BOT.name} — 선생님 반의 봇`;
const CHIP_B = `중2 B반 · ${BOT.name} — 선생님 반의 봇`;

beforeAll(() => {
  // jsdom 에는 Element.scrollTo 가 없다 — 챗 자동 추적이 부른다.
  if (!Element.prototype.scrollTo) {
    Object.defineProperty(Element.prototype, 'scrollTo', { value: () => {}, writable: true });
  }
  // 전송은 clientTurnId 를 `crypto.randomUUID()` 로 만든다 — jsdom 에 없으면 세운다.
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (!c) {
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => 'uuid-1' }, configurable: true });
  } else if (typeof c.randomUUID !== 'function') {
    Object.defineProperty(c, 'randomUUID', { value: () => 'uuid-1', configurable: true });
  }
});

beforeEach(() => {
  search = new URLSearchParams();
  replace.mockClear();
  streamChat.mockClear();
  fetchChatHistory.mockClear();
});

describe('같은 봇이 두 반에 걸려 있을 때', () => {
  beforeEach(() => {
    studentBots = bots([A, B, SELF]);
  });

  it('칩은 반마다 하나 — 이름은 반 이름이고, 첫 반의 기록을 반 id 로 읽는다', async () => {
    render(<ClassbotChatPage />);

    expect(chip(CHIP_A)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(CHIP_B)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(`${SELF_BOT.name} — 내가 담은 봇`)).toBeInTheDocument();

    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_a'));
    expect(fetchChatHistory).not.toHaveBeenCalledWith(BOT.id);
  });

  it('다른 반을 고르면 그 반 id 로 기록을 다시 읽고 URL 은 ?classId= 로 따라온다', async () => {
    render(<ClassbotChatPage />);
    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_a'));

    fireEvent.click(chip(CHIP_B));

    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_b'));
    expect(chip(CHIP_B)).toHaveAttribute('aria-pressed', 'true');
    expect(replace).toHaveBeenCalledWith('/classbot/chat?classId=cls_b', { scroll: false });
  });

  it('전송도 반 id 로 나간다 — 봇 id 가 아니다', async () => {
    render(<ClassbotChatPage />);
    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_a'));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '일차함수가 뭐예요?' } });
    fireEvent.submit(screen.getByRole('button', { name: '질문 보내기' }).closest('form') as HTMLFormElement);

    await waitFor(() => expect(streamChat).toHaveBeenCalled());
    expect(streamChat.mock.calls[0][0]).toBe('cls_a');
    expect(streamChat.mock.calls[0][1]).toBe('일차함수가 뭐예요?');
  });
});

describe('딥링크', () => {
  beforeEach(() => {
    studentBots = bots([A, B]);
  });

  it('?classId= 는 그 반을 고른다', async () => {
    search = new URLSearchParams('classId=cls_b');
    render(<ClassbotChatPage />);

    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_b'));
    expect(fetchChatHistory).not.toHaveBeenCalledWith('cls_a');
    expect(chip(CHIP_B)).toHaveAttribute('aria-pressed', 'true');
  });

  it('종전 ?bot= 은 그 봇이 걸린 첫 반으로 접힌다 — 옛 링크가 끊기지 않는다', async () => {
    search = new URLSearchParams(`bot=${BOT.id}`);
    render(<ClassbotChatPage />);

    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_a'));
    expect(chip(CHIP_A)).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('상단 고지 「선생님이 이 대화를 볼 수 있어요」', () => {
  it('반 대화에는 처음부터 떠 있다', async () => {
    studentBots = bots([A]);
    render(<ClassbotChatPage />);
    await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith('cls_a'));

    const note = disclosure();
    expect(note).toBeInTheDocument();
    expect(note?.closest('[role="note"]')).toHaveAttribute('data-slot', 'chat-class-disclosure');
  });

  it('담은 봇에는 없다 — 보는 선생님이 없다', async () => {
    studentBots = bots([SELF]);
    render(<ClassbotChatPage />);
    await screen.findByRole('textbox');

    expect(disclosure()).toBeNull();
  });

  it('반에서 담은 봇으로 갈아타면 고지도 내려간다', async () => {
    studentBots = bots([A, SELF]);
    render(<ClassbotChatPage />);
    await waitFor(() => expect(disclosure()).toBeInTheDocument());

    fireEvent.click(chip(`${SELF_BOT.name} — 내가 담은 봇`));

    await waitFor(() => expect(disclosure()).toBeNull());
  });
});
