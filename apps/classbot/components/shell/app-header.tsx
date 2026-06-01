'use client';

import Link from 'next/link';
import { Bell, Search, Flame, User as UserIcon, LogOut, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { PullimLogo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { currentPersona, currentTeacher } from '@/lib/mock';
import { useCurrentUser } from '@/lib/current-user';
import { type Role } from './nav-config';
import { MobileDrawer } from './mobile-drawer';

const roleLogoLabel: Record<Role, string> = {
  student: '클래스봇',
  teacher: '교사',
};

const roleHomeHref: Record<Role, string> = {
  student: '/',
  teacher: '/teacher',
};

/**
 * 통합 상단 헤더 — 모든 화면 공유.
 * 좌: 햄버거(모바일) + 로고
 * 우: 스트릭 + 검색 + 알림 + 프로필(역할 전환 포함)
 *
 * 도메인 네비게이션은 사이드바 단일 진실원 (Layer 1 §14.1: nav 이중화 금지).
 */
export function AppHeader({ role }: { role: Role }) {
  return (
    <header className="bg-card/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {/* 모바일 햄버거 */}
        <MobileDrawer role={role} />

        {/* 로고 (스터디/교사/보호자 라벨 통합) */}
        <Link href={roleHomeHref[role]} className="flex items-center gap-1.5 shrink-0">
          <PullimLogo size={22} />
          <span className="text-pullim-slate-400 hidden text-[10px] font-bold uppercase md:inline">
            {roleLogoLabel[role]}
          </span>
        </Link>

        {/* 우측 액션 — 5요소 한도 (Layer 1 §14.1) */}
        <div className="ml-auto flex items-center gap-1">
          {role === 'student' && (
            <Badge
              variant="secondary"
              className="bg-pullim-blue-50 text-pullim-blue-700 border-pullim-blue-100 hidden gap-1 sm:inline-flex"
            >
              <Flame className="h-3.5 w-3.5" />
              {currentPersona.streakDays}일째
            </Badge>
          )}
          <button
            aria-label="검색"
            className="hover:bg-pullim-slate-100 relative inline-flex h-9 w-9 items-center justify-center rounded-lg"
            title="검색 (⌘ K)"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            aria-label="알림"
            className="hover:bg-pullim-slate-100 relative inline-flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <Bell className="h-5 w-5" />
            <span className="bg-pullim-danger absolute top-1.5 right-1.5 inline-block h-2 w-2 rounded-full" />
          </button>
          <ProfileMenu role={role} />
        </div>
      </div>
    </header>
  );
}

/**
 * 역할 진입 메타 — 3개 모든 역할의 진입점.
 * ProfileMenu에서 *현재 역할을 제외한 나머지 두 역할*을 모두 메뉴에 노출 (병렬).
 * 데모에서 동일 사용자가 학생·교사·보호자 뷰를 자유롭게 오갈 수 있게.
 */
const ROLE_ENTRIES: Record<Role, { href: string; label: string; Icon: typeof GraduationCap }> = {
  student: { href: '/',                 label: '학생 뷰로 전환',   Icon: UserIcon },
  teacher: { href: '/teacher/classbot', label: '교사 뷰로 전환',   Icon: GraduationCap },
};

const ALL_ROLES: Role[] = ['student', 'teacher'];

function ProfileMenu({ role }: { role: Role }) {
  const me = useCurrentUser();
  // 세션 사용자면 그 이름, 비로그인(데모)면 역할별 데모 페르소나 메타.
  const profile =
    role === 'student'
      ? {
          name: me.isAuthenticated ? me.name : currentPersona.name,
          sub: `${currentPersona.grade} · ${currentPersona.school}`,
          profileHref: '/classbot',
        }
      : {
          name: me.isAuthenticated ? `${me.name} 선생님` : `${currentTeacher.name} 선생님`,
          sub: currentTeacher.organization,
          profileHref: '/teacher',
        };

  // 현재 역할을 제외한 나머지 두 역할 — 메뉴에 평행 노출
  const otherEntries = ALL_ROLES.filter(r => r !== role).map(r => ({ role: r, ...ROLE_ENTRIES[r] }));

  function handleLogout() {
    toast.info('로그아웃 (데모)', {
      description: '데모 환경이라 실제 로그아웃은 동작하지 않아요.',
      duration: 3000,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="프로필 메뉴 열기"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 hover:ring-pullim-blue-200 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all hover:ring-2 focus-visible:ring-pullim-blue-300 focus-visible:ring-2 outline-none"
      >
        {profile.name[0]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="text-pullim-slate-900 text-sm font-bold">{profile.name}</div>
            <div className="text-pullim-slate-500 text-[11px] font-normal">{profile.sub}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="p-0">
            <Link href={profile.profileHref} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm">
              <UserIcon className="h-4 w-4" />
              내 정보
            </Link>
          </DropdownMenuItem>
          {otherEntries.map(entry => {
            const Icon = entry.Icon;
            return (
              <DropdownMenuItem key={entry.role} className="p-0">
                <Link href={entry.href} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm">
                  <Icon className="h-4 w-4" />
                  {entry.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem
            onClick={handleLogout}
            variant="destructive"
            className="gap-1.5 px-2 py-1.5 text-sm"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
