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
  const trail = buildBreadcrumb(pathname, role);

  if (trail.length <= 1) return null;

  return (
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
  );
}
