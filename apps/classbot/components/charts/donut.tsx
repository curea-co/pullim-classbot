"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Donut — center-labeled ring chart.
 *
 *  - Pure SVG, no Recharts
 *  - Segments colored via --chart-cat-1..8
 *  - Center slot for headline number + label
 *  - Hover/focus reveals segment via opacity
 *  - Tokens-only, SSR-safe
 */

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Headline content in the center hole. */
  centerLabel?: React.ReactNode;
  centerSubLabel?: React.ReactNode;
  /** Display legend below the chart. */
  showLegend?: boolean;
  className?: string;
  ariaLabel?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, rInner: number, start: number, end: number): string {
  const large = end - start > 180 ? 1 : 0;
  const so = polarToCartesian(cx, cy, r, start);
  const eo = polarToCartesian(cx, cy, r, end);
  const si = polarToCartesian(cx, cy, rInner, end);
  const ei = polarToCartesian(cx, cy, rInner, start);
  return [
    `M ${so.x} ${so.y}`,
    `A ${r} ${r} 0 ${large} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ei.x} ${ei.y}`,
    `Z`,
  ].join(" ");
}

const defaultColors = [
  "var(--chart-cat-1)",
  "var(--chart-cat-2)",
  "var(--chart-cat-3)",
  "var(--chart-cat-4)",
  "var(--chart-cat-5)",
  "var(--chart-cat-6)",
  "var(--chart-cat-7)",
  "var(--chart-cat-8)",
];

export const Donut = React.forwardRef<HTMLDivElement, DonutProps>(
  (
    {
      segments,
      size = 200,
      thickness = 28,
      centerLabel,
      centerSubLabel,
      showLegend = true,
      className,
      ariaLabel = "도넛 차트",
    },
    ref
  ) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2 - 1;
    const rInner = rOuter - thickness;

    let acc = 0;
    return (
      <div ref={ref} className={cn("inline-flex flex-col items-center gap-3", className)} lang="ko">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
            {segments.map((seg, i) => {
              const startAngle = (acc / total) * 360;
              acc += seg.value;
              const endAngle = (acc / total) * 360;
              const path =
                Math.abs(endAngle - startAngle) >= 360
                  ? // Full circle: draw two halves to avoid degenerate path
                    arcPath(cx, cy, rOuter, rInner, 0, 180) +
                    " " +
                    arcPath(cx, cy, rOuter, rInner, 180, 359.99)
                  : arcPath(cx, cy, rOuter, rInner, startAngle, endAngle);
              return (
                <path
                  key={seg.label}
                  d={path}
                  fill={seg.color ?? defaultColors[i % defaultColors.length]}
                >
                  <title>{`${seg.label} · ${seg.value} (${((seg.value / total) * 100).toFixed(1)}%)`}</title>
                </path>
              );
            })}
          </svg>
          {(centerLabel || centerSubLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerLabel && (
                <div
                  className="text-[var(--text-primary)] font-bold tabular-nums"
                  style={{ fontSize: size * 0.16, letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {centerLabel}
                </div>
              )}
              {centerSubLabel && (
                <div
                  className="text-[var(--text-secondary)] text-[length:var(--text-xs)] mt-1"
                  style={{ letterSpacing: "-0.005em" }}
                >
                  {centerSubLabel}
                </div>
              )}
            </div>
          )}
        </div>
        {showLegend && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[length:var(--text-xs)] list-none p-0 m-0">
            {segments.map((seg, i) => (
              <li key={seg.label} className="flex items-center gap-2 tabular-nums">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: seg.color ?? defaultColors[i % defaultColors.length] }}
                  aria-hidden="true"
                />
                <span className="text-[var(--text-secondary)] truncate" style={{ letterSpacing: "-0.005em" }}>
                  {seg.label}
                </span>
                <span className="ml-auto font-semibold text-[var(--text-primary)]">
                  {Math.round((seg.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
Donut.displayName = "Donut";
