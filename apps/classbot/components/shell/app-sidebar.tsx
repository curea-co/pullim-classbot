'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import {
  navForRole, findActiveSection, studentDomains,
  type Role, type NavItem, type NavSubItem,
} from './nav-config';
import { cn } from '@/lib/utils';
import { LiveBadge } from '@/components/classbot/live-badge';

type Props = {
  role: Role;
  /** 항목 클릭 시 추가 처리 (모바일 drawer 자동 닫힘 등) */
  onNavigate?: () => void;
  /** 외부 컨테이너 className */
  className?: string;
  /** "icon only" 축약 모드 — Cozy bracket (768~1023) */
  compact?: boolean;
};

/**
 * 통합 사이드바 — 단일 nav 진실원 (Layer 1 §14.1: nav 이중화 금지).
 *
 * - 학생: 홈 + 6 도메인 (top-level) + 활성 도메인 children (인덴트로 펼침)
 * - 교사: 그룹별 nav (기존 동작 유지)
 *
 * Compact (≥768 <1024): 아이콘 전용. 활성 도메인 children도 아이콘.
 * Comfortable (≥1024): 풀 라벨.
 */
export function AppSidebar({ role, onNavigate, className, compact }: Props) {
  const pathname = usePathname();

  if (role === 'student') {
    const activeSection = findActiveSection(pathname, role);
    return (
      <StudentSidebar
        pathname={pathname}
        activeSection={activeSection}
        onNavigate={onNavigate}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <FullNav
      role={role}
      pathname={pathname}
      onNavigate={onNavigate}
      compact={compact}
      className={className}
    />
  );
}

/**
 * 학생 사이드바 — 홈 + 6 도메인 + 활성 도메인의 children 인덴트.
 *
 * 도메인 row 클릭 → 해당 도메인 홈으로 이동
 * 도메인이 활성 상태면 그 아래에 sub-children이 펼쳐짐
 */
function StudentSidebar({
  pathname, activeSection, onNavigate, compact, className,
}: {
  pathname: string;
  activeSection: NavItem | undefined;
  onNavigate?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <nav
      aria-label="학생 메뉴"
      className={cn('flex flex-col overflow-y-auto py-3', compact ? 'px-1.5' : 'px-2', className)}
    >
      {/* 클래스봇 단일 도메인 — 도메인 헤더 + children(홈/받은 과제/…) 펼침 */}
      <ul className="space-y-0.5">
        {studentDomains.map(domain => {
          const isActive = activeSection?.href === domain.href;
          const activeSubHref = isActive ? findActiveSubHref(pathname, domain.children) : undefined;
          return (
            <li key={domain.href}>
              <NavRow
                item={domain}
                pathname={pathname}
                onNavigate={onNavigate}
                compact={compact}
              />
              {/* 활성 도메인의 sub-children 인덴트로 펼침 */}
              {isActive && domain.children && (
                <ul
                  className={cn(
                    'mt-0.5 space-y-0.5',
                    compact ? 'ml-0' : 'ml-4 border-l border-pullim-slate-200 pl-3',
                  )}
                >
                  {domain.children.map(sub => (
                    <SubNavRow
                      key={sub.href}
                      sub={sub}
                      isActive={sub.href === activeSubHref}
                      onNavigate={onNavigate}
                      compact={compact}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 교사 모드 — 그룹별 (기존 동작 유지) */
function FullNav({
  role, pathname, onNavigate, compact, className,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const groups = navForRole(role);

  return (
    <nav
      aria-label={role === 'student' ? '학생 메뉴' : '교사 메뉴'}
      className={cn(
        'flex flex-col gap-3 overflow-y-auto py-3',
        compact ? 'px-1.5' : 'px-2',
        className,
      )}
    >
      {groups.map(group => {
        const showLabel = !compact && group.items.length > 1;
        return (
          <div key={group.label}>
            {showLabel && (
              <div className="text-pullim-slate-400 px-2 py-1 text-micro font-bold tracking-wider uppercase">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <NavRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  compact={compact}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavRow({
  item, pathname, onNavigate, compact,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href !== '/' &&
      item.href !== '/teacher' &&
      pathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.locked ? '#' : item.href}
      onClick={item.locked ? e => e.preventDefault() : onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.locked || undefined}
      title={compact ? item.label : item.description}
      className={cn(
        'group relative flex items-center rounded-md text-sm font-medium transition-colors',
        compact ? 'h-11 w-full justify-center gap-2.5' : 'min-h-11 gap-2.5 px-2.5 py-2',
        active
          ? cn(
              'bg-pullim-blue-50 text-pullim-blue-700',
              !compact &&
                'before:absolute before:left-1 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-pullim-blue-600',
            )
          : item.locked
          ? 'text-pullim-slate-400 hover:bg-pullim-slate-50 cursor-not-allowed'
          : 'text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900 active:bg-pullim-slate-200/60',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active && 'stroke-[2.4]')} />
      {!compact && (
        <>
          <span className={cn('flex-1 truncate', active && 'font-semibold')}>{item.label}</span>
          {item.locked && (
            <span className="bg-pullim-slate-100 text-pullim-slate-500 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-bold">
              <Lock aria-hidden className="h-2.5 w-2.5" />
              준비 중
            </span>
          )}
          {item.badge !== undefined && (
            item.badge === 'LIVE' ? (
              <LiveBadge />
            ) : (
              <span className={cn('rounded-full px-1.5 py-0.5 text-micro font-bold bg-pullim-slate-100 text-pullim-slate-600')}>
                {item.badge}
              </span>
            )
          )}
        </>
      )}
    </Link>
  );
}

/** 도메인 children 중 현재 pathname에 가장 잘 맞는 sub.href 반환 (가장 긴 prefix 우선) */
function findActiveSubHref(pathname: string, children: NavSubItem[] | undefined): string | undefined {
  if (!children) return undefined;
  let best: string | undefined;
  for (const sub of children) {
    if (pathname === sub.href || pathname.startsWith(sub.href + '/')) {
      if (!best || sub.href.length > best.length) {
        best = sub.href;
      }
    }
  }
  return best;
}

function SubNavRow({
  sub, isActive, onNavigate, compact,
}: {
  sub: NavSubItem;
  isActive: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = sub.icon;
  const active = isActive;

  return (
    <li>
      <Link
        href={sub.locked ? '#' : sub.href}
        onClick={sub.locked ? e => e.preventDefault() : onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-disabled={sub.locked || undefined}
        title={compact ? sub.label : sub.description}
        className={cn(
          'group relative flex items-center rounded-md text-xs font-medium transition-colors',
          compact ? 'h-10 w-full justify-center gap-2.5' : 'min-h-10 gap-2.5 px-2.5 py-2',
          active
            ? cn(
                'bg-pullim-blue-50 text-pullim-blue-700',
                !compact &&
                  'before:absolute before:left-1 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-pullim-blue-600',
              )
            : sub.locked
            ? 'text-pullim-slate-400 hover:bg-pullim-slate-50 cursor-not-allowed'
            : 'text-pullim-slate-600 hover:bg-pullim-slate-100 hover:text-pullim-slate-900 active:bg-pullim-slate-200/60',
        )}
      >
        {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', active && 'stroke-[2.4]')} />}
        {!compact && (
          <>
            <span className={cn('flex-1 truncate', active && 'font-semibold')}>{sub.label}</span>
            {sub.locked && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-bold',
                  'bg-pullim-slate-100 text-pullim-slate-500',
                )}
              >
                <Lock aria-hidden className="h-2.5 w-2.5" />
                준비 중
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}
