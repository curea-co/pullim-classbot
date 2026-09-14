import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';
import type { UserRole } from '@pullim-classbot/types';

/**
 * 학부모 라우트 그룹의 셸 — `(teacher)/layout.tsx` 와 같은 모양.
 *
 * ⚠️ 역할 union 이 둘로 갈려 있다:
 *  - `components/shell` 의 `Role` = student | teacher | **parent** (이 앱의 화면 역할)
 *  - `packages/types` 의 `UserRole` = student | teacher | **admin** (BE 와 공유하는 인증 계약)
 * BE 설계 spec 의 `users.role` 에는 'parent' 가 있다(2026-05-18 §73). 갈린 것은 **인증 claim
 * union** 쪽이고, 그걸 넓히는 것은 `packages/types` 변경이라 이 앱 사정으로 할 수 없다
 * (packages/ 는 apps 양쪽 영향 — 별건 승인 사항). 그래서 경계 한 곳에서만 캐스팅한다.
 *
 * ⚠️ 그래서 **지금 이 화면에 들어올 수 있는 것은 개발용 신원 쿠키(또는 비로그인 데모)뿐이다.**
 *  - 비로그인(데모·개발용 신원 쿠키) → RoleGuard 통과 (`user === null`).
 *  - 로그인 세션 → claim 의 role 이 'parent' 일 수 없어 항상 불일치 → 본인 홈으로 되돌아간다.
 *    OS SSO 도 지금은 학부모를 'student' 로 내린다(`lib/auth/os-sso-provider.ts` — 그 주석의
 *    전제였던 「대응 라우트 없음」은 이 시리즈로 해소됐다).
 * 실제 로그인 학부모에게 이 화면을 열려면 `packages/types` 의 claim union 과 SSO 매핑을
 * 함께 넓히는 **별도 PR** 이 선행해야 한다. 그 전까지 이 라우트는 개발·데모 전용이다.
 */
export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requiredRole={'parent' as UserRole}>
      <AppShell role="parent">{children}</AppShell>
    </RoleGuard>
  );
}
