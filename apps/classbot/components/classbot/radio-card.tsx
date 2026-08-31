'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ── RadioCardGroup Interface ─────────────────────────────────────────────────

export interface RadioCardGroupProps {
  label?: string;
  ariaLabel: string;
  cols?: 1 | 2 | 3 | 5;
  layout?: 'grid' | 'list';
  children: React.ReactNode;
  className?: string;
  /** Put on the radiogroup element itself, so callers can address it (e.g. move focus to it). */
  id?: string;
  /**
   * Make the radiogroup programmatically focusable (`tabIndex={-1}`) without adding it to the
   * tab order. Lets a caller move focus to the group — which announces its `ariaLabel` — when
   * a validation error points here. Off by default: the radios themselves stay the tab stops.
   */
  focusable?: boolean;
}

// ── RadioCardGroup Component ─────────────────────────────────────────────────

/**
 * 열 수 → 그리드 클래스. **정적 리터럴 표**여야 한다 — `grid-cols-${n}` 처럼 조립하면
 * Tailwind 가 소스에서 그 이름을 찾지 못해 클래스를 아예 만들지 않는다.
 *
 * 좁은 화면에서는 한 칸씩 줄인다(3→2, 5→3).
 *
 * `5` 는 **이름 한 줄짜리 카드 전용**이다 — 설명 줄이 붙은 카드를 다섯 칸에 나눠 넣으면
 * 글이 서너 줄로 접힌다. 짧은 낱말 다섯을 한 줄에 늘어놓아 「다섯 중 하나」가 한눈에
 * 보이게 하려고 둔 값이다(봇 빌더의 과목).
 */
const COLS_CLASS: Record<NonNullable<RadioCardGroupProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  5: 'grid-cols-3 sm:grid-cols-5',
};

export function RadioCardGroup({
  label,
  ariaLabel,
  cols = 2,
  layout = 'grid',
  children,
  className,
  id,
  focusable = false,
}: RadioCardGroupProps) {
  const containerClasses =
    layout === 'grid'
      ? cn('grid gap-2', COLS_CLASS[cols])
      : 'space-y-1.5';

  return (
    <div>
      {label && <div className="mb-2 text-sm font-bold">{label}</div>}
      <div
        id={id}
        role="radiogroup"
        aria-label={ariaLabel}
        tabIndex={focusable ? -1 : undefined}
        className={cn(containerClasses, className)}
      >
        {children}
      </div>
    </div>
  );
}

// ── RadioCard Interface ──────────────────────────────────────────────────────

export interface RadioCardProps {
  active: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  trailing?: React.ReactNode;
  size?: 'sm' | 'md';
  /**
   * 글씨가 놓이는 자리. 기본은 왼쪽 — 설명 줄이 있는 카드는 이름과 설명의 왼끝이 맞아야 읽힌다.
   *
   * `center` 는 **`title` 한 줄뿐인 카드 전용**이다. 넓은 칸 왼쪽 구석에 짧은 낱말 하나가
   * 놓이면 오른쪽에 남는 자리가 「덜 채운 입력칸」처럼 보인다 — 가운데로 옮기면 남는 자리가
   * 양쪽으로 갈려 고르는 버튼으로 읽힌다. `icon`·`description`·`trailing` 이 있으면 쓰지 마라.
   */
  align?: 'start' | 'center';
  className?: string;
}

// ── RadioCard Component ──────────────────────────────────────────────────────

export function RadioCard({
  active,
  onSelect,
  title,
  description,
  icon,
  trailing,
  size = 'md',
  align = 'start',
  className,
}: RadioCardProps) {
  // icon may be a component *type* (plain function OR a forwardRef/memo object,
  // e.g. a Lucide icon) or an already-rendered element. isValidElement is the
  // reliable discriminator — `typeof icon === 'function'` is false for the
  // forwardRef objects most icon libraries ship.
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="h-5 w-5" />;
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'rounded-xl border-2 transition-colors',
        size === 'sm' ? 'p-2.5' : 'p-3',
        align === 'center' ? 'text-center' : 'text-left',
        active
          ? 'border-pullim-blue-500 bg-pullim-blue-50'
          : 'border-pullim-slate-200 hover:border-pullim-slate-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 pt-0.5">{renderIcon()}</div>}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{title}</div>
          {description && (
            <div className="text-xs text-pullim-slate-500 mt-0.5">
              {description}
            </div>
          )}
        </div>

        {trailing && (
          <div className="flex-shrink-0 ml-2">{trailing}</div>
        )}
      </div>
    </button>
  );
}
