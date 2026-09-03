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
 * 학부모 화면은 이 앱에만 있고 BE 는 여전히 'parent' claim 을 발급하지 않으므로,
 * 공유 패키지를 이 앱 사정으로 넓히지 않는다(packages/ 는 양쪽 영향 — 별건 승인 사항).
 * 그래서 경계 한 곳에서만 캐스팅한다. 실질 동작은 다음과 같아 안전하다:
 *  - 비로그인(데모/개발용 신원 쿠키) → RoleGuard 통과 (`user === null`).
 *  - 로그인 세션 → role 이 'parent' 일 수 없으니 항상 불일치 → 본인 홈으로 되돌아간다.
 *    학부모 화면은 로그인 사용자에게 열리지 않는다는 뜻이고, BE 가 학부모 role 을
 *    발급하기 전까지는 그게 맞는 상태다.
 */
export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requiredRole={'parent' as UserRole}>
      <AppShell role="parent">{children}</AppShell>
    </RoleGuard>
  );
}
