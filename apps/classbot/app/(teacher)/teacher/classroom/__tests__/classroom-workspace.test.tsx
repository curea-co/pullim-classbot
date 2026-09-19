/**
 * 내 수업방 — 정본 카드(`GET /classbot/bots?role=teacher`)를 그리고, 반 만들기 폼이 **늘** 서 있고, 만든 반의 첫 코드가
 * 배너와 그 반의 카드에 서는지.
 *
 * 계획 PR 5a 가 「없는 문을 화면에 세우지 않는다」로 폼을 가렸고, 5b 가 정본 문(`POST /classes`)에 붙여 그 가림막
 * (`CLASS_CREATE_AVAILABLE`)을 걷었다 — 「다음 업데이트」 한 줄은 이제 없어야 한다. 카드의 봇 칩은 **아는 `ClassDto`**
 * 로만 그린다(모르면 없음 · 없으면 「봇 없음」 · 있으면 이름 — 옛 profile 로 단정하지 않는다). 명단은 여전히 카드에 없다
 * (반 상세 탭). 401 은 고장이 아니라 로그인 안내다(prod-verify 익명 레인이 읽는 문구).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { BotCardDto, ClassDto, JoinCodeDto } from '@/lib/api/classbot-dto';
import type { CreatedClassroom } from '../create-classroom-form';
import { ClassroomWorkspace } from '../classroom-workspace';

/**
 * 정본 카드 한 장(pullim-api #679 이후) — 두 번째 인자가 **반 이름**(`className`)이고 봇 이름은
 * 「…의 봇」으로 **다른 글자**가 된다. 둘에 같은 글자를 넣으면 카드 제목이 어느 칸을 읽든 통과해
 * 「목록 제목은 반 이름이다」가 하중을 안 받는다.
 */
function card(id: string, className: string, profile: BotCardDto['profile']): BotCardDto {
  return {
    id,
    botId: `bot_${id}`,
    name: `${className}의 봇`,
    className,
    description: null,
    isActive: true,
    role: 'teacher',
    profile,
  };
}

const PROFILE: NonNullable<BotCardDto['profile']> = {
  subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '안녕', scope: 3, avatarEmoji: '📐',
  quickPrompts: [], enrolledCount: 3, isLive: false, currentLesson: null,
};

function knownClass(id: string, bot: ClassDto['bot'], joinCode: JoinCodeDto | null = null): ClassDto {
  return {
    id, operatorId: 't1', orgId: null, name: '반', description: null, subject: null, grade: null, isActive: true,
    bot, joinCode, createdAt: '', updatedAt: '',
  };
}

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

let cards: BotCardDto[] = [];
let queryError: ApiError | null = null;
let pending = false;
/** 이 세션이 아는 반 요약(반 id → ClassDto) — 만든 반의 첫 코드·붙인 봇이 카드에 서는지 본다. */
let knownById: Record<string, ClassDto> = {};
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useOperatorClasses: () => ({
    data: queryError || pending ? undefined : cards,
    isPending: pending,
    isError: queryError !== null,
    error: queryError,
    refetch,
  }),
  useClassDetail: (id: string) => ({ data: knownById[id] }),
}));

/* 코드 상자는 어느 반 id 와 어느 초기 코드를 받는지만 비춘다 — 발급 자체는 `join-code-block.test.tsx`. */
jest.mock('../join-code-block', () => ({
  JoinCodeBlock: ({ classId, initial }: { classId: string; initial: JoinCodeDto | null }) => (
    <span data-testid="card-code-block">{classId}:{initial?.code ?? '-'}</span>
  ),
}));

/* 폼은 제 테스트가 있다(`create-classroom-form.test.tsx`) — 여기서는 「만들었다」를 위로 올리는 길만 흉내 낸다. */
const CREATED: CreatedClassroom = {
  classId: 'cls_9',
  name: '새 반',
  joinCode: { id: 'jc_9', code: 'ZZ9Q2R', classId: 'cls_9', createdAt: '2026-09-17T00:00:00.000Z', expiresAt: hoursFromNow(48) },
};
jest.mock('../create-classroom-form', () => ({
  CreateClassroomForm: ({ onCreated }: { onCreated: (c: CreatedClassroom) => void }) => (
    <button type="button" data-testid="create-classroom-form" onClick={() => onCreated(CREATED)}>
      폼
    </button>
  ),
}));

beforeEach(() => {
  cards = [];
  queryError = null;
  pending = false;
  knownById = {};
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

  it('반이 없으면 빈 상태 — 반 만들기 폼은 그 아래 서 있고 「다음 업데이트」 한 줄은 없다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.getByText('아직 연 수업방이 없어요')).toBeInTheDocument();
    expect(screen.getByTestId('create-classroom-form')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-create-pending')).toBeNull();
    expect(screen.queryByText(/다음 업데이트/)).toBeNull();
  });
});

describe('반 카드 — 정본 카드 한 장이 반 하나', () => {
  beforeEach(() => {
    cards = [card('cls_1', '고2 미적분 A반', PROFILE), card('cls_2', '봇 없는 반', null)];
  });

  it('반 이름 · 과목·학년을 그린다 — 봇을 모르면 칩이 없다(옛 profile 로 「봇 없음」을 단정하지 않는다)', () => {
    render(<ClassroomWorkspace />);

    const a = screen.getByTestId('classroom-card-cls_1');
    expect(a).toHaveTextContent('고2 미적분 A반');
    // 카드 제목은 **반** 이름이다 — `card.name`(봇 이름)을 쓰면 여기가 「…의 봇」이 된다(#679).
    expect(a).not.toHaveTextContent('고2 미적분 A반의 봇');
    expect(a).toHaveTextContent('수학Ⅱ');
    expect(a).toHaveTextContent('고2');
    expect(screen.queryByTestId('classroom-bot-cls_1')).toBeNull();
    expect(screen.queryByTestId('classroom-bot-cls_2')).toBeNull();
    expect(screen.queryByText('봇 없음')).toBeNull();
  });

  it('아는 반은 봇 칩이 사실을 말한다 — 없으면 「봇 없음」, 있으면 아바타와 이름', () => {
    knownById = {
      cls_1: knownClass('cls_1', { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' }),
      cls_2: knownClass('cls_2', null),
    };
    render(<ClassroomWorkspace />);

    expect(screen.getByTestId('classroom-bot-cls_1')).toHaveTextContent('📚 문학 도우미');
    expect(screen.getByTestId('classroom-bot-cls_2')).toHaveTextContent('봇 없음');
  });

  it('카드마다 그 반 id 로 코드 상자를 두고, 「자세히」는 반 상세(첫 탭)로 간다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.getAllByTestId('card-code-block').map((el) => el.textContent)).toEqual(['cls_1:-', 'cls_2:-']);
    expect(screen.getByTestId('classroom-detail-cls_1')).toHaveAttribute('href', '/teacher/classroom/cls_1');
    expect(screen.getByRole('link', { name: '봇 없는 반 자세히' })).toHaveAttribute('href', '/teacher/classroom/cls_2');
  });

  it('이 세션이 아는 활성 코드가 있는 반은 그 코드로 상자가 선다', () => {
    knownById = {
      cls_2: knownClass('cls_2', null, { id: 'jc_2', code: 'AB3K9M', classId: 'cls_2', createdAt: '', expiresAt: null }),
    };
    render(<ClassroomWorkspace />);
    expect(screen.getAllByTestId('card-code-block').map((el) => el.textContent)).toEqual(['cls_1:-', 'cls_2:AB3K9M']);
  });

  it('명단은 카드에 없다 — 반 상세 「명단」 탭이 그린다', () => {
    render(<ClassroomWorkspace />);

    expect(screen.queryByText('학생 명단')).toBeNull();
    expect(document.querySelector('[data-testid^="classroom-roster-toggle-"]')).toBeNull();
  });

  it('반이 있어도 반 만들기 폼은 서 있다', () => {
    render(<ClassroomWorkspace />);
    expect(screen.getByTestId('create-classroom-form')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-create-pending')).toBeNull();
  });
});

describe('반을 만들면', () => {
  it('배너가 첫 코드와 닫히는 시각을 크게 들고 새 반의 「봇」 탭으로 가는 길을 준다 — 닫으면 사라진다', () => {
    render(<ClassroomWorkspace />);
    expect(screen.queryByTestId('classroom-created')).toBeNull();

    fireEvent.click(screen.getByTestId('create-classroom-form'));

    expect(screen.getByText('「새 반」 반을 만들었어요')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-created-code')).toHaveTextContent('ZZ9-Q2R');
    expect(screen.getByTestId('classroom-created-life')).toHaveTextContent('쓸 수 있어요');
    expect(screen.getByTestId('classroom-created-detail')).toHaveAttribute('href', '/teacher/classroom/cls_9?tab=bot');

    fireEvent.click(screen.getByRole('button', { name: '배너 닫기' }));
    expect(screen.queryByTestId('classroom-created')).toBeNull();
  });
});
