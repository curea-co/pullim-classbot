/**
 * 클래스봇 운영 메인(SCR-C-17) — **걷어낸 셋이 되돌아오지 않게 거는 그물.**
 *
 * 화면이 무엇을 보여주는지를 다 재는 파일이 아니다. 이 화면에서 지운 것 셋과
 * 새로 세운 배타 규칙 하나만 붙든다:
 *  ① 봇 만드는 버튼은 헤더 CTA 와 빈 상태 둘 중 **하나만** 뜬다 (`03 § 4.4.5` 의 유추 —
 *     그 절은 스스로를 `/teacher/bots` 로 한정하므로 여기서는 판례를 따른 것이다).
 *     현행 mock(`classBots` 다섯 개 고정)으로는 숨김 갈래가 도달 불가라 mock 을 갈아끼워 잰다.
 *  ② 「내 봇」 제목 옆 텍스트 링크는 없다 (헤더 CTA 와 같은 말을 두 번 했다).
 *  ③ 「낸 과제」 부제에 「오늘 N건」이 없다 (문자열로 센 값이라 두 방향 모두 틀려 있었다).
 *  ④ 「등록 학생 관리」 섹션이 없다 (한 반 하드코딩 · 저장 없는 토글이었다).
 *
 * 옆 화면 `bots/__tests__/bot-management.test.tsx` 가 같은 배타 규칙에 건 그물과 같은 방식이다.
 */

import { render, screen, within } from '@testing-library/react';
import * as teacherOps from '@/lib/mock/classbot-teacher-ops';
import type { BotCardDto } from '@/lib/api/classbot-dto';
import TeacherClassbotPage from '../page';

// 낸 과제·반은 정본 훅에서 온다(FE PR 6) — 이 파일은 봇 목록 규칙만 보므로 둘 다 빈 목록으로 세운다.
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: [], isPending: false, isError: false, error: null }),
}));

/** 내가 운영하는 반 — 아래 「만든 직후 배너」가 반 id 를 이름으로 푸는 원천이다. 기본은 빈 목록. */
let opsClasses: BotCardDto[] = [];
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({ data: opsClasses, isPending: false, isError: false, error: null }),
}));

/**
 * 주소의 물음표 뒤 — 배너는 `?created=`·`?rooms=` 로만 선다.
 * 공용 setup(`config/jest.setup.ts`)의 stub 은 늘 빈 값이라 이 파일에서 갈아 끼운다.
 */
let searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/teacher/classbot',
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  opsClasses = [];
  searchParams = new URLSearchParams();
});

/** 「봇이 하나도 없을 때」를 보려고 운영 조인을 비우는 스위치 */
const mockNoBots = { on: false };
jest.mock('@/lib/mock/classbot-teacher-ops', () => {
  const actual = jest.requireActual('@/lib/mock/classbot-teacher-ops');
  return {
    ...actual,
    getTeacherBotRows: () => (mockNoBots.on ? [] : actual.getTeacherBotRows()),
  };
});

/** 봇 만들러 가는 길 — 화면 전체에서 `/teacher/builder` 로 가는 링크를 모은다 */
function builderLinks(): HTMLElement[] {
  return screen
    .getAllByRole('link')
    .filter(el => el.getAttribute('href') === '/teacher/builder');
}

describe('클래스봇 운영 — 봇이 있을 때', () => {
  it('봇 만드는 길은 헤더 CTA 하나뿐이고, 「내 봇」 제목 옆에는 링크가 없다', () => {
    render(<TeacherClassbotPage />);

    const cta = screen.getByTestId('classbot-new-cta');
    expect(cta).toHaveAttribute('href', '/teacher/builder');
    expect(cta).toHaveTextContent('새 클래스봇');

    // 현행 mock 의 다섯 봇은 모두 학급에 붙어 있어 카드의 「학급에 붙이기」가 뜨지 않는다.
    // 그러니 이 화면에서 빌더로 가는 링크는 헤더 CTA 하나여야 한다.
    expect(builderLinks()).toEqual([cta]);

    // 걷어낸 자리 — 「내 봇」 섹션 안에 빌더로 가는 텍스트 링크가 없다
    const list = screen.getByTestId('bot-ops-list');
    expect(within(list).queryByRole('link', { name: /봇 만들기/ })).not.toBeInTheDocument();
    expect(within(list).queryAllByRole('link').filter(
      el => el.getAttribute('href') === '/teacher/builder',
    )).toHaveLength(0);
  });

  // 위 단정이 「빈 화면이라 링크가 없다」로 통과하지 않도록, 봇 줄이 실제로 그려졌음을 같이 건다.
  // 학급 줄도 `li` 라 role 로 세면 섞인다 — 카드 testid 로 센다.
  it('봇 줄은 운영 조인이 준 수만큼 그린다', () => {
    render(<TeacherClassbotPage />);
    const list = screen.getByTestId('bot-ops-list');
    for (const { bot } of teacherOps.getTeacherBotRows()) {
      expect(within(list).getByTestId(`bot-ops-card-${bot.id}`)).toBeInTheDocument();
    }
    expect(list.querySelectorAll('[data-testid^="bot-ops-card-"]'))
      .toHaveLength(teacherOps.getTeacherBotRows().length);
  });
});

describe('클래스봇 운영 — 봇이 하나도 없을 때', () => {
  beforeEach(() => { mockNoBots.on = true; });
  afterEach(() => { mockNoBots.on = false; });

  it('헤더 CTA 를 내리고 빈 상태의 「봇 만들기」 하나만 남긴다', () => {
    render(<TeacherClassbotPage />);

    expect(screen.queryByTestId('classbot-new-cta')).not.toBeInTheDocument();
    expect(screen.getByText('아직 만든 봇이 없어요')).toBeInTheDocument();

    const empty = screen.getByRole('link', { name: '봇 만들기' });
    expect(empty).toHaveAttribute('href', '/teacher/builder');
    // 빈 상태가 그 길을 맡으므로 화면에 빌더로 가는 링크는 이것 하나뿐이다
    expect(builderLinks()).toEqual([empty]);
  });
});

describe('걷어낸 자리', () => {
  it('「낸 과제」 부제는 「오늘 N건」을 말하지 않는다', () => {
    render(<TeacherClassbotPage />);

    const dispatched = screen.getByTestId('dispatched-section');
    expect(within(dispatched).queryByText(/오늘\s*\d+\s*건/)).not.toBeInTheDocument();
    // 남은 부제는 정본 목록이 실제로 세는 값이다 — 건수와 문항 수. 학생 풀이 진행은 상세(`/submissions`)가 답한다.
    expect(within(dispatched).getByText(/\d+건 · \d+문항/)).toBeInTheDocument();
  });

  it('「등록 학생 관리」 섹션은 없다', () => {
    render(<TeacherClassbotPage />);

    expect(screen.queryByRole('heading', { name: '등록 학생 관리' })).not.toBeInTheDocument();
    expect(screen.queryByText('등록 학생 관리')).not.toBeInTheDocument();
    // 그 섹션이 스스로 달고 있던 꼬리표 — 되살아나면 이 줄이 먼저 걸린다
    expect(screen.queryByText(/데모 — 새로고침 시 초기화/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);

    // 상단 「등록 학생」 통계 칸은 남는다 — 지운 것은 관리이지 보여주기가 아니다 (`03 § 4.4.4`)
    expect(screen.getByText('등록 학생').closest('a')).toHaveAttribute('href', '/teacher/monitor');
  });
});
