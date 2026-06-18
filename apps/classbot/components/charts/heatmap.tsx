"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Heatmap — activity grid (GitHub-style) drawn from scratch.
 *
 *  - Each cell is a tokenized square colored by intensity bucket
 *  - 5 intensity levels mapped to --color-primary-{100,300,500,700,900}
 *  - Day labels (월·수·금) on left, month labels (1월·2월) on top
 *  - Pure SVG, zero dependencies, SSR-safe
 *  - Hover/focus reveals tooltip with date + value
 *
 * Default rendering is 52 weeks × 7 days = 364 cells (~1 year).
 */

export interface HeatmapDatum {
  /** ISO yyyy-mm-dd */
  date: string;
  value: number;
}

export interface HeatmapProps {
  data: HeatmapDatum[];
  /** Cell size in px. */
  cellSize?: number;
  /** Gap between cells in px. */
  gap?: number;
  /** Show weekday labels on left. */
  showWeekdays?: boolean;
  /** Show month labels on top. */
  showMonths?: boolean;
  /** Optional title for sr/screen-reader. */
  label?: string;
  className?: string;
}

const KR_WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
const KR_MONTH_SHORT = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

function bucketFor(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value === 0) return 0;
  const ratio = value / max;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const bucketFill = [
  "var(--surface-sunken)",
  "var(--color-primary-100)",
  "var(--color-primary-300)",
  "var(--color-primary-500)",
  "var(--color-primary-700)",
] as const;

export const Heatmap = React.forwardRef<SVGSVGElement, HeatmapProps>(
  ({ data, cellSize = 11, gap = 2, showWeekdays = true, showMonths = true, label = "활동 히트맵", className }, ref) => {
    const sorted = React.useMemo(() => [...data].sort((a, b) => a.date.localeCompare(b.date)), [data]);
    if (sorted.length === 0) return null;

    const max = Math.max(1, ...sorted.map((d) => d.value));

    // Build a Date → datum map for lookup
    const map = new Map(sorted.map((d) => [d.date, d]));

    // Determine the first Sunday on or before the earliest date
    const firstIso = sorted[0].date;
    const start = new Date(firstIso);
    start.setDate(start.getDate() - start.getDay());

    // Number of weeks = ceil((last - start) / 7)
    const lastIso = sorted[sorted.length - 1].date;
    const last = new Date(lastIso);
    const diffDays = Math.floor((last.getTime() - start.getTime()) / 86400000) + 1;
    const weeks = Math.ceil(diffDays / 7);

    const leftPad = showWeekdays ? 28 : 0;
    const topPad = showMonths ? 18 : 0;
    const width = leftPad + weeks * (cellSize + gap);
    const height = topPad + 7 * (cellSize + gap);

    const cells: React.ReactNode[] = [];
    const monthLabels: React.ReactNode[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(start);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        const iso = cellDate.toISOString().slice(0, 10);
        const datum = map.get(iso);
        const value = datum?.value ?? 0;
        const bucket = bucketFor(value, max);
        const x = leftPad + w * (cellSize + gap);
        const y = topPad + d * (cellSize + gap);

        cells.push(
          <rect
            key={iso}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={bucketFill[bucket]}
            stroke="var(--border-subtle)"
            strokeOpacity={0.25}
          >
            <title>{`${iso} · ${value}`}</title>
          </rect>
        );

        // First-of-month marker for month label
        if (d === 0) {
          const m = cellDate.getMonth();
          if (m !== lastMonth && cellDate.getDate() < 8) {
            monthLabels.push(
              <text
                key={`m-${w}-${m}`}
                x={x}
                y={topPad - 6}
                fill="var(--text-tertiary)"
                fontSize="11"
                fontFamily="var(--font-mono)"
                letterSpacing="-0.005em"
              >
                {KR_MONTH_SHORT[m]}
              </text>
            );
            lastMonth = m;
          }
        }
      }
    }

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className={cn("block", className)}
      >
        {showWeekdays &&
          [1, 3, 5].map((d) => (
            <text
              key={d}
              x={leftPad - 6}
              y={topPad + d * (cellSize + gap) + cellSize - 2}
              textAnchor="end"
              fill="var(--text-tertiary)"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {KR_WEEKDAY_SHORT[d]}
            </text>
          ))}
        {showMonths && monthLabels}
        {cells}
      </svg>
    );
  }
);
Heatmap.displayName = "Heatmap";
