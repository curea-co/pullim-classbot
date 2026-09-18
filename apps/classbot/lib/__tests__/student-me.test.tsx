/**
 * `useStudentMe()` — 학생 화면의 "나".
 *
 * 못박는 것은 하나다: **이름과 id 는 세션에서 온다.** 목 roster(`lib/mock/classbot.ts` 의
 * `classRoster`)는 부가 데이터 조회용으로만 남고, 그 행의 이름이 사람 이름 자리로 새지 않는다.
 *
 * 왜 이 테스트가 있나 — 종전 `useRosterMe()` 는 목 roster 행을 통째로 돌려줬고, 미스면 데모
 * 행(서연)으로 메웠다. roster id 는 `s1`…`s18` 인데 실계정 id 는 OS `sub`(uuid) 라 조인이
 * **한 번도 맞지 않아** 그 「폴백」이 사실상 상수였다 — 로그인한 사람도 늘 「서연」으로 불렸고,
 * 같은 화면 우상단 아바타(`useCurrentUser()`)와 본문이 다른 사람을 가리켰다.
 * 아래 케이스를 지우려면 그 폴백을 되살려야 하므로, 지우는 사람이 그것을 보게 된다.
 */
import { render, screen } from '@testing-library/react';

import { useStudentMe } from '@/lib/current-user';
import { DEV_IDENTITY_COOKIE } from '@/lib/dev-identity';

// useAuth 만 가변 오버라이드 — 나머지 auth-context 는 이 테스트와 무관하다.
let mockAuthUser: { id: string; email: string; role: 'student' | 'teacher' } | null = null;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: mockAuthUser, isReady: true }),
}));

/** jsdom 의 document.cookie 를 비운다(테스트 간 누수 방지). */
function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

/** window.location.host 를 갈아끼우고 복원 함수를 돌려준다. */
function stubHost(host: string): () => void {
  const { location } = window;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...location, host, hostname: host.split(':')[0] },
  });
  return () => Object.defineProperty(window, 'location', { configurable: true, value: location });
}

beforeEach(() => {
  clearAllCookies();
  mockAuthUser = null;
});

function MeProbe() {
  const me = useStudentMe();
  return (
    <>
      {/* 빈 문자열도 그대로 읽히도록 구분자를 넣는다 */}
      <output data-testid="identity">{`[${me.id}]/[${me.name}]`}</output>
      <output data-testid="demo">{me.demo ? `${me.demo.id}/${me.demo.name}` : '(none)'}</output>
    </>
  );
}

const identity = () => screen.getByTestId('identity').textContent;
const demo = () => screen.getByTestId('demo').textContent;

describe('useStudentMe — 이름과 id 는 세션에서 온다', () => {
  it('로그인한 사람의 이름은 세션 email 로컬파트다 — 목 roster 를 타지 않는다', () => {
    mockAuthUser = { id: '46638489-5c2f-4d6a-9b21-000000000001', email: 'psh@curea.co', role: 'student' };
    render(<MeProbe />);
    expect(identity()).toBe('[46638489-5c2f-4d6a-9b21-000000000001]/[psh]');
  });

  it('로그인한 사람을 「서연」이라 부르지 않는다 — 이 PR 이 고친 결함 자체다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<MeProbe />);
    expect(identity()).not.toContain('서연');
  });

  it('실계정에는 목 roster 행이 없다 — demo 는 null 이고 목 수치가 딸려오지 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<MeProbe />);
    expect(demo()).toBe('(none)');
  });

  it('세션은 개발용 신원 쿠키를 이긴다 — 이름도 demo 도 세션 쪽이다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=student_001; path=/`;
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<MeProbe />);
    expect(identity()).toBe('[uuid-1]/[psh]');
    expect(demo()).toBe('(none)');
  });
});

describe('useStudentMe — 신원이 없을 때', () => {
  it('세션도 개발용 쿠키도 없으면 이름·id 가 빈 값이다 — 데모 「서연」으로 되돌아가지 않는다', () => {
    render(<MeProbe />);
    expect(identity()).toBe('[]/[]');
  });

  it('신원이 없으면 목 부가 데이터도 없다 — 남의 기록을 내 것으로 보여 주지 않는다', () => {
    render(<MeProbe />);
    expect(demo()).toBe('(none)');
  });

  it('prod 호스트에서는 개발용 쿠키를 무시하고 빈 신원이 된다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=student_001; path=/`;
    const restore = stubHost('classbot.pullim.ai');
    try {
      render(<MeProbe />);
      expect(identity()).toBe('[]/[]');
      expect(demo()).toBe('(none)');
    } finally {
      restore();
    }
  });
});

describe('useStudentMe — 개발용 신원은 목 roster 행을 함께 연다', () => {
  it('student_001 은 seed 매핑을 타 roster s1(서연) 행을 받는다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=student_001; path=/`;
    render(<MeProbe />);
    expect(identity()).toBe('[student_001]/[서연]');
    expect(demo()).toBe('s1/서연');
  });

  it('s2 는 roster s2(민준) 행을 받는다 — 데모 사람을 바꾸면 부가 데이터도 따라 바뀐다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=s2; path=/`;
    render(<MeProbe />);
    expect(identity()).toBe('[s2]/[민준]');
    expect(demo()).toBe('s2/민준');
  });

  it('roster 에 없는 개발용 신원(교사)은 이름만 서고 demo 는 null 이다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=teacher_001; path=/`;
    render(<MeProbe />);
    expect(identity()).toBe('[teacher_001]/[김수학]');
    expect(demo()).toBe('(none)');
  });
});
