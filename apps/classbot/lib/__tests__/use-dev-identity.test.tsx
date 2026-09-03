/**
 * 개발 전용 신원의 **client 경로** 테스트 — `lib/use-dev-identity.ts` 훅과
 * 그것을 무는 `useCurrentUser()` 의 쿠키 폴백. 그 파일들을 지울 때 함께 지운다.
 *
 * `__tests__/current-user.test.ts` 는 `@jest-environment node` 라 서버
 * `getCurrentUserIdFromRequest` 만 본다 — 클라이언트 쪽은 여기서만 검증된다.
 *
 * 못박는 것 셋:
 *  1. 쿠키가 신원을 바꾼다(누구로 보이는가).
 *  2. 그래도 **isAuthenticated 는 false 로 남는다** — RoleGuard·packages/auth 가
 *     「실제 로그인 세션인가」를 이 플래그로 판정하므로, 개발용 쿠키가 여기로 새면
 *     데모 통과 경로가 인증으로 둔갑한다.
 *  3. prod 호스트에서는 무력이고, 세션이 있으면 세션이 이긴다.
 */
import { render, screen } from '@testing-library/react';

import { useCurrentUser } from '@/lib/current-user';
import { DEV_IDENTITY_COOKIE } from '@/lib/dev-identity';
import { useDevIdentityId } from '@/lib/use-dev-identity';

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

function IdProbe() {
  return <output data-testid="id">{useDevIdentityId() || '(none)'}</output>;
}

function UserProbe() {
  const me = useCurrentUser();
  return (
    <output data-testid="user">
      {me.id}/{me.role}/{me.name}/{String(me.isAuthenticated)}
    </output>
  );
}

const idText = () => screen.getByTestId('id').textContent;
const userText = () => screen.getByTestId('user').textContent;

describe('useDevIdentityId', () => {
  it('쿠키가 없으면 빈 문자열', () => {
    render(<IdProbe />);
    expect(idText()).toBe('(none)');
  });

  it('allowlist 안의 쿠키면 그 id', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=teacher_002; path=/`;
    render(<IdProbe />);
    expect(idText()).toBe('teacher_002');
  });

  it('allowlist 밖 id 는 빈 문자열', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=attacker; path=/`;
    render(<IdProbe />);
    expect(idText()).toBe('(none)');
  });

  it('prod 호스트에서는 쿠키가 있어도 빈 문자열', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=teacher_002; path=/`;
    const restore = stubHost('classbot.pullim.ai');
    try {
      render(<IdProbe />);
      expect(idText()).toBe('(none)');
    } finally {
      restore();
    }
  });
});

describe('useCurrentUser — 개발용 신원 쿠키 폴백', () => {
  it('세션도 쿠키도 없으면 데모 폴백(서연)', () => {
    render(<UserProbe />);
    expect(userText()).toBe('student_001/student/서연/false');
  });

  it('쿠키가 있으면 그 데모 사용자로 보이되 isAuthenticated 는 false 로 남는다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=parent_001; path=/`;
    render(<UserProbe />);
    // 학부모 role 은 packages/types 의 UserRole 에 없다 — AppUserRole 로 넓힌 자리.
    expect(userText()).toBe('parent_001/parent/어머니/false');
  });

  it('로그인 세션이 있으면 쿠키를 이긴다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=parent_001; path=/`;
    mockAuthUser = { id: 'uuid-9', email: 'kim@example.com', role: 'teacher' };
    render(<UserProbe />);
    expect(userText()).toBe('uuid-9/teacher/kim/true');
  });

  it('prod 호스트에서는 쿠키를 무시하고 데모 폴백으로 떨어진다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=parent_001; path=/`;
    const restore = stubHost('classbot.pullim.ai');
    try {
      render(<UserProbe />);
      expect(userText()).toBe('student_001/student/서연/false');
    } finally {
      restore();
    }
  });
});
