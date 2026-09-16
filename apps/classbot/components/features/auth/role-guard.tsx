'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, WifiOff } from 'lucide-react';
import { homePathForRole, type AuthUser } from '@pullim-classbot/auth';

import { EmptyState } from '@/components/classbot/empty-state';
import type { AppUserRole } from '@/lib/auth/app-user-role';
import { useAuth } from '@/lib/auth/auth-context';
import { redirectToOsLogin } from '@/lib/auth/os-sso';
import { isPublicPath, ROLE_NOTICE_PATH } from '@/lib/auth/public-paths';

interface RoleGuardProps {
  children: ReactNode;
  /** 이 서브트리에 진입 가능한 역할. */
  requiredRole: AppUserRole;
}

/**
 * 가드의 판정 — 렌더와 effect 가 같은 값을 읽는다.
 *  - `pending`    : 세션 복원 전. 깜빡임을 막기 위해 children 을 그대로 둔다(종전과 같다).
 *  - `allow`      : 통과.
 *  - `login`      : 비로그인이 **401 로 확정**된 채 코어 화면에 왔다 → OS 로그인으로(현재 위치가 `next`).
 *  - `unavailable`: `/me` 에 닿지 못했다(네트워크·CORS·5xx) → 로그인으로 보내지 않고 「연결이 안 돼요」.
 *  - `notice`     : 학부모·기관 → 「클래스봇은 학생과 선생님이 쓰는 곳」 안내 한 장.
 *  - `home`       : 로그인했는데 이 트리의 역할이 아니다 → 본인 홈.
 */
type Verdict = 'pending' | 'allow' | 'login' | 'unavailable' | 'notice' | 'home';

/**
 * 가드가 보는 역할 — admin 은 교사 화면을 쓴다.
 * 운영자 전용 화면이 없어 `homePathForRole('admin')` 이 교사 홈을 돌려주는 것과 같은 결정이다
 * (`packages/auth/src/routes.ts` 「GATED: 운영자 전용 화면 미도입. 임시로 교사 홈으로 안내」).
 * 여기서 같은 말을 하지 않으면 admin 이 교사 홈으로 보내진 뒤 그 홈의 가드가 다시 내쫓는다.
 */
function guardRoleOf(role: AppUserRole): AppUserRole {
  return role === 'admin' ? 'teacher' : role;
}

/**
 * 세션 사용자의 역할을 **넓은 별칭**으로 읽는다.
 *
 * `AuthUser.role` 은 공유 계약 `UserRole`(student|teacher|admin)이지만 런타임 값은 provider 가
 * parent·institution 까지 준다(`lib/auth/os-sso-provider.ts` 의 유일한 캐스팅 자리). 함수 반환 타입으로
 * 넓히는 이유: `const role: AppUserRole = user.role` 로 적으면 TS 가 대입값으로 다시 좁혀
 * `role === 'parent'` 비교를 「겹치지 않는 타입」으로 막는다.
 */
function roleOf(user: AuthUser): AppUserRole {
  return user.role;
}

/**
 * 역할 가드 — 이 앱의 문은 풀림 OS 하나다.
 *
 * 정책(`proc/spec/05-business-rules.md § 11.1·§ 11.2` · 2026-09-16 계획 §04·§10 결정 ②·⑥):
 *  - **비로그인**은 코어 화면에 들어오지 않는다. 공개 경로(`lib/auth/public-paths.ts` —
 *    소개·안내 한 장)만 통과시키고, 나머지는 `redirectToOsLogin()` 으로 보낸다. 종전의
 *    「비로그인(데모 폴백)이면 통과」 분기는 걷었다 — 그 길로 들어온 화면은 서버가 401 을 주는
 *    자리마다 목 데이터로 갈아타 실패가 성공처럼 보였다(계획 §01).
 *  - 다만 **`/me` 에 닿지 못한 것은 비로그인이 아니다.** 그때 로그인으로 보내면 OS 가 세션을 보고
 *    `next` 로 되돌려 다시 `/me` 가 실패하는 왕복이 된다(리뷰 #350 — CORS 미등록 dev 배포). 401 로
 *    확정된 경우만 로그인으로 가고, 그 밖은 「지금은 연결이 안 돼요」 + 다시 시도다(`sessionError`).
 *  - **학부모·기관**(`/me` 의 parent·institution)은 학생으로 위장시키지 않는다. 안내 한 장
 *    (`ROLE_NOTICE_PATH`)으로 보낸다. `app/(parent)` 트리는 그래서 별건 PR 까지 비활성이다
 *    (계획 §10 해소 2 — 그 트리의 `layout.tsx` 머리주석).
 *  - **로그인 세션이 있고 역할이 다르면** 본인 홈으로(`homePathForRole`). admin 은 교사로 본다.
 *
 * 화면의 가드는 길 안내이고 자물쇠는 서버다 — 데이터 권한은 pullim-api 가 sub 와
 * 「이 반의 operator 인가」로 판단한다(계획 §04).
 *
 * 세션 복원 전(isReady=false)에는 children 을 그대로 둔다 — SSR 이 낸 HTML 을 첫 페인트에서
 * 비우지 않기 위해서다. 판정이 서면 그때 갈린다. 서버 훅은 전부 `enabled: isReady && user !== null`
 * 이라 그 한 왕복 동안 데이터는 새지 않는다.
 */
export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isReady, sessionError, refreshSession } = useAuth();

  const role = user ? roleOf(user) : null;

  let verdict: Verdict;
  if (!isReady) verdict = 'pending';
  else if (isPublicPath(pathname)) verdict = 'allow';
  else if (role === null) verdict = sessionError ? 'unavailable' : 'login';
  else if (role === 'parent' || role === 'institution') verdict = 'notice';
  else if (guardRoleOf(role) !== requiredRole) verdict = 'home';
  else verdict = 'allow';

  useEffect(() => {
    if (verdict === 'login') {
      redirectToOsLogin();
    } else if (verdict === 'notice') {
      router.replace(ROLE_NOTICE_PATH);
    } else if (verdict === 'home' && user) {
      router.replace(homePathForRole(user.role));
    }
  }, [verdict, user, router]);

  if (verdict === 'pending' || verdict === 'allow') return <>{children}</>;

  // 비로그인 — 로그인으로 옮겨 가는 동안 코어 화면 대신 안내가 선다. prod-verify 익명 레인은
  // 이 화면을 「로그인 안내」로 읽는다(계획 §10 해소 1). onClick 인 이유는 `read-state.tsx` 와 같다 —
  // OS 로그인 URL 은 앱 오리진이 있어야 만들 수 있어 SSR 시점에는 href 를 못 만든다.
  if (verdict === 'login') {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-16">
        <EmptyState
          icon={Lock}
          title="로그인이 필요해요"
          description="풀림 로그인으로 옮겨 가고 있어요. 바로 넘어가지 않으면 아래를 눌러 주세요."
          action={{ onClick: redirectToOsLogin, label: '로그인', ariaLabel: '풀림 로그인으로 가기' }}
        />
      </main>
    );
  }

  // `/me` 에 닿지 못했다 — 세션이 없는지 모른다. 로그인으로 보내지 않고 다시 시도만 준다.
  if (verdict === 'unavailable') {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-16">
        <EmptyState
          tone="danger"
          icon={WifiOff}
          title="지금은 연결이 안 돼요"
          description="잠시 뒤 다시 열어 주세요."
          action={{ onClick: () => void refreshSession(), label: '다시 시도', ariaLabel: '연결 다시 시도' }}
        />
      </main>
    );
  }

  // 역할 불일치·학부모·기관은 리다이렉트 직전 빈 화면(콘텐츠 노출 방지).
  return null;
}
