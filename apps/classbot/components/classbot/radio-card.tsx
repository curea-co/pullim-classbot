'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ── RadioCardGroup Interface ─────────────────────────────────────────────────

export interface RadioCardGroupProps {
  label?: string;
  ariaLabel: string;
  cols?: 1 | 2 | 3;
  layout?: 'grid' | 'list';
  children: React.ReactNode;
  className?: string;
}

// ── RadioCardGroup Component ─────────────────────────────────────────────────

export function RadioCardGroup({
  label,
  ariaLabel,
  cols = 2,
  layout = 'grid',
  children,
  className,
}: RadioCardGroupProps) {
  const getColsClass = (c: 1 | 2 | 3) => {
    if (c === 1) return 'grid-cols-1';
    if (c === 2) return 'grid-cols-2';
    if (c === 3) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2';
  };

  const containerClasses =
    layout === 'grid'
      ? cn('grid gap-2', getColsClass(cols))
      : 'space-y-1.5';

  return (
    <div>
      {label && <div className="mb-2 text-sm font-bold">{label}</div>}
      <div
        role="radiogroup"
        aria-label={ariaLabel}
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
        'rounded-xl border-2 text-left transition-colors',
        size === 'sm' ? 'p-2.5' : 'p-3',
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
