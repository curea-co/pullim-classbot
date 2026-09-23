/**
 * 클래스봇 운영 메인(SCR-C-17) — **걷어낸 것들이 되돌아오지 않게 거는 그물.**
 *
 * 화면이 무엇을 보여주는지를 다 재는 파일이 아니다(그건 옆 `bot-list-source.test.tsx` 가
 * 「지어낸 값을 말하지 않는다」쪽으로 잰다). 여기서는 이 화면에서 지운 것과
 * 새로 세운 배타 규칙만 붙든다:
 *  ① 봇 만드는 버튼은 헤더 CTA 와 빈 상태 둘 중 **하나만** 뜬다 (`03 § 4.4.5` 의 유추 —
 *     그 절은 스스로를 `/teacher/bots` 로 한정하므로 여기서는 판례를 따른 것이다).
 *  ② 「내 봇」 제목 옆 텍스트 링크는 없다 (헤더 CTA 와 같은 말을 두 번 했다).
 *  ③ 「낸 과제」 부제에 「오늘 N건」이 없다 (문자열로 센 값이라 두 방향 모두 틀려 있었다).
 *  ④ 「등록 학생 관리」 섹션이 없다 (한 반 하드코딩 · 저장 없는 토글이었다).
 *  ⑤ 상단 「등록 학생」 통계 칸도 이제 없다 — **2026-09-18 에 뒤집힌 줄이다.** 종전에는
 *     「지운 것은 관리이지 보여주기가 아니다(`03 § 4.4.4`)」로 그 칸이 남아 있었는데,
 *     그 숫자의 출처가 mock 조인이었다. 정본에는 봇에 붙은 반들의 **총원**을 세는 문이 없다
 *     (반별 `enrolledCount` 를 더하면 두 반을 듣는 학생이 두 번 세어진다).
 *
 * 봇 목록은 이제 정본(`GET /classbot/me/bots`)이라 훅을 모듈째 바꿔 끼운다 —
 * 옆 화면 `bots/__tests__/bot-management.test.tsx` 와 같은 방식이다.
 */

import { render, screen, within } from '@testing-library/react';
import type { ApiError } from '@pullim-classbot/api-client';
import type { BotCardDto, BotDto } from '@/lib/api/classbot-dto';
import TeacherClassbotPage from '../page';

/** 반에 붙어 있는 봇 — 카드의 「학급에 붙이기」 빈 상태가 뜨지 않는 갈래다 */
const ATTACHED: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '문학 도우미', subject: '국어', grade: '고2', tone: '친근',
  greeting: null, scope: 4, avatarEmoji: '📚', quickPrompts: [],
  isPublished: false, publishedAt: null, classIds: ['cls_1'], createdAt: '', updatedAt: '',
};

const CLASS_1: BotCardDto = {
  id: 'cls_1', name: '고2 문학 A반', description: null, isActive: true, role: 'teacher',
  profile: {
    subject: '국어', grade: '고2', tone: '친근', greeting: '', scope: 4, avatarEmoji: '📚',
    quickPrompts: [], enrolledCount: 24, isLive: false, currentLesson: null,
  },
};

/* ── 훅 바꿔 끼우기 ─────────────────────────────────────────── */

let bots: BotDto[] = [ATTACHED];
let listPending = false;
let listError: ApiError | null = null;
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBots: () => ({
    // 읽는 중·실패에는 `data` 가 없다 — react-query 가 그렇고, 화면이 그때 빈 목록을 「0개」로 읽으면 안 된다.
    data: listPending || listError ? undefined : bots,
    isPending: listPending,
    isError: listError !== null,
    error: listError,
    refetch: jest.fn(),
  }),
  useArchiveBot: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// 낸 과제는 정본 훅에서 온다(FE PR 6) — 이 파일은 봇 목록 규칙만 보므로 빈 목록으로 세운다.
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: [], isPending: false, isError: false, error: null }),
}));

/** 내가 운영하는 반 — 봇의 `classIds` 를 이름·인원으로 푸는 원천이자, 만든 직후 배너가 읽는 표다. */
let opsClasses: BotCardDto[] = [CLASS_1];
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
  bots = [ATTACHED];
  listPending = false;
  listError = null;
  opsClasses = [CLASS_1];
  searchParams = new URLSearchParams();
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

    // 이 봇은 반에 붙어 있어 카드의 「학급에 붙이기」가 뜨지 않는다.
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
  it('봇 줄은 정본 목록이 준 수만큼 그린다', () => {
    render(<TeacherClassbotPage />);
    const list = screen.getByTestId('bot-ops-list');
    for (const bot of bots) {
      expect(within(list).getByTestId(`bot-ops-card-${bot.id}`)).toBeInTheDocument();
    }
    expect(list.querySelectorAll('[data-testid^="bot-ops-card-"]')).toHaveLength(bots.length);
  });
});

describe('클래스봇 운영 — 봇이 하나도 없을 때', () => {
  beforeEach(() => { bots = []; });

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

  it('「등록 학생 관리」 섹션은 없고, 상단 「등록 학생」 통계 칸도 없다', () => {
    render(<TeacherClassbotPage />);

    expect(screen.queryByRole('heading', { name: '등록 학생 관리' })).not.toBeInTheDocument();
    expect(screen.queryByText('등록 학생 관리')).not.toBeInTheDocument();
    // 그 섹션이 스스로 달고 있던 꼬리표 — 되살아나면 이 줄이 먼저 걸린다
    expect(screen.queryByText(/데모 — 새로고침 시 초기화/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);

    /*
      상단 「등록 학생」 칸은 2026-09-18 에 함께 내렸다 — 반별 인원을 더해 만든 총원이라
      두 반을 듣는 학생이 두 번 세어진다(교사 홈이 같은 이유로 총원 합산을 거부했다).
      **반 하나의 인원은 그대로 뜬다** — 그건 반 카드가 스스로 아는 값이라, 이 줄이
      「인원을 통째로 지웠다」로 잘못 읽히지 않게 같이 못박는다.
    */
    expect(screen.queryByText('등록 학생')).not.toBeInTheDocument();
    expect(screen.getByText('24명')).toBeInTheDocument();
  });
});
