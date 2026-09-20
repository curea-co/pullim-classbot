/**
 * `useCurrentUser().name` — 사람을 무엇으로 부르는가.
 *
 * 못박는 것은 **순서** 하나다: **OS 가 준 사람 이름 → 그게 비었을 때만 email 로컬파트.**
 *
 * 왜 이 테스트가 있나 — 이름은 진작부터 들어오고 있었다(`lib/auth/os-sso-provider.ts` 가 OS
 * `/me` 의 `displayName` 을 읽는다). 그런데 공유 계약 `AuthUser` 에 이름 칸이 없어 provider 가
 * 부가 필드로 동봉했고 `auth-context` 의 `AuthUser | null` 이 그 자리에서 좁혀 버려, 화면은
 * 「박성호」 대신 email 앞부분 「psh」로 사람을 불렀다.
 *
 * 그렇다고 폴백을 지우면 안 된다 — `AuthUser.name` 은 optional 이고 `/me` 의 `displayName` 도
 * 비어 올 수 있어서, 폴백이 없으면 그런 사람은 **빈칸으로 선다.** 아래 세 경우(이름 있음 ·
 * 이름 없음 · 빈 문자열)가 그 둘을 한꺼번에 고정한다: 순서를 뒤집어도, 폴백을 지워도 빨개진다.
 */
import { render, screen } from '@testing-library/react';

import { useCurrentUser, useStudentMe } from '@/lib/current-user';
import { DEV_IDENTITY_COOKIE } from '@/lib/dev-identity';

// useAuth 만 가변 오버라이드 — 나머지 auth-context 는 이 테스트와 무관하다.
// `name` 은 optional 이다(`packages/auth` 의 `AuthUser`) — 그 점이 이 테스트의 절반이다.
let mockAuthUser: { id: string; email: string; role: 'student' | 'teacher'; name?: string } | null =
  null;
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

beforeEach(() => {
  clearAllCookies();
  mockAuthUser = null;
});

function NameProbe() {
  const user = useCurrentUser();
  const me = useStudentMe();
  return (
    <>
      {/* 빈 문자열도 그대로 읽히도록 구분자를 넣는다 */}
      <output data-testid="current">{`[${user.name}]`}</output>
      <output data-testid="student">{`[${me.name}]`}</output>
    </>
  );
}

const currentName = () => screen.getByTestId('current').textContent;
const studentName = () => screen.getByTestId('student').textContent;

describe('useCurrentUser().name — 이름 → 없으면 email 로컬파트', () => {
  it('이름이 있으면 그 이름으로 부른다 — email 앞부분이 아니다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '박성호' };
    render(<NameProbe />);
    expect(currentName()).toBe('[박성호]');
  });

  it('이름이 없으면 email 로컬파트로 떨어진다 — 빈칸으로 두지 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('이름이 빈 문자열이어도 폴백이 받는다 — 화면에서 빈 문자열과 없음은 같은 빈칸이다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('공백뿐인 이름도 「없음」으로 본다 — 반 명단의 memberLabel 과 같은 판정이다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '   ' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('이름 앞뒤 공백은 잘라서 쓴다 — 이름이 있는데 폴백으로 넘기지는 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'teacher', name: '  김수학  ' };
    render(<NameProbe />);
    expect(currentName()).toBe('[김수학]');
  });
});

describe('이름은 화면이 읽는 끝까지 같다', () => {
  it('useStudentMe() 도 같은 이름을 싣는다 — 한 화면에 두 사람이 서지 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '박성호' };
    render(<NameProbe />);
    expect(currentName()).toBe('[박성호]');
    expect(studentName()).toBe('[박성호]');
  });

  it('이름이 없을 때도 둘이 같다 — 폴백은 한 곳(useCurrentUser)에만 있다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
    expect(studentName()).toBe('[psh]');
  });
});

describe('세션이 없는 두 갈래는 종전 그대로다', () => {
  it('개발용 신원 쿠키는 그 신원의 이름을 쓴다 — email 을 타지 않는다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=student_001; path=/`;
    render(<NameProbe />);
    expect(currentName()).toBe('[서연]');
  });

  it('세션도 쿠키도 없으면 데모 폴백(서연)이다 — 이 PR 이 바꾸지 않은 갈래다', () => {
    render(<NameProbe />);
    expect(currentName()).toBe('[서연]');
    // 다만 「나」는 신원이 아니므로 빈 값이다(useStudentMe 계약).
    expect(studentName()).toBe('[]');
  });
});
