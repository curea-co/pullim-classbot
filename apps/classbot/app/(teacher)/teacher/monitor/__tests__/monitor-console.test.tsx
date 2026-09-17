/**
 * 관제소 — 내 반 중 하나를 고르면(`?class=` 또는 첫 반) 그 반의 명단 ∪ 신호 집계가 표로 서고, 요약 넉 칸이 표와 같은
 * 수를 말하며, 줄이 반 상세 「대화」 탭으로 그 학생을 고른 채 가는 것. 401 은 로그인 안내, 반이 없으면 내 수업방으로.
 * 목 스냅샷(`lib/mock/classbot-monitoring`)은 더 읽지 않는다.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotCardDto, ClassMemberDto, ClassSignalsDto } from '@/lib/api/classbot-dto';
import { MonitorConsole } from '../monitor-console';

const CLASSES: BotCardDto[] = [
  { id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher', profile: null },
  { id: 'cls_2', name: '고2 미적분 B반', description: null, isActive: true, role: 'teacher', profile: null },
];
const MEMBERS: Record<string, ClassMemberDto[]> = {
  cls_1: [
    { membershipId: 'm_a', memberId: 's_a', displayName: '박하늘', enrolledAt: '2026-09-01T00:00:00.000Z', isActive: true, lastActiveAt: '2026-09-17T00:50:00.000Z' },
    { membershipId: 'm_b', memberId: 's_b', displayName: '김바다', enrolledAt: '2026-09-01T00:00:00.000Z', isActive: true, lastActiveAt: null },
  ],
  cls_2: [],
};
const SIGNALS: Record<string, ClassSignalsDto> = {
  cls_1: {
    summary: [
      { studentId: 's_b', counts: { crisis_keyword: 1 }, maxSeverity: 4, lastAt: '2026-09-17T01:00:00.000Z', unacked: 1 },
      { studentId: 's_a', counts: { nonsense: 2 }, maxSeverity: 1, lastAt: '2026-09-16T01:00:00.000Z', unacked: 2 },
    ],
    signals: [],
  },
  cls_2: { summary: [], signals: [] },
};

let classesError: ApiError | null = null;
let classes: BotCardDto[] = CLASSES;
const boardCalls: string[] = [];

jest.mock('@/hooks/api/classroom', () => ({
  useOperatorClasses: () => ({
    data: classesError ? undefined : classes,
    isPending: false,
    isError: classesError !== null,
    error: classesError,
    refetch: jest.fn(),
  }),
  useClassMembers: (classId: string) => {
    boardCalls.push(classId);
    return { data: MEMBERS[classId] ?? [], isPending: false, isError: false, error: null, refetch: jest.fn() };
  },
}));
jest.mock('@/hooks/api/monitoring', () => ({
  useClassSignals: (classId: string) => ({ data: SIGNALS[classId] ?? { summary: [], signals: [] }, isPending: false, isError: false, error: null, refetch: jest.fn() }),
}));

beforeEach(() => {
  classesError = null;
  classes = CLASSES;
  boardCalls.length = 0;
});

function rows() {
  const table = screen.getByRole('table', { name: '학생 한 줄 보기' });
  return within(within(table).getAllByRole('rowgroup')[1]).getAllByRole('row');
}

describe('MonitorConsole', () => {
  it('첫 반이 골라지고, 요약 넉 칸과 표가 같은 수를 말한다 — 미확인 많은 학생이 위', () => {
    render(<MonitorConsole initialClassId={null} />);

    expect(within(screen.getByTestId('monitor-class-picker')).getByRole('button', { name: /A반/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('학생').nextSibling).toHaveTextContent('2명');
    expect(screen.getByText('신호 있는 학생').nextSibling).toHaveTextContent('2명');
    expect(screen.getByText('미확인 신호').nextSibling).toHaveTextContent('3건');
    expect(screen.getByText('세기 4 이상').nextSibling).toHaveTextContent('1명');

    const list = rows();
    expect(list).toHaveLength(2);
    // 미확인 2건인 박하늘이 위, 세기 4 인 김바다가 다음.
    expect(list[0]).toHaveTextContent('박하늘');
    expect(list[1]).toHaveTextContent('김바다');
    expect(list[1]).toHaveAttribute('data-high', 'true');
    expect(within(list[1]).getByLabelText('세기 4 · 위험')).toBeInTheDocument();
    // 머리글은 눈에 보이고, 목 표의 도달·목표·지름길·이탈 열은 없다.
    const headers = within(screen.getByRole('table', { name: '학생 한 줄 보기' })).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['이름', '신호', '세기', '확인', '최근 신호', '최근 활동', '']);
  });

  it('줄은 반 상세 「대화」 탭으로 그 학생을 고른 채 간다', () => {
    render(<MonitorConsole initialClassId={null} />);
    for (const row of rows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/classroom\/cls_1\?tab=chat&student=s_[ab]$/);
    }
  });

  it('`?class=` 가 내 반이면 그 반을, 아니면 첫 반을 연다 · 알약으로 반을 바꾼다', () => {
    const { unmount } = render(<MonitorConsole initialClassId="cls_2" />);
    expect(boardCalls[0]).toBe('cls_2');
    expect(screen.getByText('아직 들어온 학생이 없어요')).toBeInTheDocument();
    unmount();

    render(<MonitorConsole initialClassId="cls_stranger" />);
    expect(boardCalls.at(-1)).toBe('cls_1');
    fireEvent.click(screen.getByRole('button', { name: /B반/ }));
    expect(boardCalls.at(-1)).toBe('cls_2');
  });

  it('401 은 로그인 안내, 반이 없으면 내 수업방으로 보낸다', () => {
    classesError = new ApiError('unauthorized', 401);
    const { unmount } = render(<MonitorConsole initialClassId={null} />);
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    unmount();

    classesError = null;
    classes = [];
    render(<MonitorConsole initialClassId={null} />);
    expect(screen.getByText('내 반이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 수업방' })).toHaveAttribute('href', '/teacher/classroom');
  });
});
