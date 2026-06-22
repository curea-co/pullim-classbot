'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { studentBottomTabs } from './nav-config';
import { cn } from '@/lib/utils';

/**
 * 모바일 하단 탭 — 학생만 사용 (md 미만 노출).
 * 데스크탑에선 사이드바가 같은 역할을 하므로 숨김.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="학생 메인 네비게이션"
      className="bg-background/95 sticky bottom-0 z-30 border-t backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {studentBottomTabs.map(item => {
          const Icon = item.icon;
          const active = (() => {
            // /classbot 홈 탭은 정확 매칭만 (하위 경로는 각 탭이 가져감)
            if (item.href === '/classbot') return pathname === '/classbot';
            return item.matchPrefix.some(p => pathname === p || pathname.startsWith(p + '/'));
          })();
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors',
                  active
                    ? 'text-pullim-blue-600'
                    : 'text-pullim-slate-500 hover:text-pullim-slate-800',
                )}
              >
                {active && <span aria-hidden className="bg-pullim-blue-600 absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />}
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.4]')} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
