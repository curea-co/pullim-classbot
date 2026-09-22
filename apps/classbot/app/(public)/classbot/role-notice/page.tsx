import type { Metadata } from 'next';
import { Users } from 'lucide-react';

import { EmptyState } from '@/components/classbot/empty-state';
import { OS_URL } from '@/lib/auth/os-sso';

export const metadata: Metadata = {
  title: '학생과 선생님이 쓰는 곳',
};

/**
 * 학부모·기관 안내 한 장 — 2026-09-16 계획 §04 「역할 표」·§10 결정 ⑥.
 *
 * OS 의 도메인 역할 넷 가운데 클래스봇에 화면이 있는 것은 학생·교사 둘이다. 종전에는 `mapRole` 이
 * 학부모·기관을 student 로 내려 학생 홈에 들여보냈다 — 학생으로 **위장**한 셈이었다. 이제
 * RoleGuard 가 그 둘을 여기로 보내고(`components/features/auth/role-guard.tsx`), 이 화면은 풀림 홈으로
 * 돌려보낸다(`NEXT_PUBLIC_OS_URL`).
 *
 * 어느 라우트 그룹에도 속하지 않는다(`app/(public)`) — 학생 셸도 교사 셸도 두르지 않고, 가드도
 * 지나지 않는다. 공개 경로 목록(`lib/auth/public-paths.ts`)에 이름이 올라 있는 것은 정책을 한 목록에
 * 두려는 것이다. 카피는 학생·학부모가 읽으므로 우리말로 쓴다.
 */
export default function RoleNoticePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-5 py-16">
      <EmptyState
        icon={Users}
        title="클래스봇은 학생과 선생님이 쓰는 곳이에요"
        description="지금 로그인한 분은 학생도 선생님도 아니라서 클래스봇 화면을 열 수 없어요. 풀림 홈으로 돌아가 주세요."
        action={{ href: OS_URL, label: '풀림 홈으로', ariaLabel: '풀림 홈으로 돌아가기' }}
        className="w-full"
      />
    </main>
  );
}
