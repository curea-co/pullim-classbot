"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bullet chart — KPI vs target.
 *
 *  - One row per metric
 *  - Background: full range bar (in surface-sunken)
 *  - Performance bar: current value, colored by intent
 *  - Target marker: vertical line at the target value
 *  - Threshold bands optional (warning/danger zones)
 *  - Korean label + tabular numeric formatting
 */

export interface BulletDatum {
  label: string;
  /** Current value. */
  value: number;
  /** Target value (drawn as a vertical line). */
  target: number;
  /** Max value of the range (defaults to max(value, target) * 1.25). */
  max?: number;
  /** Optional unit shown after the number. */
  unit?: string;
  /** Color intent — auto-derived from value/target if undefined. */
  intent?: "primary" | "success" | "warning" | "danger";
}

export interface BulletChartProps {
  data: BulletDatum[];
  /** Row height in px. */
  rowHeight?: number;
  className?: string;
}

const intentColor = {
  primary: "var(--color-action-primary)",
  success: "var(--color-success-500)",
  warning: "var(--color-warning-500)",
  danger: "var(--color-danger-500)",
} as const;

function autoIntent(value: number, target: number): keyof typeof intentColor {
  const ratio = value / target;
  if (ratio >= 1) return "success";
  if (ratio >= 0.8) return "primary";
  if (ratio >= 0.5) return "warning";
  return "danger";
}

export const BulletChart = React.forwardRef<HTMLDivElement, BulletChartProps>(
  ({ data, rowHeight = 14, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} lang="ko">
        {data.map((d) => {
          const max = d.max ?? Math.max(d.value, d.target) * 1.25;
          const valuePct = Math.min(100, (d.value / max) * 100);
          const targetPct = Math.min(100, (d.target / max) * 100);
          const intent = d.intent ?? autoIntent(d.value, d.target);

          return (
            <div key={d.label} className="grid gap-x-3" style={{ gridTemplateColumns: "minmax(80px, 140px) 1fr auto" }}>
              <div
                className="text-[length:var(--text-sm)] font-medium text-[var(--text-secondary)] truncate"
                style={{ letterSpacing: "-0.008em" }}
              >
                {d.label}
              </div>
              <div className="relative" style={{ height: rowHeight }}>
                {/* Background track */}
                <div
                  className="absolute inset-0 bg-[var(--surface-sunken)] rounded-[var(--radius-xs)]"
                  aria-hidden="true"
                />
                {/* Performance bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-[var(--radius-xs)]"
                  style={{ width: `${valuePct}%`, background: intentColor[intent] }}
                  role="progressbar"
                  aria-label={`${d.label} 진행률`}
                  aria-valuenow={Math.round((d.value / d.target) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={Math.round((max / d.target) * 100)}
                />
                {/* Target marker */}
                <div
                  className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[var(--text-primary)]"
                  style={{ left: `${targetPct}%` }}
                  aria-hidden="true"
                  title={`목표: ${d.target}${d.unit ?? ""}`}
                />
              </div>
              <div
                className="text-[length:var(--text-sm)] tabular-nums font-semibold text-[var(--text-primary)] whitespace-nowrap"
                style={{ letterSpacing: "-0.005em" }}
              >
                {d.value.toLocaleString("ko-KR")}
                {d.unit && <span className="text-[var(--text-tertiary)] font-medium ml-0.5">{d.unit}</span>}
                <span className="text-[length:var(--text-xs)] text-[var(--text-tertiary)] ml-1.5">
                  / {d.target.toLocaleString("ko-KR")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);
BulletChart.displayName = "BulletChart";
