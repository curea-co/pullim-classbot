'use client';

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ 개발 전용 · 정식 오픈 전 제거 ⚠️
 *
 * 화면 상단 헤더의 역할 전환 버튼. 개발 단계에서 학생 화면(/classbot)과
 * 교사 화면(/teacher), 학부모 화면(/parent)을 클릭 한 번으로 오가려고 둔 임시 장치다.
 * 기획 근거: 요구사항 FR-C-36 · 화면 SCR-C-35.
 *
 * 이 버튼은 **풀림 통합 계정의 역할 배정을 대신하지 않는다.**
 * 로그인 세션이 있으면 RoleGuard(components/features/auth/role-guard.tsx)가
 * 세션 role 과 다른 라우트 그룹 진입을 막고 본인 홈으로 되돌린다. 즉 세 화면을
 * 실제로 오갈 수 있는 건 비로그인(데모) 상태뿐이고, 그게 의도한 범위다.
 *
 * 화면만 바꾸면 서버가 여전히 서연으로 보므로, 이동 **직전에** 개발용 신원 쿠키
 * (`lib/dev-identity.ts`)도 함께 쓴다 — 그래야 `/api/*` 가 그 역할의 데모 사용자로 응답한다.
 * 쿠키 역시 prod 호스트에서는 무력이고 allowlist 밖 id 는 쓰지 않는다.
 *
 * ── 제거 방법 ─────────────────────────────────────────────────────────────
 *  1. components/shell/app-header.tsx 에서 `<DevRoleSwitch role={role} />`
 *     한 줄과 그 import 를 지운다. (AppHeaderActions 안, 주석으로 표시해 둠)
 *  2. 이 파일과 components/shell/__tests__/dev-role-switch.test.tsx 를 지운다.
 *  3. lib/dev-identity.ts 도 함께 걷는다 (그 파일 머리주석의 제거 절차).
 *  그 외 어떤 파일도 이 컴포넌트를 참조하지 않는다.
 * ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from 'react';
import { Check, GraduationCap, School, Users, Wrench, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DEV_IDENTITIES, writeDevIdentityCookie, type DevIdentity } from '@/lib/dev-identity';
import { useDevIdentityId } from '@/lib/use-dev-identity';
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
 *
 * 같은 기준을 `lib/dev-identity.ts` 의 `isDevIdentityHost` 가 서버 쪽에서 쓴다.
 */
const PROD_HOST = 'classbot.pullim.ai';

type DevRoleTarget = { role: Role; label: string; href: string; icon: LucideIcon; identity: DevIdentity };

/** 역할별 대표 데모 계정 — allowlist(DEV_IDENTITIES)에서 찾아 쓴다. */
function identityFor(id: string): DevIdentity {
  const found = DEV_IDENTITIES.find((i) => i.id === id);
  if (!found) throw new Error(`dev identity not in allowlist: ${id}`);
  return found;
}

/**
 * 전환 UI 가 여는 역할 — **착지점이 있는 역할만** 편다.
 *
 * 학부모 화면(`/parent`)이 이 PR 에서 도착했으므로 한 줄이 늘어 셋이 된다 —
 * 세그먼트와 드롭다운(아래 SWITCHABLE)이 이 표 하나를 함께 따른다.
 */
const DEV_ROLES: DevRoleTarget[] = [
  { role: 'student', label: '학생', href: '/classbot', icon: GraduationCap, identity: identityFor('student_001') },
  { role: 'teacher', label: '교사', href: '/teacher', icon: School, identity: identityFor('teacher_001') },
  { role: 'parent', label: '학부모', href: '/parent', icon: Users, identity: identityFor('parent_001') },
];

/** 드롭다운에 펴는 계정 — 착지점이 있는 역할의 계정만(지금은 allowlist 전원). */
const SWITCHABLE: readonly DevIdentity[] = DEV_IDENTITIES.filter((identity) =>
  DEV_ROLES.some((target) => target.role === identity.role),
);

/** 역할별 착지점 — 계정을 바꿔도 그 역할의 홈으로 간다. */
const HOME_BY_ROLE: Record<Role, string> = {
  student: '/classbot',
  teacher: '/teacher',
  parent: '/parent',
};

const ICON_BY_ROLE: Record<Role, LucideIcon> = {
  student: GraduationCap,
  teacher: School,
  parent: Users,
};

/** 호스트는 바뀌지 않는다 — 구독할 게 없어 unsubscribe 만 돌려준다. */
const neverChanges = () => () => {};

/** 개발 전용 역할 전환 — 제품 UI 와 구분되게 점선 테두리 + dev 라벨로 표시. */
export function DevRoleSwitch({ role, className }: { role: Role; className?: string }) {
  // 호스트는 클라이언트에서만 알 수 있다 → 서버 스냅샷은 항상 false 로 두고
  // 하이드레이션 직후 클라이언트 스냅샷으로 갈린다(SSR 마크업 불일치 방지).
  const visible = useSyncExternalStore(
    neverChanges,
    () => window.location.hostname !== PROD_HOST,
    () => false,
  );
  // 지금 어느 데모 계정인지 — 드롭다운 체크 표시에만 쓴다.
  // 훅은 조건 앞에서 부른다(early return 뒤에 두면 훅 순서가 깨진다).
  const currentIdentityId = useDevIdentityId();

  if (!visible) return null;

  return (
    <>
      {/* md+ — 3버튼 세그먼트.
          sm 이 아니라 md 에서 켜는 이유: 항목이 셋이 되면서 세그먼트가 넓어져
          sm 폭에서는 검색·알림·프로필과 자리를 다툰다. 그 구간은 아래 드롭다운이 받는다. */}
      <div
        role="group"
        aria-label="개발용 역할 전환"
        className={cn(
          // 「제품이 아니다」를 말하는 건 앰버가 아니라 **점선 테두리 + dev 라벨**이다
          'border-pullim-slate-400 mr-1 hidden shrink-0 items-center gap-0.5 rounded-pill border border-dashed bg-transparent px-1.5 py-1 md:inline-flex',
          className,
        )}
      >
        <span aria-hidden className="text-pullim-slate-600 px-1 font-mono text-micro font-bold tracking-[.08em] uppercase">
          dev
        </span>
        {DEV_ROLES.map((target) => {
          const active = target.role === role;
          return (
            // next/link 가 아니라 순수 <a> 다 — 쿠키를 쓴 뒤 **문서를 새로 받아야**
            // 서버 렌더와 이후 /api/* 요청이 같은 신원으로 정렬된다.
            // onClick 은 기본 이동보다 먼저 돌므로 쿠키는 요청이 나가기 전에 실린다.
            <a
              key={target.role}
              href={target.href}
              onClick={() => writeDevIdentityCookie(target.identity.id)}
              aria-current={active ? 'true' : undefined}
              title={target.identity.label}
              className={cn(
                'rounded-pill px-2.5 py-1 text-2xs font-bold whitespace-nowrap transition-colors',
                'focus-visible:ring-pullim-slate-400/50 outline-none focus-visible:ring-2',
                active
                  ? 'bg-card text-pullim-slate-900 shadow-pullim-xs'
                  : 'text-pullim-slate-500 hover:text-pullim-slate-700',
              )}
            >
              {target.label}
            </a>
          );
        })}
      </div>

      {/* 계정 고르기 — **모든 폭에서** 보인다.
          세그먼트(md+)는 역할당 대표 계정 하나로만 가므로, 그것만으로는
          「학생이 여러 선생님 반에 들어간다」를 확인할 수 없다(두 번째 교사·빈 학생으로
          갈 길이 없다). 그래서 드롭다운은 폭에 상관없이 남겨 두고 allowlist 전원을 편다.
          <md 에서는 세그먼트가 사라지므로 이 드롭다운이 유일한 전환 수단이기도 하다. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="개발용 계정 전환"
          className="border-pullim-slate-400 text-pullim-slate-600 focus-visible:ring-pullim-slate-400/50 mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-dashed bg-transparent outline-none focus-visible:ring-2"
        >
          <Wrench className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {/* Base UI: DropdownMenuLabel 은 Menu.GroupLabel 이라 Menu.Group 밖에서 쓰면
              useMenuGroupRootContext() 가 개발·운영 양쪽에서 throw 한다 —
              감싸지 않으면 드롭다운을 여는 순간 트리가 죽는다.
              같은 형태: notification-bell.tsx · app-header.tsx */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-pullim-slate-600 font-mono text-2xs tracking-[.08em] uppercase">
              dev · 계정 바꾸기
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {SWITCHABLE.map((identity) => {
              // 체크는 **역할**이 아니라 지금 쿠키에 실린 **계정**에 붙는다 —
              // 한 역할에 계정이 둘이라 역할로 표시하면 둘 다 켜진 것처럼 보인다.
              const active = identity.id === currentIdentityId;
              const Icon = ICON_BY_ROLE[identity.role];
              return (
                <DropdownMenuItem key={identity.id} className="p-0">
                  {/* 세그먼트와 같은 이유로 순수 <a> — 쿠키를 쓰고 문서를 새로 받는다 */}
                  <a
                    href={HOME_BY_ROLE[identity.role]}
                    onClick={() => writeDevIdentityCookie(identity.id)}
                    aria-current={active ? 'true' : undefined}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {identity.label}
                    {active && <Check className="text-pullim-slate-700 ml-auto h-4 w-4" />}
                  </a>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
