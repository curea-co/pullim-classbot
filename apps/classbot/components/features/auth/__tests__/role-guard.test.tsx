/**
 * RoleGuard — 문은 풀림 OS 하나다(05 § 11.2 · 2026-09-16 계획 결정 ②·⑥).
 *
 * 보는 것: 비로그인은 공개 경로만 지나고 나머지는 OS 로그인으로 · `/me` 에 닿지 못한 것은 비로그인이
 * 아니라 「연결이 안 돼요」(왕복 방지) · 학부모·기관은 안내 한 장으로(학생으로 위장하지 않는다) ·
 * 역할 불일치는 본인 홈으로 · admin 은 교사 화면을 쓴다 · 세션 복원 전에는 아무 곳으로도 보내지 않는다.
 */
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

let pathname = '/classbot';
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

let authUser: { id: string; email: string; role: string } | null = null;
let authReady = true;
let sessionError: 'unavailable' | null = null;
const refreshSession = jest.fn(() => Promise.resolve());
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: authReady, sessionError, refreshSession }),
}));

const redirectToOsLogin = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: () => redirectToOsLogin(),
}));

import { RoleGuard } from '../role-guard';
import type { AppUserRole } from '@/lib/auth/app-user-role';
import { ROLE_NOTICE_PATH } from '@/lib/auth/public-paths';

function signIn(role: string): void {
  authUser = { id: 'sub-1', email: 'a@pullim.com', role };
}

function mount(requiredRole: AppUserRole, children: ReactNode = <div>core</div>) {
  return render(<RoleGuard requiredRole={requiredRole}>{children}</RoleGuard>);
}

beforeEach(() => {
  pathname = '/classbot';
  authUser = null;
  authReady = true;
  sessionError = null;
  replace.mockReset();
  redirectToOsLogin.mockReset();
  refreshSession.mockClear();
});

describe('비로그인', () => {
  it('코어 화면 → OS 로그인으로 보내고, 화면에는 코어 대신 로그인 안내가 선다', () => {
    mount('student');

    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('core')).toBeNull();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('교사 트리도 같다', () => {
    pathname = '/teacher/classroom';
    mount('teacher');
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('core')).toBeNull();
  });

  it('공개 경로(소개)는 그대로 연다 — 하위 경로도', () => {
    pathname = '/classbot/onboarding';
    mount('student');
    expect(redirectToOsLogin).not.toHaveBeenCalled();
    expect(screen.getByText('core')).toBeInTheDocument();

    pathname = '/classbot/onboarding/step-2';
    mount('student', <div>deep</div>);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
    expect(screen.getByText('deep')).toBeInTheDocument();
  });

  it('세션 복원 전에는 children 을 그대로 두고 아무 곳으로도 보내지 않는다(깜빡임 방지)', () => {
    authReady = false;
    mount('teacher');
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(redirectToOsLogin).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('/me 에 닿지 못했다 — 비로그인이 아니다', () => {
  it('로그인으로 보내지 않고 「연결이 안 돼요」를 세운다(왕복 방지)', () => {
    sessionError = 'unavailable';
    mount('student');

    expect(redirectToOsLogin).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('core')).toBeNull();
    expect(screen.getByText('지금은 연결이 안 돼요')).toBeInTheDocument();
  });

  it('「다시 시도」는 세션을 다시 읽는다', () => {
    sessionError = 'unavailable';
    mount('teacher');

    fireEvent.click(screen.getByRole('button', { name: '연결 다시 시도' }));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('공개 경로는 연결이 안 돼도 그대로 열린다', () => {
    sessionError = 'unavailable';
    pathname = '/classbot/onboarding';
    mount('student');
    expect(screen.getByText('core')).toBeInTheDocument();
  });
});

describe('로그인', () => {
  it('학생은 학생 화면을 본다', () => {
    signIn('student');
    mount('student');
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('교사가 학생 화면에 오면 교사 홈으로 — 코어는 그리지 않는다', () => {
    signIn('teacher');
    mount('student');
    expect(replace).toHaveBeenCalledWith('/teacher');
    expect(screen.queryByText('core')).toBeNull();
  });

  it('학생이 교사 화면에 오면 학생 홈으로', () => {
    signIn('student');
    pathname = '/teacher';
    mount('teacher');
    expect(replace).toHaveBeenCalledWith('/classbot');
    expect(screen.queryByText('core')).toBeNull();
  });

  it('admin 은 교사 화면을 쓴다 — 교사 홈으로 되돌려 보내 무한 왕복하지 않는다', () => {
    signIn('admin');
    pathname = '/teacher';
    mount('teacher');
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('admin 이 학생 화면에 오면 교사 홈으로(`homePathForRole`)', () => {
    signIn('admin');
    mount('student');
    expect(replace).toHaveBeenCalledWith('/teacher');
  });

  it.each(['parent', 'institution'])(
    '%s 는 안내 한 장으로 — 학생으로 위장시키지 않는다(계획 결정 ⑥)',
    (role) => {
      signIn(role);
      mount('student');
      expect(replace).toHaveBeenCalledWith(ROLE_NOTICE_PATH);
      expect(screen.queryByText('core')).toBeNull();
      expect(redirectToOsLogin).not.toHaveBeenCalled();
    },
  );

  it('학부모 트리도 학부모를 들이지 않는다 — 별건 PR 까지 비활성(계획 해소 2)', () => {
    signIn('parent');
    pathname = '/parent';
    mount('parent');
    expect(replace).toHaveBeenCalledWith(ROLE_NOTICE_PATH);
    expect(screen.queryByText('core')).toBeNull();
  });

  it('로그인했어도 공개 경로는 역할 무관 통과', () => {
    signIn('teacher');
    pathname = '/classbot/onboarding';
    mount('student');
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
