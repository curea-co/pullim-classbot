'use client';

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ 개발 전용 · 정식 오픈 전 제거 ⚠️
 *
 * 화면 상단 헤더의 역할 전환 버튼. 개발 단계에서 학생 화면(/classbot)과
 * 교사 화면(/teacher)을 클릭 한 번으로 오가려고 둔 임시 장치다.
 * 기획 근거: 요구사항 FR-C-36 · 화면 SCR-C-35.
 *
 * 이 버튼은 **풀림 통합 계정의 역할 배정을 대신하지 않는다.**
 * 로그인 세션이 있으면 RoleGuard(components/features/auth/role-guard.tsx)가
 * 세션 role 과 다른 라우트 그룹 진입을 막고 본인 홈으로 되돌린다. 즉 두 화면을
 * 실제로 오갈 수 있는 건 비로그인(데모) 상태뿐이고, 그게 의도한 범위다.
 *
 * ── 제거 방법 ─────────────────────────────────────────────────────────────
 *  1. components/shell/app-header.tsx 에서 `<DevRoleSwitch role={role} />`
 *     한 줄과 그 import 를 지운다. (AppHeaderActions 안, 주석으로 표시해 둠)
 *  2. 이 파일과 components/shell/__tests__/dev-role-switch.test.tsx 를 지운다.
 *  그 외 어떤 파일도 이 컴포넌트를 참조하지 않는다.
 * ═════════════════════════════════════════════════════════════════════════ */

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Check, GraduationCap, School, Wrench, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Role } from './nav-config';

/**
 * prod 호스트에서만 자동으로 숨는다.
 *
 * `process.env.NODE_ENV !== 'production'` 으로 가르지 않은 이유: Vercel 은
 * preview 빌드(dev-classbot.pullim.ai)도 NODE_ENV='production' 으로 돌린다.
 * NODE_ENV 기준이면 정작 이 버튼이 필요한 dev preview 에서 사라진다.
 * 빌드·배포 설정(전용 환경변수 추가 등)은 건드리지 않는 제약이라 런타임
 * 호스트 검사로 가른다 — localhost·dev preview 노출, prod 비노출.
 */
const PROD_HOST = 'classbot.pullim.ai';

type DevRoleTarget = { role: Role; label: string; href: string; icon: LucideIcon };

const DEV_ROLES: DevRoleTarget[] = [
  { role: 'student', label: '학생', href: '/classbot', icon: GraduationCap },
  // 학부모 전용 화면은 기획 보류라 별도 착지점이 없다 → 교사 홈으로 보낸다.
  // 보호자 라우트가 생기면 이 항목을 둘로 쪼개면 된다.
  { role: 'teacher', label: '교사·학부모', href: '/teacher', icon: School },
];

/** 호스트는 바뀌지 않는다 — 구독할 게 없어 unsubscribe 만 돌려준다. */
const neverChanges = () => () => {};

/** 개발 전용 역할 전환 — 제품 UI 와 구분되게 warn 토큰 + 점선 테두리로 표시. */
export function DevRoleSwitch({ role, className }: { role: Role; className?: string }) {
  // 호스트는 클라이언트에서만 알 수 있다 → 서버 스냅샷은 항상 false 로 두고
  // 하이드레이션 직후 클라이언트 스냅샷으로 갈린다(SSR 마크업 불일치 방지).
  const visible = useSyncExternalStore(
    neverChanges,
    () => window.location.hostname !== PROD_HOST,
    () => false,
  );

  if (!visible) return null;

  return (
    <>
      {/* sm+ — 2버튼 세그먼트 */}
      <div
        role="group"
        aria-label="개발용 역할 전환"
        className={cn(
          // 「제품이 아니다」를 말하는 건 앰버가 아니라 **점선 테두리 + dev 라벨**이다
          'border-pullim-slate-400 mr-1 hidden shrink-0 items-center gap-0.5 rounded-pill border border-dashed bg-transparent px-1.5 py-1 sm:inline-flex',
          className,
        )}
      >
        <span aria-hidden className="text-pullim-slate-600 px-1 font-mono text-micro font-bold tracking-[.08em] uppercase">
          dev
        </span>
        {DEV_ROLES.map((target) => {
          const active = target.role === role;
          return (
            <Link
              key={target.role}
              href={target.href}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'rounded-pill px-2.5 py-1 text-2xs font-bold whitespace-nowrap transition-colors',
                'focus-visible:ring-pullim-slate-400/50 outline-none focus-visible:ring-2',
                active
                  ? 'bg-card text-pullim-slate-900 shadow-pullim-xs'
                  : 'text-pullim-slate-500 hover:text-pullim-slate-700',
              )}
            >
              {target.label}
            </Link>
          );
        })}
      </div>

      {/* < sm — 헤더 가로폭이 세그먼트를 못 버틴다(검색·알림·프로필과 경합).
          같은 두 항목을 드롭다운으로 접어 헤더 레이아웃을 지킨다. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="개발용 역할 전환"
          className="border-pullim-slate-400 text-pullim-slate-600 focus-visible:ring-pullim-slate-400/50 mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-dashed bg-transparent outline-none focus-visible:ring-2 sm:hidden"
        >
          <Wrench className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {/* Base UI: DropdownMenuLabel 은 Menu.GroupLabel 이라 Menu.Group 밖에서 쓰면
              useMenuGroupRootContext() 가 개발·운영 양쪽에서 throw 한다 —
              감싸지 않으면 드롭다운을 여는 순간 트리가 죽는다.
              같은 형태: notification-bell.tsx · app-header.tsx */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-pullim-slate-600 font-mono text-2xs tracking-[.08em] uppercase">
              dev · 역할 전환
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {DEV_ROLES.map((target) => {
              const active = target.role === role;
              const Icon = target.icon;
              return (
                <DropdownMenuItem key={target.role} className="p-0">
                  <Link
                    href={target.href}
                    aria-current={active ? 'true' : undefined}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {target.label}
                    {active && <Check className="text-pullim-slate-700 ml-auto h-4 w-4" />}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
