/**
 * 내 수업방 — 정본 카드(`GET /classbot/bots?role=teacher`)를 그리는지, 그리고 **없는 문을 화면에 세우지 않는지.**
 *
 * 계획 PR 5a 가 이 화면에서 한 결정 셋을 못박는다: 반 만들기 폼은 `CLASS_CREATE_AVAILABLE=false` 뒤에 있고
 * 대신 한 줄이 선다 · 명단은 카드에 없다 · 카드마다 「자세히」가 반 상세로 간다. 그리고 401 은 고장이 아니라
 * 로그인 안내다(prod-verify 익명 레인이 읽는 문구).
 */

import { render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { CLASS_CREATE_AVAILABLE, CLASS_CREATE_PENDING_NOTICE, ClassroomWorkspace } from '../classroom-workspace';

function card(id: string, name: string, profile: BotCardDto['profile']): BotCardDto {
  return { id, name, description: null, isActive: true, role: 'teacher', profile };
}

const PROFILE: NonNullable<BotCardDto['profile']> = {
  subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '안녕', scope: 3, avatarEmoji: '📐',
  quickPrompts: [], enrolledCount: 3, isLive: false, currentLesson: null,
};

let cards: BotCardDto[] = [];
let queryError: ApiError | null = null;
let pending = false;
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useOperatorClasses: () => ({
    data: queryError || pending ? undefined : cards,
    isPending: pending,
    isError: queryError !== null,
    error: queryError,
    refetch,
  }),
}));

/* 코드 상자는 어느 반 id 를 받는지만 비춘다 — 발급 자체는 `join-code-block.test.tsx`. */
jest.mock('../join-code-block', () => ({
  JoinCodeBlock: ({ classId }: { classId: string }) => <span data-testid="card-code-block">{classId}</span>,
}));

/* 폼은 그려지면 안 된다 — 그려졌는지만 알면 된다. */
jest.mock('../create-classroom-form', () => ({
  CreateClassroomForm: () => <div data-testid="create-classroom-form" />,
}));

beforeEach(() => {
  cards = [];
  queryError = null;
  pending = false;
  refetch.mockClear();
});

describe('상태', () => {
  it('401 은 고장이 아니라 로그인 안내다', () => {
    queryError = new ApiError('unauthorized', 401);
    render(<ClassroomWorkspace />);

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-error')).not.toBeInTheDocument();
  });

  it('진짜 장애(5xx)는 오류로 그리고 다시 시도를 준다', () => {
    queryError = new ApiError('서버 오류', 500);
    render(<ClassroomWorkspace />);

    expect(screen.getByTestId('classroom-error')).toHaveTextContent('서버 오류');
    expect(screen.queryByText('로그인이 필요해요')).not.toBeInTheDocument();
  });

  it('반이 없으면 빈 상태 — 반 만들기 폼은 없고 「다음 업데이트」 한 줄이 선다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.getByText('아직 연 수업방이 없어요')).toBeInTheDocument();
    expect(screen.queryByTestId('create-classroom-form')).toBeNull();
    expect(screen.getByTestId('classroom-create-pending')).toHaveTextContent(CLASS_CREATE_PENDING_NOTICE);
  });
});

describe('반 카드 — 정본 카드 한 장이 반 하나', () => {
  beforeEach(() => {
    cards = [card('cls_1', '고2 미적분 A반', PROFILE), card('cls_2', '봇 없는 반', null)];
  });

  it('반 이름 · 과목·학년 · 봇 이름을 그린다 — 봇 프로필이 없으면 「봇 없음」', () => {
    render(<ClassroomWorkspace />);

    const a = screen.getByTestId('classroom-card-cls_1');
    expect(a).toHaveTextContent('고2 미적분 A반');
    expect(a).toHaveTextContent('수학Ⅱ');
    expect(a).toHaveTextContent('고2');
    // bot == class — 봇 이름은 반 이름과 같다(`operator-class.ts`). 아바타가 앞에 붙는다.
    expect(screen.getByTestId('classroom-bot-cls_1')).toHaveTextContent('📐 고2 미적분 A반');
    expect(screen.getByTestId('classroom-bot-cls_2')).toHaveTextContent('봇 없음');
  });

  it('카드마다 그 반 id 로 코드 상자를 두고, 「자세히」는 반 상세로 간다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.getAllByTestId('card-code-block').map((el) => el.textContent)).toEqual(['cls_1', 'cls_2']);
    expect(screen.getByTestId('classroom-detail-cls_1')).toHaveAttribute('href', '/teacher/classroom/cls_1');
    expect(screen.getByRole('link', { name: '봇 없는 반 자세히' })).toHaveAttribute('href', '/teacher/classroom/cls_2');
  });

  it('명단은 카드에 없다 — 정본 문(GET /classes/:id/members)이 5b 에 온다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.queryByText('학생 명단')).toBeNull();
    expect(document.querySelector('[data-testid^="classroom-roster-toggle-"]')).toBeNull();
  });

  it('반이 있어도 반 만들기 폼은 가려져 있다', () => {
    render(<ClassroomWorkspace />);

    expect(CLASS_CREATE_AVAILABLE).toBe(false);
    expect(screen.queryByTestId('create-classroom-form')).toBeNull();
    expect(screen.queryByRole('button', { name: /수업방 만들기/ })).toBeNull();
    expect(screen.getByTestId('classroom-create-pending')).toBeInTheDocument();
  });
});
