/** ADR-094: 자습방도 생성된 classId로 기존 SSE 대화를 그대로 쓴다. */
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
import { chatLaneFor, CLASS_CHAT_TEACHER_VISIBLE_NOTICE } from '../chat-lane';
import { classBots } from '@/lib/mock/classbot';

const SELF_BOT = classBots[1];
const SELF_CLASS_ID = 'self-class-42';

function bots(): StudentBotsResult {
  return {
    slots: [{ source: 'self', bot: SELF_BOT, classId: SELF_CLASS_ID }],
    classCount: 0,
    selfCount: 1,
    isLoading: false,
    isError: false,
    retry: () => {},
  };
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Object.defineProperty(Element.prototype, 'scrollTo', { value: () => {}, writable: true });
  }
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => '00000000-0000-4000-8000-000000000001',
    configurable: true,
  });
});

beforeEach(() => {
  studentBots = bots();
  streamChat.mockClear();
  fetchChatHistory.mockClear();
});

it('자습방과 일반 반 모두 SSE 레인이다', () => {
  expect(chatLaneFor('class')).toBe('sse');
  expect(chatLaneFor('self')).toBe('sse');
});

it('자습방 classId로 히스토리를 읽고 입력을 연다', async () => {
  render(<ClassbotChatPage />);

  await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith(SELF_CLASS_ID));
  expect(screen.getByRole('textbox')).not.toBeDisabled();
  expect(screen.queryByText(CLASS_CHAT_TEACHER_VISIBLE_NOTICE)).toBeNull();
  expect(screen.queryAllByTitle(/수업 단계|자유 질문/).length).toBeGreaterThan(0);
});

it('메시지를 자습방 classId로 SSE 전송한다', async () => {
  render(<ClassbotChatPage />);
  await waitFor(() => expect(fetchChatHistory).toHaveBeenCalledWith(SELF_CLASS_ID));

  fireEvent.change(screen.getByRole('textbox'), { target: { value: '분수 알려줘' } });
  fireEvent.click(screen.getByRole('button', { name: '질문 보내기' }));

  await waitFor(() => expect(streamChat).toHaveBeenCalled());
  expect(streamChat.mock.calls[0][0]).toBe(SELF_CLASS_ID);
});
