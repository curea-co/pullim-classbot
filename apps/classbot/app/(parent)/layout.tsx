import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';

/**
 * 학부모 라우트 그룹의 셸 — `(teacher)/layout.tsx` 와 같은 모양.
 *
 * ⚠️ **이 트리는 지금 비활성이다 — 아무도 들어오지 못한다.** 2026-09-16 계획 §10 해소 2:
 * 「결정 ①·②·⑥ 을 합치면 학부모 화면에 아무도 못 들어간다 — 받아들인다. `app/(parent)` 세 화면과
 * 서버 라우트 둘은 『학부모 별건 PR 까지 비활성』으로 05 § 11.2 에 적는다.」
 *  - 비로그인 → RoleGuard 가 OS 로그인으로 보낸다(결정 ②). 종전의 데모 통과 분기는 걷혔다.
 *  - 로그인 학부모(`/me` role=parent) → RoleGuard 가 「클래스봇은 학생과 선생님이 쓰는 곳」 안내로
 *    보낸다(결정 ⑥ — `mapRole` 이 이제 parent 를 student 로 내리지 않는다).
 *  - 학생·교사 → 역할 불일치라 본인 홈으로.
 * 개발용 신원 쿠키로 들어오던 길(`lib/dev-identity.ts`)도 화면 쪽에서는 닫혔다 — 그 쿠키는
 * 이제 `/api/*` route handler 의 명의로만 남고, 은퇴 대상이다(PR 8).
 *
 * 화면과 라우트는 **지우지 않는다.** 실제 학부모를 여는 일은 별건 승인 사항이고, 그때 필요한 것은
 * `packages/types` 의 claim union(`UserRole`)을 넓히는 일과 자녀 동의(05 § 11.4) 게이트다 —
 * 이 트리의 내용은 그대로 그 PR 의 출발점이다(`proc/spec/03 § 2.3`).
 *
 * 역할 union 이 둘로 갈려 있는 것은 그대로다:
 *  - `components/shell` 의 `Role` = student | teacher | **parent** (이 앱의 화면 역할)
 *  - `packages/types` 의 `UserRole` = student | teacher | **admin** (BE 와 공유하는 인증 계약)
 * 이 앱은 `AppUserRole`(`lib/auth/app-user-role.ts`)로 그 사이를 잇고, 캐스팅은
 * `lib/auth/os-sso-provider.ts` 한 곳에만 있다 — 종전에 이 파일에 있던 `'parent' as UserRole` 은
 * RoleGuard 의 prop 이 `AppUserRole` 이 되면서 필요가 없어졌다.
 */
export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requiredRole="parent">
      <AppShell role="parent">{children}</AppShell>
    </RoleGuard>
  );
}
