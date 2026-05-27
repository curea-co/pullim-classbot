'use client';

import Link from 'next/link';
import { GraduationCap, User } from 'lucide-react';
import type { Role } from './nav-config';
import { cn } from '@/lib/utils';

/**
 * 역할 전환 GNB — 헤더 중앙에 위치.
 * 데모용: 학생 ↔ 교사 2-way 전환 (클래스봇 추출본).
 */
export function RoleSwitcher({ current }: { current: Role }) {
  const items = [
    { role: 'student' as const, label: '학생', icon: User,          href: '/' },
    { role: 'teacher' as const, label: '교사', icon: GraduationCap, href: '/teacher/classbot' },
  ];

  return (
    <nav aria-label="역할 전환" className="bg-pullim-slate-100 inline-flex rounded-full p-0.5">
      {items.map(({ role, label, icon: Icon, href }) => {
        const active = role === current;
        return (
          <Link
            key={role}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all',
              active
                ? 'bg-white text-pullim-slate-900 shadow-pullim-xs'
                : 'text-pullim-slate-500 hover:text-pullim-slate-800',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
