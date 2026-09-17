/**
 * 반 상세 — 머리는 `GET /bots/:id`, 탭은 `?tab=` 링크 넷(명단 · 봇 · 과제 · 대화 — `../class-tabs.ts` · 5b · 5a · PR 7).
 *
 * 못박는 것: 머리에 반 이름·과목·학년이 서고 **봇 칩은 아는 `ClassDto` 로만** 그리는 것(모르면 칩 없음 · 없으면 「봇 없음」 ·
 * 있으면 이름 — 「봇」 탭과 같은 원천이라 같은 화면에서 반대 말을 하지 않는다) · 탭이 `<nav>` 안의 **링크**라 `?tab=` 주소와
 * `aria-current` 를 갖는 것(`role="tab"` 은 붙이지 않는다) · 열린 탭의 판만 그려지는 것 · 과제 줄이 이 반의 것만 남고
 * 과제 상세로 가는 것 · 「새 과제 내기」가 `?classId=` 를 들고 가는 것 · 코드 상자가 아는 활성 코드로 미리 채워지는 것 ·
 * 남의 반(403)과 없는 반(404)을 갈라 말하는 것.
 */

import { render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { AssignmentSummaryDto, BotDetailDto, ClassDto, JoinCodeDto } from '@/lib/api/classbot-dto';
import { ClassDetail } from '../class-detail';
import type { ClassTabId } from '../class-tabs';

const DETAIL: BotDetailDto = {
  id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, operatorId: 't1',
  profile: {
    subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '📐',
    quickPrompts: [], enrolledCount: 3, isLive: false, currentLesson: null,
  },
};

const KNOWN: ClassDto = {
  id: 'cls_1', operatorId: 't1', orgId: null, name: '고2 미적분 A반', description: null, subject: null, grade: null,
  isActive: true, bot: null, createdAt: '', updatedAt: '',
  joinCode: { id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '', expiresAt: null },
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
let known: ClassDto | undefined;
jest.mock('@/hooks/api/classroom', () => ({
  useOperatorClass: () => ({
    data: detailError ? undefined : detail,
    isPending: detail === null && detailError === null,
    isError: detailError !== null,
    error: detailError,
    refetch: jest.fn(),
  }),
  useClassDetail: () => ({ data: known }),
}));
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: assignments, isPending: false, isError: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../../join-code-block', () => ({
  JoinCodeBlock: ({ classId, initial }: { classId: string; initial: JoinCodeDto | null }) => (
    <span data-testid="detail-code-block">{classId}:{initial?.code ?? '-'}</span>
  ),
}));
/* 명단·봇·대화 탭은 제 테스트가 있다(`classroom-roster.test.tsx` · `class-bot-tab.test.tsx` · `class-chat-tab.test.tsx`) — 여기서는 어느 반을 받는지만. */
jest.mock('../classroom-roster', () => ({
  ClassroomRoster: ({ classId, classroomName }: { classId: string; classroomName: string }) => (
    <div data-testid="roster-stub">{classId}/{classroomName}</div>
  ),
}));
jest.mock('../class-bot-tab', () => ({
  ClassBotTab: ({ classId }: { classId: string }) => <div data-testid="bot-tab-stub">{classId}</div>,
}));
jest.mock('../class-chat-tab', () => ({
  ClassChatTab: ({ classId }: { classId: string }) => <div data-testid="chat-tab-stub">{classId}</div>,
}));

const detailAt = (tab: ClassTabId = 'members') => render(<ClassDetail classId="cls_1" tab={tab} />);

/** 탭 줄 — `<nav aria-label="반 상세">` 안의 링크들. */
function tabLinks() {
  return within(screen.getByRole('navigation', { name: '반 상세' })).getAllByRole('link');
}

beforeEach(() => {
  detail = DETAIL;
  detailError = null;
  assignments = [];
  known = undefined;
});

describe('머리', () => {
  it('반 이름 · 과목·학년 · 참여 코드 상자가 선다 — 봇을 모르면 봇 칩은 없다(「봇 없음」이라 하지 않는다)', () => {
    detailAt();

    expect(screen.getByRole('heading', { level: 1, name: '고2 미적분 A반' })).toBeInTheDocument();
    const facts = screen.getByTestId('class-facts');
    expect(facts).toHaveTextContent('수학Ⅱ');
    expect(facts).toHaveTextContent('고2');
    expect(screen.queryByTestId('class-bot-chip')).toBeNull();
    expect(facts).not.toHaveTextContent('봇 없음');
    expect(screen.getByTestId('detail-code-block')).toHaveTextContent('cls_1:-');
    expect(screen.getByRole('link', { name: '내 수업방' })).toHaveAttribute('href', '/teacher/classroom');
  });

  it('아는 반이 봇이 없으면 「봇 없음」, 봇이 있으면 아바타와 이름 — 코드 상자도 아는 코드로 선다', () => {
    known = KNOWN;
    const { unmount } = detailAt();
    expect(screen.getByTestId('class-bot-chip')).toHaveTextContent('봇 없음');
    expect(screen.getByTestId('detail-code-block')).toHaveTextContent('cls_1:AB3K9M');
    unmount();

    known = { ...KNOWN, bot: { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' } };
    detailAt();
    expect(screen.getByTestId('class-bot-chip')).toHaveTextContent('📚 문학 도우미');
    expect(screen.getByTestId('class-facts')).not.toHaveTextContent('봇 없음');
  });

  it('남의 반(403)은 「볼 수 없어요」, 없는 반(404)은 「없는 반이에요」 — 갈라 말한다', () => {
    detailError = new ApiError('forbidden', 403);
    const { unmount } = detailAt();
    expect(screen.getByText('이 반은 볼 수 없어요')).toBeInTheDocument();
    unmount();

    detailError = new ApiError('not found', 404);
    detailAt();
    expect(screen.getByText('없는 반이에요')).toBeInTheDocument();
  });

  it('401 은 로그인 안내다', () => {
    detailError = new ApiError('unauthorized', 401);
    detailAt();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
  });
});

describe('탭 — 링크', () => {
  it('탭은 명단 · 봇 · 과제 · 대화 넷 — 그 순서이고 각각 제 주소를 가진 링크다 · role="tab" 은 붙이지 않는다', () => {
    detailAt();

    const tabs = tabLinks();
    expect(tabs.map((t) => t.textContent)).toEqual(['명단', '봇', '과제', '대화']);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByTestId('class-tab-members')).toHaveAttribute('href', '/teacher/classroom/cls_1');
    expect(screen.getByTestId('class-tab-bot')).toHaveAttribute('href', '/teacher/classroom/cls_1?tab=bot');
    expect(screen.getByTestId('class-tab-assignments')).toHaveAttribute('href', '/teacher/classroom/cls_1?tab=assignments');
    expect(screen.getByTestId('class-tab-chat')).toHaveAttribute('href', '/teacher/classroom/cls_1?tab=chat');
  });

  it('명단 탭(첫 탭) — aria-current 가 명단에 서고 그 반의 명단이 그려지며 다른 판은 없다', () => {
    detailAt('members');

    expect(screen.getByTestId('class-tab-members')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('class-tab-bot')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('roster-stub')).toHaveTextContent('cls_1/고2 미적분 A반');
    expect(screen.getByTestId('class-panel-members')).toBeInTheDocument();
    expect(screen.queryByTestId('bot-tab-stub')).toBeNull();
    expect(screen.queryByTestId('chat-tab-stub')).toBeNull();
    expect(screen.queryByTestId('class-new-assignment')).toBeNull();
  });

  it('봇 탭(?tab=bot) — 그 반의 봇 탭이 선다', () => {
    detailAt('bot');

    expect(screen.getByTestId('class-tab-bot')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('bot-tab-stub')).toHaveTextContent('cls_1');
    expect(screen.queryByTestId('roster-stub')).toBeNull();
  });

  it('대화 탭(?tab=chat) — 그 반의 대화 탭이 선다', () => {
    detailAt('chat');

    expect(screen.getByTestId('class-tab-chat')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('class-tab-members')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('chat-tab-stub')).toHaveTextContent('cls_1');
    expect(screen.queryByText('이 반에 낸 과제')).toBeNull();
  });

  it('과제 탭은 이 반의 과제만 — 줄은 과제 상세로, 「새 과제 내기」는 이 반을 들고 간다', () => {
    assignments = [
      assignment('as_1', 'cls_1', '일차함수 연습'),
      assignment('as_2', 'cls_other', '남의 반 과제'),
      assignment('as_3', 'cls_1', '기울기 시험'),
    ];
    detailAt('assignments');

    expect(screen.getByTestId('class-tab-assignments')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('class-assignment-as_1')).toHaveTextContent('일차함수 연습');
    expect(screen.getByTestId('class-assignment-as_3')).toHaveTextContent('기울기 시험');
    expect(screen.queryByText('남의 반 과제')).toBeNull();
    expect(screen.getByTestId('class-assignment-as_1').querySelector('a')).toHaveAttribute('href', '/teacher/assignment/as_1');
    expect(screen.getByTestId('class-new-assignment')).toHaveAttribute('href', '/teacher/assignment/new?classId=cls_1');
  });

  it('이 반에 과제가 없으면 빈 상태 — 거기서도 새 과제 내기로 간다', () => {
    assignments = [assignment('as_2', 'cls_other', '남의 반 과제')];
    detailAt('assignments');

    expect(screen.getByText('이 반에 낸 과제가 없어요')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /새 과제 내기/ }).every((a) => a.getAttribute('href') === '/teacher/assignment/new?classId=cls_1')).toBe(true);
  });
});
