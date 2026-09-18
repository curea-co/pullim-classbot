/**
 * 클래스봇 운영 메인(SCR-C-17) — **이 화면이 지어낸 값을 말하지 않는다.**
 *
 * 2026-09-18 까지 이 화면은 한쪽에 정본을, 다른 쪽에 목을 나란히 세우고 있었다 —
 * 「낸 과제」 묶음은 `GET /classbot/assignments` 를 읽는데 바로 위 봇 목록과 상단 요약은
 * mock 카탈로그(`lib/mock/classbot-teacher-ops`)라, 어느 교사가 열어도 「수학봇·영어봇…
 * 운영 중 3/5개 · 등록 학생 77명」이 떴다.
 *
 * 그래서 이 파일이 세 가지를 못박는다:
 *  ① **목 문구가 화면에 없다** — 카탈로그 봇 이름 다섯, 학급 이름, 「운영 중/멈춤」 상태 말.
 *  ② **모르는 것을 0 이라 말하지 않는다** — 읽는 중·실패·다른 문이 아직 안 온 동안,
 *     화면은 「0개」·「없어요」로 넘어가지 않는다.
 *  ③ **정본이 준 값이 그대로 뜬다** — 이름·과목·학년·안전 등급·반 이름·반 인원·낸 과제 수,
 *     그리고 상단 요약 셋.
 *
 * ②·③ 이 같이 있어야 뜻이 있다 — ② 만 있으면 아무것도 안 그리는 화면이 통과하고,
 * ③ 만 있으면 목을 되돌려 놓아도 「값이 뜬다」로 통과한다.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { AssignmentSummaryDto, BotCardDto, BotDto } from '@/lib/api/classbot-dto';
import { classBots } from '@/lib/mock/classbot';
import { teacherBotOps } from '@/lib/mock/classbot-teacher-ops';
import TeacherClassbotPage from '../page';

/** 다 채운 봇 — 반 하나에 붙어 있고 안전 등급이 기본값(3)이 아니라 L4 다. */
const FULL: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근',
  greeting: null, scope: 4, avatarEmoji: '📚', quickPrompts: [],
  isPublished: false, publishedAt: null, classIds: ['cls_1'], createdAt: '', updatedAt: '',
};

/** 이름만 있는 봇 — 과목·학년이 null 이고 어느 반에도 안 붙었다. */
const BARE: BotDto = {
  id: 'bot_2', operatorId: 't1', name: '이름만 봇', subject: null, grade: null, tone: null,
  greeting: null, scope: 3, avatarEmoji: null, quickPrompts: [],
  isPublished: false, publishedAt: null, classIds: [], createdAt: '', updatedAt: '',
};

const CLASS_1: BotCardDto = {
  id: 'cls_1', name: '고2 문학 A반', description: null, isActive: true, role: 'teacher',
  profile: {
    subject: '국어', grade: '고2', tone: '친근', greeting: '', scope: 4, avatarEmoji: '📚',
    quickPrompts: [], enrolledCount: 24, isLive: false, currentLesson: null,
  },
};

const assignmentFor = (classId: string, id: string): AssignmentSummaryDto => ({
  id, classId, title: `${id} 과제`, mode: 'practice', questionCount: 2,
  subject: '국어', grade: '고2', scope: '문법', chapterFrom: null, chapterTo: null,
  achievementCodes: null, difficulty: '중', dueLabel: '오늘 23:59', dDay: 0,
  dispatchStatus: 'sent', dispatchedAt: '2026-09-16T08:00:00.000Z', examTimeLimitMin: null, state: 'todo',
});

/* ── 훅 바꿔 끼우기 ─────────────────────────────────────────── */

let bots: BotDto[] = [];
let botsPending = false;
let botsError: ApiError | null = null;
const refetch = jest.fn();
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBots: () => ({
    data: botsPending || botsError ? undefined : bots,
    isPending: botsPending,
    isError: botsError !== null,
    error: botsError,
    refetch,
  }),
}));

let assignments: AssignmentSummaryDto[] = [];
let assignmentsPending = false;
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({
    data: assignmentsPending ? undefined : assignments,
    isPending: assignmentsPending,
    isError: false,
    error: null,
  }),
}));

let opsClasses: BotCardDto[] | undefined = [];
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({
    data: opsClasses,
    isPending: opsClasses === undefined,
    isError: false,
    error: null,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/teacher/classbot',
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  bots = [FULL, BARE];
  botsPending = false;
  botsError = null;
  assignments = [];
  assignmentsPending = false;
  opsClasses = [CLASS_1];
});

/**
 * 상단 요약 묶음 — 없으면 `null`.
 * **화면 전체에서 라벨로 찾으면 헛돈다** — 「내 봇」은 아래 섹션 제목이기도 하고 「낸 과제」는
 * 그 아래 섹션 제목이기도 하다. 「붙은 학급」만 이 묶음에만 있어서 그것으로 묶음을 집는다.
 */
function statBar(): HTMLElement | null {
  return screen.queryByText('붙은 학급')?.closest('ul') ?? null;
}

/** 상단 요약 한 칸의 값 — KpiStat·KpiStatLink 둘 다 라벨과 값이 한 `<li>` 안에 있다 */
function kpi(label: string): string {
  return within(statBar()!).getByText(label).closest('li')!.textContent ?? '';
}

/* ── ① 목 문구가 화면에 없다 ─────────────────────────────── */

describe('목이 화면에 남아 있지 않다', () => {
  it('카탈로그 봇 이름 다섯과 그 학급 이름이 한 글자도 뜨지 않는다', () => {
    render(<TeacherClassbotPage />);

    // `수학봇`·`영어봇`·`과학봇`·`국어봇`·`사회봇` — 목록을 여기 베껴 적지 않는다.
    // 카탈로그가 바뀌면 이 단정도 같이 움직여야 하기 때문이다.
    for (const bot of classBots) {
      expect(screen.queryByText(bot.name)).not.toBeInTheDocument();
    }
    // `중2 수학 A반`·`중3 국어 B반` 같은 목 학급 이름도 마찬가지다.
    for (const room of teacherBotOps.flatMap(o => o.classrooms)) {
      expect(screen.queryByText(room.label)).not.toBeInTheDocument();
    }
  });

  it('봇이 지금 도는지를 말하지 않는다 — 정본에 그 칸이 없다', () => {
    render(<TeacherClassbotPage />);

    // 상태 칩(「운영 중」·「멈춤」)과 멈춘 이유, 그리고 그 상태로 라벨이 갈리던 메뉴 항목
    expect(screen.queryByText('운영 중')).not.toBeInTheDocument();
    expect(screen.queryByText('멈춤')).not.toBeInTheDocument();
    for (const ops of teacherBotOps) {
      if (ops.pauseReason) expect(screen.queryByText(ops.pauseReason)).not.toBeInTheDocument();
    }
  });

  it('더보기 안에 「봇 멈추기 / 다시 돌리기」가 없다', () => {
    render(<TeacherClassbotPage />);
    fireEvent.click(screen.getByRole('button', { name: `${FULL.name} 더보기` }));

    const menu = screen.getByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: /멈추기/ })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /다시 돌리기/ })).not.toBeInTheDocument();
    // 남은 셋은 그대로다 — 「아무것도 없어서 통과」를 막는다
    expect(within(menu).getByRole('menuitem', { name: '수정하기' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: '과제 내기' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: '봇 삭제' })).toBeInTheDocument();
  });
});

/* ── ② 모르는 것을 0 이라 말하지 않는다 ───────────────────── */

describe('모르는 동안에는 숫자도 빈 상태도 말하지 않는다', () => {
  it('봇 목록을 읽는 중이면 상단 요약이 아예 서지 않는다', () => {
    botsPending = true;
    render(<TeacherClassbotPage />);

    expect(screen.getByTestId('bot-ops-loading')).toBeInTheDocument();
    expect(statBar()).toBeNull();
    // 「0개」로 넘어가지 않는다 — 이 화면에 0 으로 끝나는 숫자 자체가 없어야 한다
    expect(screen.queryByText(/(?<!\d)0개/)).not.toBeInTheDocument();
    // 「봇이 없다」고도 말하지 않는다
    expect(screen.queryByText('아직 만든 봇이 없어요')).not.toBeInTheDocument();
  });

  it('세션이 끊기면 로그인 안내, 그 밖의 실패면 다시 시도 — 어느 쪽도 「봇 0개」가 아니다', () => {
    botsError = new ApiError('unauthorized', 401);
    const { unmount } = render(<TeacherClassbotPage />);
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.queryByText('아직 만든 봇이 없어요')).not.toBeInTheDocument();
    expect(statBar()).toBeNull();
    unmount();

    botsError = new ApiError('boom', 500);
    render(<TeacherClassbotPage />);
    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    expect(screen.queryByText('아직 만든 봇이 없어요')).not.toBeInTheDocument();
  });

  it('낸 과제를 아직 못 읽었으면 그 칸도 카드의 한 줄도 뜨지 않는다', () => {
    assignmentsPending = true;
    render(<TeacherClassbotPage />);

    // 상단 요약은 두 칸으로 선다 — 봇은 읽었으므로 「내 봇」·「붙은 학급」은 말할 수 있다
    const bar = statBar()!;
    expect(within(bar).getByText('내 봇')).toBeInTheDocument();
    expect(within(bar).queryByText('낸 과제')).not.toBeInTheDocument();
    // 카드 바닥의 「아직 낸 과제가 없어요」도 뜨지 않는다 — 없는 게 아니라 모르는 것이다
    expect(screen.queryByText('아직 낸 과제가 없어요')).not.toBeInTheDocument();
  });

  it('반 목록을 아직 못 읽어도 「붙은 학급이 없다」고 말하지 않는다', () => {
    opsClasses = undefined;
    render(<TeacherClassbotPage />);

    const attached = screen.getByTestId(`bot-ops-card-${FULL.id}`);
    expect(within(attached).queryByText('아직 붙은 학급이 없어요')).not.toBeInTheDocument();
    expect(within(attached).getByText(/반 이름을 아직 못 읽었어요/)).toBeInTheDocument();
    // 붙은 학급 수는 봇 행의 `classIds` 가 아는 값이라 반 목록 없이도 그대로 센다
    expect(kpi('붙은 학급')).toMatch(/(?<!\d)1개/);

    // 정말로 안 붙은 봇에서는 그 빈 상태가 뜬다 — 위 단정이 「아무 데도 안 뜬다」로 통과하지 않게
    const bare = screen.getByTestId(`bot-ops-card-${BARE.id}`);
    expect(within(bare).getByText('아직 붙은 학급이 없어요')).toBeInTheDocument();
  });
});

/* ── ③ 정본이 준 값이 그대로 뜬다 ─────────────────────────── */

describe('정본이 준 값이 그대로 뜬다', () => {
  beforeEach(() => {
    assignments = [assignmentFor('cls_1', 'as_1'), assignmentFor('cls_1', 'as_2')];
  });

  it('봇 줄은 이름·과목·학년·안전 등급을 정본 값 그대로 말한다', () => {
    render(<TeacherClassbotPage />);

    const card = screen.getByTestId(`bot-ops-card-${FULL.id}`);
    expect(within(card).getByRole('heading', { name: FULL.name })).toBeInTheDocument();
    expect(within(card).getByText('국어 · 고2')).toBeInTheDocument();
    // `scope: 4` → L4 교육 범위 (`lib/mock/tutor.ts` 의 표)
    expect(within(card).getByText('L4')).toBeInTheDocument();
    expect(within(card).getByText(/교육 범위/)).toBeInTheDocument();

    // 없는 칸은 통째로 뺀다 — 가운뎃점만 남은 줄(`· `)을 그리지 않는다
    const bare = screen.getByTestId(`bot-ops-card-${BARE.id}`);
    expect(within(bare).getByRole('heading', { name: BARE.name })).toBeInTheDocument();
    expect(within(bare).queryByText(/·/)).not.toBeInTheDocument();
    expect(within(bare).getByText('L3')).toBeInTheDocument();
  });

  it('붙은 반은 반 목록의 이름과 그 반의 인원을 그대로 쓴다', () => {
    render(<TeacherClassbotPage />);

    const card = screen.getByTestId(`bot-ops-card-${FULL.id}`);
    expect(within(card).getByText(CLASS_1.name)).toBeInTheDocument();
    expect(within(card).getByText('24명')).toBeInTheDocument();
    // 반이 하나뿐인데 같은 숫자를 합계로 한 번 더 적지 않는다
    expect(within(card).queryByText(/모두 \d+명/)).not.toBeInTheDocument();
  });

  it('반 프로필이 없어 인원을 모르는 반은 숫자를 지어내지 않는다', () => {
    opsClasses = [{ ...CLASS_1, profile: null }];
    render(<TeacherClassbotPage />);

    const card = screen.getByTestId(`bot-ops-card-${FULL.id}`);
    expect(within(card).getByText(CLASS_1.name)).toBeInTheDocument();
    expect(within(card).queryByText(/\d+명/)).not.toBeInTheDocument();
  });

  it('낸 과제 수는 그 봇이 붙은 반의 과제만 센다', () => {
    // 내 다른 반(`cls_9`)의 과제 한 건 — 어느 봇에도 붙어 있지 않다
    assignments = [...assignments, assignmentFor('cls_9', 'as_other')];
    render(<TeacherClassbotPage />);

    expect(within(screen.getByTestId(`bot-ops-card-${FULL.id}`)).getByText(/낸 과제/))
      .toHaveTextContent('낸 과제 2건');
    // 안 붙은 봇은 0 건이고, 그건 「모른다」가 아니라 실제로 0 이다
    expect(within(screen.getByTestId(`bot-ops-card-${BARE.id}`)).getByText('아직 낸 과제가 없어요'))
      .toBeInTheDocument();
    // 상단 「낸 과제」는 정본 목록 전부다 — 도착지 `/teacher/assignment` 의 「전체」와 같은 셈
    expect(kpi('낸 과제')).toMatch(/(?<!\d)3건/);
  });

  it('상단 요약 셋은 정본 목록에서 센 값이다', () => {
    render(<TeacherClassbotPage />);

    expect(kpi('내 봇')).toMatch(/(?<!\d)2개/);
    expect(kpi('붙은 학급')).toMatch(/(?<!\d)1개/);
    expect(kpi('낸 과제')).toMatch(/(?<!\d)2건/);
  });
});
