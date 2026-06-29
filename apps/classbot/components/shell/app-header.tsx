'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell, Search, Flame, User as UserIcon, LogOut, LogIn, GraduationCap, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ClassbotMark } from '@/components/brand/classbot-mark';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { currentPersona, currentTeacher } from '@/lib/mock';
import { useCurrentUser } from '@/lib/current-user';
import { useStreak } from '@/lib/store/self-learning';
import { useAuth } from '@/lib/auth/auth-context';
import { osLoginUrl } from '@/lib/auth/os-sso';
import { type Role } from './nav-config';
import { MobileDrawer } from './mobile-drawer';
import { StudentModeToggle } from './student-mode-toggle';

const roleLogoLabel: Record<Role, string> = {
  student: '클래스봇',
  teacher: '교사',
};

const roleHomeHref: Record<Role, string> = {
  student: '/',
  teacher: '/teacher',
};

/** 브랜드 로고 클러스터 — ClassbotMark + "풀림" + 역할 라벨, 역할 홈으로 링크. */
export function AppBrand({ role }: { role: Role }) {
  return (
    <Link
      href={roleHomeHref[role]}
      className="flex items-center gap-1.5 shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
    >
      <ClassbotMark size={32} />
      <span className="text-pullim-slate-900 text-base font-bold tracking-tight">풀림</span>
      <span className="text-pullim-slate-400 hidden text-2xs font-bold uppercase md:inline">
        {roleLogoLabel[role]}
      </span>
    </Link>
  );
}

/** 헤더 액션 영역 — 학습 모드 토글(학생) + 스트릭 + 검색 + 알림 + 프로필. */
export function AppHeaderActions({ role }: { role: Role }) {
  return (
    <>
      {/* CENTER — 학습 모드 토글 */}
      {role === 'student' && (
        <div className="flex shrink-0 items-center justify-center">
          <StudentModeToggle />
        </div>
      )}

      {/* RIGHT — 스트릭 + 검색 + 알림 + 프로필 (5요소 한도, Layer 1 §14.1) */}
      <div className="flex flex-1 items-center justify-end gap-1">
        {role === 'student' && <StudentStreakBadge />}
        <button
          aria-label="검색"
          aria-disabled="true"
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 relative inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
          title="준비 중"
        >
          <Search className="h-[22px] w-[22px]" />
        </button>
        <button
          aria-label="알림 — 준비 중"
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 relative inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
          title="준비 중"
        >
          <Bell className="h-[22px] w-[22px]" />
        </button>
        <ProfileMenu role={role} />
      </div>
    </>
  );
}

/**
 * 통합 상단 헤더 — 모든 화면 공유.
 * 좌: 햄버거(모바일) + 로고
 * 우: 스트릭 + 검색 + 알림 + 프로필(역할 전환 포함)
 *
 * 도메인 네비게이션은 사이드바 단일 진실원 (Layer 1 §14.1: nav 이중화 금지).
 */
export function AppHeader({ role }: { role: Role }) {
  return (
    <header className="bg-card/90 supports-[backdrop-filter]:bg-card/75 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-3 md:h-[72px] md:gap-3 md:px-6">
        {/* LEFT — 햄버거(모바일) + 브랜드 */}
        <div className="flex flex-1 items-center gap-2 md:gap-3">
          <MobileDrawer role={role} />
          <AppBrand role={role} />
        </div>

        <AppHeaderActions role={role} />
      </div>
    </header>
  );
}

/** 학생 스트릭 뱃지 — 실제 self-learning 스트릭. 0일(신규)이면 숨김(데모 시드 제거). */
function StudentStreakBadge() {
  const streak = useStreak();
  if (streak.count <= 0) return null;
  return (
    <Badge
      variant="secondary"
      className="bg-pullim-blue-50 text-pullim-blue-700 border-pullim-blue-100 hidden gap-1 sm:inline-flex"
    >
      <Flame className="h-3.5 w-3.5" />
      {streak.count}일째
    </Badge>
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
  const { signOut } = useAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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

  // 역할 전환은 **비로그인 데모에서만** 노출한다. 로그인 세션은 role 이 고정이고
  // (RoleGuard 가 타 역할 라우트를 차단), 임의 전환은 RBAC 와 모순이므로 숨긴다.
  const otherEntries = me.isAuthenticated
    ? []
    : ALL_ROLES.filter(r => r !== role).map(r => ({ role: r, ...ROLE_ENTRIES[r] }));

  async function handleLogout() {
    if (me.isAuthenticated) {
      await signOut();
      toast.success('로그아웃되었습니다.');
      // 전체 새로고침으로 AuthContext 가 미인증 세션을 다시 파생하게 한다.
      if (typeof window !== 'undefined') window.location.assign('/');
      return;
    }
    toast.info('로그아웃 (데모)', {
      description: '데모 환경이라 실제 로그아웃은 동작하지 않아요.',
      duration: 3000,
    });
  }

  // OS SSO 로그인으로 이동(현재 경로를 next 로 복귀). 공통 헤더가 없어 classbot 이 자체 처리.
  function goLogin() {
    if (typeof window === 'undefined') return;
    window.location.assign(osLoginUrl(window.location.pathname + window.location.search));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="프로필 메뉴 열기"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 hover:ring-pullim-blue-200 ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white transition-all hover:ring-2 focus-visible:ring-pullim-blue-300 focus-visible:ring-2 outline-none"
      >
        {profile.name[0]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="text-pullim-slate-900 text-sm font-bold">{profile.name}</div>
            <div className="text-pullim-slate-500 text-2xs font-normal">{profile.sub}</div>
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
            onClick={() => setTheme(mounted && resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="gap-1.5 px-2 py-1.5 text-sm"
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {mounted && resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
          </DropdownMenuItem>
          {me.isAuthenticated ? (
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              variant="destructive"
              className="gap-1.5 px-2 py-1.5 text-sm"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={goLogin} className="gap-1.5 px-2 py-1.5 text-sm">
              <LogIn className="h-4 w-4" />
              로그인
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
