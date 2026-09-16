/**
 * 반 상세 — 머리는 `GET /bots/:id`, 탭은 「과제」 하나(계획 PR 5a · `../page.tsx` 머리주석).
 *
 * 못박는 것: 머리에 반 이름·과목·학년·봇이 서는 것 · 탭이 **하나뿐**이고 이름이 「과제」인 것(명단·봇·대화는
 * 5b·PR 7) · 과제 줄이 이 반의 것만 남고 과제 상세로 가는 것 · 「새 과제 내기」가 `?classId=` 를 들고 가는 것 ·
 * 남의 반(403)과 없는 반(404)을 갈라 말하는 것.
 */

import { render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { AssignmentSummaryDto, BotDetailDto } from '@/lib/api/classbot-dto';
import { ClassDetail } from '../class-detail';

const DETAIL: BotDetailDto = {
  id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, operatorId: 't1',
  profile: {
    subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '📐',
    quickPrompts: [], enrolledCount: 3, isLive: false, currentLesson: null,
  },
};

function assignment(id: string, classId: string, title: string): AssignmentSummaryDto {
  return {
    id, classId, title, scope: 'unit', subject: '수학Ⅱ', grade: '고2', mode: 'practice', questionCount: 5,
    difficulty: '중', dueLabel: '9/20', dDay: 3, dispatchStatus: 'dispatched', dispatchedAt: null,
    examTimeLimitMin: null, state: 'open', chapterFrom: null, chapterTo: null, achievementCodes: null,
  };
}

let detail: BotDetailDto | null = DETAIL;
let detailError: ApiError | null = null;
let assignments: AssignmentSummaryDto[] = [];
jest.mock('@/hooks/api/classroom', () => ({
  useOperatorClass: () => ({
    data: detailError ? undefined : detail,
    isPending: detail === null && detailError === null,
    isError: detailError !== null,
    error: detailError,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: assignments, isPending: false, isError: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../../join-code-block', () => ({
  JoinCodeBlock: ({ classId }: { classId: string }) => <span data-testid="detail-code-block">{classId}</span>,
}));

beforeEach(() => {
  detail = DETAIL;
  detailError = null;
  assignments = [];
});

describe('머리', () => {
  it('반 이름 · 과목·학년 · 봇 · 참여 코드 상자가 선다', () => {
    render(<ClassDetail classId="cls_1" />);

    expect(screen.getByRole('heading', { level: 1, name: '고2 미적분 A반' })).toBeInTheDocument();
    const facts = screen.getByTestId('class-facts');
    expect(facts).toHaveTextContent('수학Ⅱ');
    expect(facts).toHaveTextContent('고2');
    expect(facts).toHaveTextContent('📐 고2 미적분 A반');
    expect(screen.getByTestId('detail-code-block')).toHaveTextContent('cls_1');
    expect(screen.getByRole('link', { name: '내 수업방' })).toHaveAttribute('href', '/teacher/classroom');
  });

  it('남의 반(403)은 「볼 수 없어요」, 없는 반(404)은 「없는 반이에요」 — 갈라 말한다', () => {
    detailError = new ApiError('forbidden', 403);
    const { unmount } = render(<ClassDetail classId="cls_1" />);
    expect(screen.getByText('이 반은 볼 수 없어요')).toBeInTheDocument();
    unmount();

    detailError = new ApiError('not found', 404);
    render(<ClassDetail classId="cls_1" />);
    expect(screen.getByText('없는 반이에요')).toBeInTheDocument();
  });

  it('401 은 로그인 안내다', () => {
    detailError = new ApiError('unauthorized', 401);
    render(<ClassDetail classId="cls_1" />);
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
  });
});

describe('탭', () => {
  it('탭은 「과제」 하나뿐이다 — 명단·봇·대화는 아직 없다', () => {
    render(<ClassDetail classId="cls_1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toHaveTextContent('과제');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    expect(screen.queryByText(/명단|대화/)).toBeNull();
  });

  it('과제 탭은 이 반의 과제만 — 줄은 과제 상세로, 「새 과제 내기」는 이 반을 들고 간다', () => {
    assignments = [
      assignment('as_1', 'cls_1', '일차함수 연습'),
      assignment('as_2', 'cls_other', '남의 반 과제'),
      assignment('as_3', 'cls_1', '기울기 시험'),
    ];
    render(<ClassDetail classId="cls_1" />);

    expect(screen.getByTestId('class-assignment-as_1')).toHaveTextContent('일차함수 연습');
    expect(screen.getByTestId('class-assignment-as_3')).toHaveTextContent('기울기 시험');
    expect(screen.queryByText('남의 반 과제')).toBeNull();
    expect(screen.getByTestId('class-assignment-as_1').querySelector('a')).toHaveAttribute('href', '/teacher/assignment/as_1');
    expect(screen.getByTestId('class-new-assignment')).toHaveAttribute('href', '/teacher/assignment/new?classId=cls_1');
  });

  it('이 반에 과제가 없으면 빈 상태 — 거기서도 새 과제 내기로 간다', () => {
    assignments = [assignment('as_2', 'cls_other', '남의 반 과제')];
    render(<ClassDetail classId="cls_1" />);

    expect(screen.getByText('이 반에 낸 과제가 없어요')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /새 과제 내기/ }).every((a) => a.getAttribute('href') === '/teacher/assignment/new?classId=cls_1')).toBe(true);
  });
});
