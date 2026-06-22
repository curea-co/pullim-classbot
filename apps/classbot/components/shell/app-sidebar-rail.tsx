'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppSidebar } from './app-sidebar';
import type { Role } from './nav-config';
import { useSidebarStore } from '@/lib/store/sidebar';
import { cn } from '@/lib/utils';

/**
 * 데스크톱 좌측 네비 레일 — 풀 라벨(lg) ↔ 아이콘 전용 토글(collapsed).
 *
 * 반응형:
 * - md (768~1023): 항상 아이콘 전용 (compact) — 토글 영향 없음.
 * - lg+ (1024+):   collapsed=false → 풀 라벨(w-60) / collapsed=true → 아이콘 전용(w-16).
 *
 * AppShell(서버 컴포넌트)에서 분리한 클라이언트 래퍼 — collapsed 상태는 store에서 읽는다.
 */
export function AppSidebarRail({ role }: { role: Role }) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <aside
      className={cn(
        'border-pullim-slate-200 bg-card hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex md:w-16',
        collapsed ? 'lg:w-16' : 'lg:w-60',
      )}
    >
      {/* 풀 라벨 — lg에서 펼침 상태일 때만 */}
      <AppSidebar role={role} className={cn('flex-1', collapsed ? 'hidden' : 'hidden lg:flex')} />
      {/* 아이콘 전용 — md 항상 + lg 접힘 상태 */}
      <AppSidebar role={role} compact className={cn('flex-1', collapsed ? 'flex' : 'flex lg:hidden')} />

      {/* 접기/펼치기 토글 — lg 전용 (md는 고정 아이콘 모드) */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        aria-pressed={collapsed}
        className={cn(
          'border-pullim-slate-200 text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-800 hidden shrink-0 items-center gap-2 border-t px-3 py-2.5 text-xs font-semibold transition-colors lg:flex',
          collapsed ? 'justify-center' : 'justify-start',
        )}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        {!collapsed && <span>접기</span>}
      </button>
    </aside>
  );
}
