import type { ReactNode } from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { Breadcrumb } from './breadcrumb';
import type { Role } from './nav-config';
import { RightRailAside, RightRailProvider } from './right-rail-context';

type Props = {
  role: Role;
  children: ReactNode;
};

/**
 * 통합 앱 shell — 학생/교사 동일 골격.
 *
 * 반응형:
 * - 모바일 (xs/sm): 헤더(햄버거) + 본문 + 학생만 하단 탭/FAB
 * - 태블릿 (md): 헤더 + 사이드바(축약) + 본문
 * - 데스크탑 (lg+): 헤더 + 사이드바(전체) + 본문 (검색·D-day 등 노출)
 *
 * 콘텐츠 폭 제약:
 * - max-width: 1280px — 4K·울트라와이드에서 콘텐츠 과확장 방지
 * - min-width: 320px (body) — 초소형 모바일에서 레이아웃 붕괴 방지
 */
const CONTENT_MAX = 'mx-auto w-full max-w-[1280px]';

export function AppShell({ role, children }: Props) {
  return (
    <RightRailProvider>
      <div className="bg-pullim-slate-50 flex h-screen flex-col">
        <AppHeader role={role} />

        <div className="flex flex-1 overflow-hidden">
          {/* 사이드바 — 데스크탑 전체, 태블릿 축약 */}
          <aside className="border-pullim-slate-200 bg-card hidden shrink-0 border-r md:flex md:w-16 md:flex-col lg:w-60">
            <AppSidebar role={role} className="hidden lg:flex" />
            <AppSidebar role={role} compact className="flex lg:hidden" />
          </aside>

          {/* 본문 */}
          <main className="flex-1 overflow-y-auto">
            <Breadcrumb role={role} />

            {/* 페이지 콘텐츠 — 1280px 캡, 모바일 padding 좁게 */}
            <div
              className={
                role === 'student'
                  ? `${CONTENT_MAX} px-4 pt-4 pb-24 md:px-6 md:pb-10 xl:px-8`
                  : `${CONTENT_MAX} px-4 pt-4 pb-10 md:px-6 xl:px-8`
              }
            >
              {children}
            </div>
          </main>

          {/* 오른쪽 레일 — 페이지가 useSetRightRail 로 콘텐츠를 등록하면 나타남 */}
          <RightRailAside />
        </div>

        {/* 학생 모바일 전용 */}
        {role === 'student' && <BottomNav />}
      </div>
    </RightRailProvider>
  );
}
