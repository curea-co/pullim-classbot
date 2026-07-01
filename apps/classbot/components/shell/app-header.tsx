'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell, Search, Flame, User as UserIcon, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ClassbotMark } from '@/components/brand/classbot-mark';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/lib/current-user';
import { useStreak } from '@/lib/store/self-learning';
import { useAuth } from '@/lib/auth/auth-context';
import { osLoginUrl, resolveReturnTarget, OS_URL } from '@/lib/auth/os-sso';
import { OS_SSO_ENABLED } from '@/lib/auth/auth-mode';
import { type Role } from './nav-config';
import { MobileDrawer } from './mobile-drawer';
import { StudentModeToggle } from './student-mode-toggle';

const roleHomeHref: Record<Role, string> = {
  student: '/',
  teacher: '/teacher',
};

/** 브랜드 로고 클러스터 — ClassbotMark + "풀림" + 역할 라벨, 역할 홈으로 링크. */
export function AppBrand({ role }: { role: Role }) {
  return (
    <Link
      href={roleHomeHref[role]}
      aria-label="풀림 클래스봇 홈"
      className="inline-flex items-center gap-2.5 shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
    >
      {/* 로고 글리프 — os.pullim.ai `.mast .glyph`(30×30, radius 9px, pullim-blue 타일) 동형 */}
      <ClassbotMark size={30} />
      {/* 워드마크 — `.mast .wordmark`: 800 / 18px / letter-spacing -0.04em */}
      <span className="text-pullim-slate-900 font-extrabold text-[18px] leading-none tracking-[-0.04em]">
        풀림
      </span>
      {/* 서비스명 — `.mast .sub`: mono 11px / .04em / 좌측 divider(pl 9px·ml 2px) */}
      <span className="text-pullim-slate-400 ml-[2px] border-l border-pullim-slate-200 pl-[9px] font-mono text-[11px] leading-none tracking-[0.04em]">
        클래스봇
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

function ProfileMenu({ role }: { role: Role }) {
  const me = useCurrentUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // 로그인 세션 사용자 메타만 노출한다(데모 페르소나·역할전환 제거). 비로그인 시 페르소나 미표시.
  const roleLabel = role === 'teacher' ? '교사' : '학생';
  const profile = {
    name: role === 'teacher' ? `${me.name} 선생님` : me.name,
    sub: roleLabel,
    profileHref: role === 'teacher' ? '/teacher' : '/classbot',
  };

  // 로그아웃은 로그인 세션에서만 노출되는 항목(비로그인은 '로그인' 항목). 데모 로그아웃 토스트 제거.
  async function handleLogout() {
    await signOut();
    toast.success('로그아웃되었습니다.');
    // OS SSO 모드: 로그아웃 후 OS 로 내보낸다(인증 진입 일원화). 비-SSO 모드: 루트로.
    if (typeof window !== 'undefined') window.location.assign(OS_SSO_ENABLED ? OS_URL : '/');
  }

  // 로그인 진입. OS SSO 모드면 OS 로그인으로 이동(현재 경로를 next 로 복귀, 공통 헤더 없어 자체 처리),
  // 아니면 기존 classbot 로그인 폼(`/login`)으로 라우팅.
  // cross-host(예: Dev — OS≠classbot 오리진)면 내부 경로만으론 OS 가 앱으로 못 돌아오므로
  // resolveReturnTarget 이 앱 오리진 절대 URL 로 승격한다(same-origin 은 기존 내부 경로 유지). (B-7)
  function goLogin() {
    if (OS_SSO_ENABLED) {
      if (typeof window === 'undefined') return;
      const appOrigin = window.location.origin;
      const target = resolveReturnTarget(window.location.pathname + window.location.search, appOrigin);
      window.location.assign(osLoginUrl(target, appOrigin));
      return;
    }
    router.push('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="프로필 메뉴 열기"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 hover:ring-pullim-blue-200 ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white transition-all hover:ring-2 focus-visible:ring-pullim-blue-300 focus-visible:ring-2 outline-none"
      >
        {me.isAuthenticated ? profile.name[0] : <UserIcon className="h-5 w-5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            {me.isAuthenticated ? (
              <>
                <div className="text-pullim-slate-900 text-sm font-bold">{profile.name}</div>
                <div className="text-pullim-slate-500 text-2xs font-normal">{profile.sub}</div>
              </>
            ) : (
              <div className="text-pullim-slate-500 text-2xs font-normal">로그인하고 학습을 시작하세요</div>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {me.isAuthenticated && (
            <DropdownMenuItem className="p-0">
              <Link href={profile.profileHref} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm">
                <UserIcon className="h-4 w-4" />
                내 정보
              </Link>
            </DropdownMenuItem>
          )}
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
