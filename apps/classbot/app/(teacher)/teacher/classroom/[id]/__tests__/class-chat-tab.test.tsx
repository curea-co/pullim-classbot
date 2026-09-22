/**
 * 대화 탭 — 왼쪽 목록이 명단 ∪ 신호 집계이고 미확인 많은 학생이 위인 것 · 고른 학생은 **URL**(`?student=`)이 정하는 것
 * (주소로 온 학생이 처음부터 골라져 기록이 서고, 목록에서 누르면 `router.replace` 로 주소가 바뀐다) · 「확인함」이
 * `useAckSignal.mutate` 로 학생 id 와 함께 가는 것 · 비멤버(404)는 「이 반에 기록이 없는 학생」으로 읽히는 것.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { ClassMemberDto, ClassSignalsDto, MemberMessageDto } from '@/lib/api/classbot-dto';
import { ClassChatTab, ackFailureMessage } from '../class-chat-tab';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

/** 주소의 쿼리 — 테스트가 바꾼다. 화면은 이것만 읽는다. */
let search = '';
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace, push: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/teacher/classroom/cls_1',
}));

const MEMBERS: ClassMemberDto[] = [
  { membershipId: 'm_a', memberId: 's_a', displayName: '박하늘', enrolledAt: '2026-09-01T00:00:00.000Z', isActive: true, lastActiveAt: '2026-09-17T00:50:00.000Z' },
  { membershipId: 'm_b', memberId: 's_b', displayName: '김바다', enrolledAt: '2026-09-01T00:00:00.000Z', isActive: true, lastActiveAt: null },
];
const CLASS_VIEW: ClassSignalsDto = {
  summary: [{ studentId: 's_b', counts: { answer_seeking: 2, crisis_keyword: 1 }, maxSeverity: 4, lastAt: '2026-09-17T01:00:00.000Z', unacked: 1 }],
  signals: [],
};
const STUDENT_VIEW: ClassSignalsDto = {
  summary: CLASS_VIEW.summary,
  signals: [
    { id: 'sig_1', studentId: 's_b', kind: 'answer_seeking', severity: 2, messageId: 'msg_1', detail: { rule: 'answer_seeking' }, createdAt: '2026-09-17T01:00:00.000Z', ackedBy: null, ackedAt: null },
  ],
};
const MESSAGES: MemberMessageDto[] = [
  { id: 'msg_1', role: 'user', content: '답 알려줘', createdAt: '2026-09-17T01:00:00.000Z', botId: 'bot_1', cardType: null, cardPayload: null, blockIndex: null },
  { id: 'msg_2', role: 'assistant', content: '먼저 네 생각을 말해 줄래?', createdAt: '2026-09-17T01:00:05.000Z', botId: 'bot_1', cardType: null, cardPayload: null, blockIndex: 0 },
];

let chatError: ApiError | null = null;
const chatCalls: string[] = [];
const mutate = jest.fn();

jest.mock('@/hooks/api/classroom', () => ({
  useClassMembers: () => ({ data: MEMBERS, isPending: false, isError: false, error: null, refetch: jest.fn(), dataUpdatedAt: 1 }),
}));
jest.mock('@/hooks/api/monitoring', () => ({
  useClassSignals: () => ({ data: CLASS_VIEW, isPending: false, isError: false, error: null, refetch: jest.fn(), dataUpdatedAt: 1 }),
  useStudentSignals: () => ({ data: STUDENT_VIEW, isPending: false, isError: false, error: null, refetch: jest.fn() }),
  useMemberChat: (_classId: string, studentId: string | null) => {
    if (studentId) chatCalls.push(studentId);
    return chatError
      ? { data: undefined, isPending: false, isError: true, error: chatError, refetch: jest.fn() }
      : { data: MESSAGES, isPending: false, isError: false, error: null, refetch: jest.fn() };
  },
  useAckSignal: () => ({ mutate }),
}));

beforeEach(() => {
  search = '';
  chatError = null;
  chatCalls.length = 0;
  mutate.mockReset();
  replace.mockReset();
});

describe('ClassChatTab', () => {
  it('왼쪽 목록은 명단 ∪ 집계 — 신호 있는 학생이 위, 배지가 붙는다', () => {
    render(<ClassChatTab classId="cls_1" />);

    const list = screen.getByTestId('chat-student-list');
    const names = within(list).getAllByRole('button').map((b) => b.textContent ?? '');
    expect(names[0]).toContain('김바다');
    expect(names[1]).toContain('박하늘');
    const bada = screen.getByTestId('chat-student-s_b');
    expect(bada).toHaveTextContent('답 구하기2');
    expect(bada).toHaveTextContent('위기 신호1');
    expect(within(bada).getByLabelText('세기 4 · 위험')).toBeInTheDocument();
    expect(within(bada).getByLabelText('미확인 1건')).toBeInTheDocument();
    expect(screen.getByTestId('chat-student-s_a')).toHaveTextContent('없음');
    // 고른 학생이 없으면 오른쪽은 안내다.
    expect(screen.getByText('학생을 골라 주세요')).toBeInTheDocument();
    expect(chatCalls).toHaveLength(0);
  });

  it('`?student=` 로 온 학생은 처음부터 골라져 기록과 신호가 선다 · 「확인함」은 학생 id 와 함께 mutate 로 간다', () => {
    search = 'tab=chat&student=s_b';
    render(<ClassChatTab classId="cls_1" />);

    expect(screen.getByTestId('chat-student-s_b')).toHaveAttribute('aria-pressed', 'true');
    expect(chatCalls).toEqual(['s_b']);
    const transcript = screen.getByTestId('member-transcript');
    expect(within(transcript).getByTestId('transcript-msg-msg_1')).toHaveTextContent('답 알려줘');
    expect(within(transcript).getByTestId('transcript-msg-msg_1')).toHaveTextContent('김바다');

    fireEvent.click(within(within(transcript).getByTestId('transcript-msg-msg_1')).getByTestId('signal-ack-sig_1'));
    expect(mutate).toHaveBeenCalledWith({ signalId: 'sig_1', studentId: 's_b' }, expect.any(Object));
  });

  it('학생을 누르면 주소가 바뀐다 — 화면은 주소를 읽는다', () => {
    render(<ClassChatTab classId="cls_1" />);
    fireEvent.click(screen.getByTestId('chat-student-s_a'));
    expect(replace).toHaveBeenCalledWith('/teacher/classroom/cls_1?tab=chat&student=s_a', { scroll: false });
    // 주소가 아직 안 바뀌었으니 화면도 그대로다 — 상태를 따로 들지 않는다.
    expect(screen.getByTestId('chat-student-s_a')).toHaveAttribute('aria-pressed', 'false');
    expect(chatCalls).toHaveLength(0);
  });

  it('비멤버 404 는 「이 반에 기록이 없는 학생」 — 403 은 「볼 수 없어요」', () => {
    search = 'tab=chat&student=s_b';
    chatError = new ApiError('not found', 404);
    const { unmount } = render(<ClassChatTab classId="cls_1" />);
    expect(screen.getByText('이 반에 기록이 없는 학생이에요')).toBeInTheDocument();
    unmount();

    chatError = new ApiError('forbidden', 403);
    render(<ClassChatTab classId="cls_1" />);
    expect(screen.getByText('이 대화는 볼 수 없어요')).toBeInTheDocument();
  });

  it('ackFailureMessage — 404 는 「이미 없는 신호」', () => {
    expect(ackFailureMessage(new ApiError('nope', 404))).toBe('이미 없는 신호예요.');
    expect(ackFailureMessage(new ApiError('nope', 500))).toMatch(/다시 시도/);
  });
});
