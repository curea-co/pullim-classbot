'use client';

import { cn } from '@/lib/utils';

export interface SparkbarDatum { value: number; key?: string | number; title?: string }
export interface SparkbarProps {
  data: SparkbarDatum[];
  fill: (value: number, index: number) => string;
  fillMode?: 'class' | 'css';            // default 'css'
  heightPx: number;
  minBarPx?: number;
  minPct?: number;                        // opt into % height mode
  gapClassName?: string;                  // default 'gap-0.5'
  barRadiusClassName?: string;            // default 'rounded-sm'
  'aria-label'?: string;
  onBarClick?: (value: number, index: number) => void;
  barAriaLabel?: (value: number, index: number) => string;
  activeIndex?: number;
  className?: string;
}

/**
 * Generic sparkbar chart — dual fill-mode (Tailwind class or inline CSS var).
 * Height mode: px (`Math.max(minBarPx, (value/100)*heightPx)`) or
 *              pct (`Math.max(minPct, value)%`) when `minPct` is set.
 */
export function Sparkbar({
  data,
  fill,
  fillMode = 'css',
  heightPx,
  minBarPx,
  minPct,
  gapClassName = 'gap-0.5',
  barRadiusClassName = 'rounded-sm',
  'aria-label': ariaLabel,
  onBarClick,
  barAriaLabel,
  activeIndex,
  className,
}: SparkbarProps) {
  return (
    <div
      className={cn('flex items-end', gapClassName, className)}
      style={{ height: heightPx }}
      aria-label={ariaLabel}
    >
      {data.map((datum, i) => {
        const { value } = datum;
        const fillValue = fill(value, i);

        // Height calculation
        const barHeight = minPct !== undefined
          ? `${Math.max(minPct, value)}%`
          : `${Math.max(minBarPx ?? 0, (value / 100) * heightPx)}px`;

        // Fill props depending on mode
        const fillProps = fillMode === 'class'
          ? { className: cn('flex-1', barRadiusClassName, fillValue, activeIndex === i && 'ring-2 ring-pullim-lemon ring-offset-1') }
          : { className: cn('flex-1', barRadiusClassName, activeIndex === i && 'ring-2 ring-pullim-lemon ring-offset-1'), style: { backgroundColor: fillValue } };

        const title = datum.title ?? (barAriaLabel ? barAriaLabel(value, i) : undefined);

        if (onBarClick) {
          return (
            <button
              key={datum.key ?? i}
              type="button"
              onClick={() => onBarClick(value, i)}
              aria-label={barAriaLabel ? barAriaLabel(value, i) : undefined}
              title={title}
              {...fillProps}
              style={{ ...('style' in fillProps ? fillProps.style : {}), height: barHeight }}
            />
          );
        }

        return (
          <div
            key={datum.key ?? i}
            {...fillProps}
            style={{ ...('style' in fillProps ? fillProps.style : {}), height: barHeight }}
            title={title}
          />
        );
      })}
    </div>
  );
}
