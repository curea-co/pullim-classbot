/**
 * 교사 홈 — **화면에 서는 값이 전부 진짜인가.**
 *
 * 이 파일은 2026-09-18 에 통째로 다시 썼다. 종전 여덟 케이스는 상단 카드 넉 장(`monitoringSummary`)과
 * 「먼저 볼 학생」 표(`pickAttentionStudents`)를 **목 값에 대고** 단언했고, 그 둘이 이 PR 에서 걷혔다.
 *
 * 종전이 지키던 것과 지금 그것을 누가 지키는가:
 *  - 「앞 세 장을 더하면 학급 전체 — 셋은 서로 배타다」 — 렌더를 안 보는 순수 데이터 불변식이라
 *    원래 자리는 `lib/mock/__tests__/classbot-monitoring.test.ts` 였다. **거기서 그대로 지킨다**
 *    (같은 합·같은 배타). 여기서는 겹쳐 세지 않는다.
 *  - 「줄 배지는 카드와 같은 판정을 쓴다」·「머리글이 화면 순서대로」 외 다섯 — 표가 사라지며 함께 사라진다.
 *    **넘긴 곳이 같은 날 한 번 더 옮겨졌다** — 받기로 했던 관제소·리포트 센터 명단 테스트 둘은
 *    그 명단 화면들과 함께 걷혔다(#370 · 결함 03-③). 표 껍데기(`roster-table.tsx`)의 계약을
 *    같은 항목으로 못박는 곳은 지금 **`components/classbot/__tests__/class-reach-roster.test.tsx`** 다.
 *
 * 그 자리에 **새로 지키는 것**은 「이 화면이 지어낸 값을 말하지 않는가」다 — 걷어낸 목이 다시 기어들면
 * 아래 「목이 하나도 남지 않았다」가 빨개진다.
 */
import { render, screen, within } from '@testing-library/react';
import type { BotCardDto, BotProfileDto } from '@/lib/api/classbot-dto';
import type { CurrentUser } from '@/lib/current-user';

// 홈의 「낸 과제 N건」 한 줄은 정본 훅(`GET /classbot/assignments?audience=teacher`)을 읽는다(FE PR 6) —
// 이 파일은 머리와 본체만 보므로 빈 목록으로 세운다(0건이면 그 줄은 그려지지 않는다).
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: [], isPending: false, isError: false, error: null }),
}));

let user: CurrentUser = { id: 'sub-t1', role: 'teacher', name: '보람', isAuthenticated: true };
jest.mock('@/lib/current-user', () => ({
  ...jest.requireActual('@/lib/current-user'),
  useCurrentUser: () => user,
}));

let classes: BotCardDto[] | undefined = [];
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({ data: classes, isPending: false, isError: false, error: null }),
}));

import TeacherHomePage from '../page';

const PROFILE: BotProfileDto = {
  subject: '수학', grade: '중2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '🤖',
  quickPrompts: [], enrolledCount: 12, isLive: false, currentLesson: null,
};
function card(id: string, name: string): BotCardDto {
  return { id, name, description: null, isActive: true, role: 'teacher', profile: PROFILE };
}

beforeEach(() => {
  user = { id: 'sub-t1', role: 'teacher', name: '보람', isAuthenticated: true };
  classes = [];
});

describe('인사말 — 이름은 세션에서 온다', () => {
  it('교사 세션의 이름으로 부른다', () => {
    user = { id: 'sub-t1', role: 'teacher', name: 'psh', isAuthenticated: true };
    render(<TeacherHomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('안녕하세요, psh 선생님');
  });

  it('admin 도 교사 화면을 쓰므로 이름을 부른다', () => {
    user = { id: 'sub-a1', role: 'admin', name: '운영', isAuthenticated: true };
    render(<TeacherHomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('안녕하세요, 운영 선생님');
  });

  it('세션 복원 전 데모 폴백(학생 「서연」)에는 이름을 붙이지 않는다', () => {
    // `RoleGuard` 가 `isReady=false` 동안 children 을 그대로 세우는 한 박자. 그때 이름을 그대로 쓰면
    // 「안녕하세요, 서연 선생님」이 스쳐 지나간다 — 방금 걷어낸 바로 그 모양이다.
    user = { id: 'student_001', role: 'student', name: '서연', isAuthenticated: false };
    render(<TeacherHomePage />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('안녕하세요');
    expect(h1.textContent).not.toContain('서연');
    expect(h1.textContent).not.toContain('선생님');
  });
});

describe('머리의 숫자 — 정본 반 목록만 센다', () => {
  it('정본이 준 반 개수를 그대로 말한다', () => {
    classes = [card('c1', '중2 수학 A반'), card('c2', '중2 수학 B반')];
    render(<TeacherHomePage />);

    expect(screen.getByText('내 반 2개')).toBeInTheDocument();
  });

  it('반이 없으면 0 을 말하지 않고 없다고 말한다', () => {
    classes = [];
    render(<TeacherHomePage />);

    expect(screen.getByText('아직 만든 반이 없어요')).toBeInTheDocument();
    expect(screen.queryByText(/내 반 \d+개/)).not.toBeInTheDocument();
  });

  it('아직 모르면(복원 중·비로그인·읽기 실패) 그 줄이 아예 없다 — 실패를 0 으로 바꿔 말하지 않는다', () => {
    classes = undefined;
    render(<TeacherHomePage />);

    expect(screen.queryByText(/내 반/)).not.toBeInTheDocument();
    expect(screen.queryByText('아직 만든 반이 없어요')).not.toBeInTheDocument();
  });

  it('반별 인원을 더해 학생 총원으로 말하지 않는다 — 두 반을 듣는 학생이 두 번 세어진다', () => {
    classes = [card('c1', 'A반'), card('c2', 'B반')]; // enrolledCount 12 + 12
    render(<TeacherHomePage />);

    expect(screen.queryByText(/학생 \d+명/)).not.toBeInTheDocument();
    expect(screen.queryByText(/24/)).not.toBeInTheDocument();
  });
});

describe('목이 하나도 남지 않았다', () => {
  it('지어낸 교사 프로필(이름·소속·활성 봇·학생 수)이 없다', () => {
    classes = [card('c1', 'A반')];
    render(<TeacherHomePage />);

    for (const gone of ['김보람', '대치프리미엄 수학학원', '활성 봇 3개', '학생 47명']) {
      expect(screen.queryByText(new RegExp(gone))).not.toBeInTheDocument();
    }
  });

  it('집계할 문이 없는 KPI 넉 장이 없다 — 「0명」으로 세워 두지도 않는다', () => {
    render(<TeacherHomePage />);

    for (const label of ['도달', '미도달', '목표 수준 미달', '오늘 안 들어옴']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/\d+명/)).not.toBeInTheDocument();
  });

  it('없는 학생을 그리던 「먼저 볼 학생」 표가 없다', () => {
    render(<TeacherHomePage />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('처리할 곳이 없는 「나를 기다리는 일」이 없다', () => {
    render(<TeacherHomePage />);

    expect(screen.queryByText('나를 기다리는 일')).not.toBeInTheDocument();
    for (const gone of ['서술형 채점 대기', '학부모 리포트 승인', '12건', '5건']) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });
});

describe('본체 — 빈 상태가 사실을 말하고, 나가는 길은 정본을 읽는 화면으로만 난다', () => {
  it('「먼저 볼 학생」 자리는 남되 고를 수 없다고 말한다', () => {
    render(<TeacherHomePage />);

    expect(screen.getByRole('heading', { name: '먼저 볼 학생', level: 2 })).toBeInTheDocument();
    const empty = screen.getByTestId('empty-state');
    expect(within(empty).getByText('먼저 볼 학생을 아직 고를 수 없어요')).toBeInTheDocument();
  });

  it('빈 상태의 출구는 하나이고 내 수업방(정본)으로 간다', () => {
    render(<TeacherHomePage />);

    const empty = screen.getByTestId('empty-state');
    const exits = within(empty).getAllByRole('link');
    expect(exits).toHaveLength(1);
    expect(exits[0]).toHaveAttribute('href', '/teacher/classroom');
  });

  it('아직 목인 화면(채점·리포트·관제소·학생 상세)으로 가는 길이 홈에 없다', () => {
    classes = [card('c1', 'A반')];
    render(<TeacherHomePage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    for (const mockTree of ['/teacher/grading', '/teacher/reports', '/teacher/monitor', '/teacher/students']) {
      expect(hrefs.some(h => h.startsWith(mockTree))).toBe(false);
    }
  });

  it('진짜로 할 수 있는 일 둘(새 클래스봇 · 과제 내기)은 그대로 있다', () => {
    render(<TeacherHomePage />);

    expect(screen.getByRole('link', { name: '새 클래스봇' })).toHaveAttribute('href', '/teacher/builder');
    expect(screen.getByRole('link', { name: '과제 내기' })).toHaveAttribute('href', '/teacher/assignment/new');
  });
});
