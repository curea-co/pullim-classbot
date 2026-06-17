'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { buildBreadcrumb, type Role } from './nav-config';

/**
 * 컨텍스트 breadcrumb — 헤더 바로 아래 또는 페이지 헤더에 노출.
 * 모바일에서는 마지막 두 단계만 표시.
 */
export function Breadcrumb({ role }: { role: Role }) {
  const pathname = usePathname();
  const rawTrail = buildBreadcrumb(pathname, role);
  // 인접 라벨 중복 제거 ([04 § 9.12]) — "풀림 클래스봇 > 풀림 클래스봇" 회귀 방지
  const trail = rawTrail.filter((node, i) => i === 0 || node.label !== rawTrail[i - 1].label);

  if (trail.length <= 1) return null;

  return (
    <div className="bg-pullim-slate-50/80 border-b border-pullim-slate-200/70 sticky top-0 z-10 backdrop-blur-md">
      <div className="mx-auto flex h-9 w-full max-w-[1280px] items-center px-4 md:px-6 xl:px-8">
        <nav aria-label="현재 위치" className="text-pullim-slate-500 flex flex-wrap items-center gap-1 text-xs">
          {trail.map((node, i) => {
            const isLast = i === trail.length - 1;
            return (
              <span key={`${node.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="text-pullim-slate-300 h-3 w-3" />}
                {node.href && !isLast ? (
                  <Link href={node.href} className="hover:text-pullim-blue-600 hover:underline">
                    {node.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-pullim-slate-900 font-semibold' : ''}>
                    {node.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
