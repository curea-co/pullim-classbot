/**
 * 반 상세 — 머리는 `GET /bots/:id`, 탭은 「과제」·「대화」 둘(`../class-tabs.ts` · 계획 PR 5a · PR 7).
 *
 * 못박는 것: 머리에 반 이름·과목·학년·봇이 서는 것 · 탭이 **둘**이고 이름이 「과제」「대화」인 것(명단·봇은 5b) ·
 * 탭이 `<nav>` 안의 링크라 `?tab=` 주소와 `aria-current` 를 갖는 것 · `tab="chat"` 이면 대화 탭이 서는 것 · 과제 줄이
 * 이 반의 것만 남고 과제 상세로 가는 것 · 「새 과제 내기」가 `?classId=` 를 들고 가는 것 · 남의 반(403)과 없는 반(404)을
 * 갈라 말하는 것.
 */

import { render, screen, within } from '@testing-library/react';
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
// 대화 탭 본문은 제 테스트(`class-chat-tab.test.tsx`)가 본다 — 여기서는 「어느 반으로 섰나」만.
jest.mock('../class-chat-tab', () => ({
  ClassChatTab: ({ classId }: { classId: string }) => <div data-testid="chat-tab-stub">{classId}</div>,
}));

beforeEach(() => {
  detail = DETAIL;
  detailError = null;
  assignments = [];
});

function renderDetail(props: Partial<React.ComponentProps<typeof ClassDetail>> = {}) {
  return render(<ClassDetail classId="cls_1" tab="assignments" {...props} />);
}

/** 탭 줄 — `<nav aria-label="반 상세">` 안의 링크들. */
function tabLinks() {
  return within(screen.getByRole('navigation', { name: '반 상세' })).getAllByRole('link');
}

describe('머리', () => {
  it('반 이름 · 과목·학년 · 봇 · 참여 코드 상자가 선다', () => {
    renderDetail();

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
    const { unmount } = renderDetail();
    expect(screen.getByText('이 반은 볼 수 없어요')).toBeInTheDocument();
    unmount();

    detailError = new ApiError('not found', 404);
    renderDetail();
    expect(screen.getByText('없는 반이에요')).toBeInTheDocument();
  });

  it('401 은 로그인 안내다', () => {
    detailError = new ApiError('unauthorized', 401);
    renderDetail();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
  });
});

describe('탭', () => {
  it('탭은 「과제」「대화」 둘이고 링크다 — 명단·봇은 아직 없다', () => {
    renderDetail();

    const tabs = tabLinks();
    expect(tabs.map((t) => t.textContent)).toEqual(['과제', '대화']);
    // 링크에 `role="tab"` 을 붙이지 않는다 — 지금 탭은 `aria-current="page"` 가 말한다.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(tabs[0]).toHaveAttribute('aria-current', 'page');
    expect(tabs[1]).not.toHaveAttribute('aria-current');
    // 첫 탭은 `?tab=` 없이, 대화 탭은 `?tab=chat` — 관제소가 곧장 보낼 수 있는 주소다.
    expect(tabs[0]).toHaveAttribute('href', '/teacher/classroom/cls_1');
    expect(tabs[1]).toHaveAttribute('href', '/teacher/classroom/cls_1?tab=chat');
    expect(screen.getByTestId('class-panel-assignments')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-tab-stub')).toBeNull();
  });

  it('tab="chat" 이면 대화 탭이 열린다', () => {
    renderDetail({ tab: 'chat' });

    const tabs = tabLinks();
    expect(tabs[1]).toHaveAttribute('aria-current', 'page');
    expect(tabs[0]).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('chat-tab-stub')).toHaveTextContent('cls_1');
    expect(screen.queryByText('이 반에 낸 과제')).toBeNull();
  });

  it('과제 탭은 이 반의 과제만 — 줄은 과제 상세로, 「새 과제 내기」는 이 반을 들고 간다', () => {
    assignments = [
      assignment('as_1', 'cls_1', '일차함수 연습'),
      assignment('as_2', 'cls_other', '남의 반 과제'),
      assignment('as_3', 'cls_1', '기울기 시험'),
    ];
    renderDetail();

    expect(screen.getByTestId('class-assignment-as_1')).toHaveTextContent('일차함수 연습');
    expect(screen.getByTestId('class-assignment-as_3')).toHaveTextContent('기울기 시험');
    expect(screen.queryByText('남의 반 과제')).toBeNull();
    expect(screen.getByTestId('class-assignment-as_1').querySelector('a')).toHaveAttribute('href', '/teacher/assignment/as_1');
    expect(screen.getByTestId('class-new-assignment')).toHaveAttribute('href', '/teacher/assignment/new?classId=cls_1');
  });

  it('이 반에 과제가 없으면 빈 상태 — 거기서도 새 과제 내기로 간다', () => {
    assignments = [assignment('as_2', 'cls_other', '남의 반 과제')];
    renderDetail();

    expect(screen.getByText('이 반에 낸 과제가 없어요')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /새 과제 내기/ }).every((a) => a.getAttribute('href') === '/teacher/assignment/new?classId=cls_1')).toBe(true);
  });
});
