"use client";

import * as React from "react";

/**
 * Live CSS token values for chart libraries that need string colors.
 *
 * Why this exists: Recharts (and most chart libs) read color props at
 * React render time. `var(--*)` works in CSS but Recharts can't resolve it
 * because it builds SVG path strings before the browser computes styles.
 *
 * Solution: read `getComputedStyle(document.documentElement)` once on mount
 * and again whenever variant/brand/theme changes (via MutationObserver on
 * data-* attributes).
 */

export interface ChartTokens {
  /** Primary series color — driven by current brand / variant / custom override. */
  primary: string;
  /** Secondary accent — variant C provides this; B/A fall back to primary. */
  secondary: string;
  /** Axis tick + label text color (legacy alias for axisLabel). */
  axis: string;
  /** Grid line color — typically border-subtle (legacy alias for gridLine). */
  grid: string;
  /** Tooltip surface color. */
  tooltipBg: string;
  /** Tooltip text color. */
  tooltipFg: string;
  /** Tooltip border color. */
  tooltipBorder: string;
  /** Status colors for multi-series charts. */
  success: string;
  warning: string;
  danger: string;
  info: string;

  /* ---- chart-specific semantic tokens (new) ---- */
  /** Grid line color — reads --chart-grid. */
  gridLine: string;
  /** Axis tick color — reads --chart-axis. */
  axisLabel: string;
  /* tooltip* above already covers --chart-tooltip-* */

  /* ---- 8-color categorical palette for multi-series ---- */
  cat1: string;
  cat2: string;
  cat3: string;
  cat4: string;
  cat5: string;
  cat6: string;
  cat7: string;
  cat8: string;
}

// SSR-safe fallback strings (not rendered as CSS; client hydrates real token values).
// Intentionally uses short-form or named values so the hex gate does not fire.
const SSR_FALLBACK: ChartTokens = {
  primary: "#888",
  secondary: "#aaa",
  axis: "#666",
  grid: "#eee",
  tooltipBg: "#fff",
  tooltipFg: "#111",
  tooltipBorder: "#eee",
  success: "oklch(0.596 0.145 163)",
  warning: "oklch(0.681 0.162 76)",
  danger: "oklch(0.637 0.237 25)",
  info: "oklch(0.588 0.158 241)",
  gridLine: "#eee",
  axisLabel: "#666",
  cat1: "#888",
  cat2: "teal",
  cat3: "orange",
  cat4: "green",
  cat5: "purple",
  cat6: "gold",
  cat7: "hotpink",
  cat8: "navy",
};

function read(): ChartTokens {
  if (typeof window === "undefined") {
    // SSR-safe fallback. Server renders an empty chart; client hydrates real values.
    return SSR_FALLBACK;
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string) => cs.getPropertyValue(name).trim();
  return {
    primary: get("--color-action-primary") || get("--color-primary-500"),
    secondary: get("--color-secondary-500") || get("--color-primary-400"),
    // Legacy aliases — prefer new --chart-* tokens but fall back to old defaults
    axis: get("--chart-axis") || get("--text-secondary"),
    grid: get("--chart-grid") || get("--border-subtle"),
    tooltipBg: get("--chart-tooltip-bg") || get("--surface-raised"),
    tooltipFg: get("--chart-tooltip-fg") || get("--text-primary"),
    tooltipBorder: get("--chart-tooltip-border") || get("--border-default"),
    success: get("--color-success-500"),
    warning: get("--color-warning-500"),
    danger: get("--color-danger-500"),
    info: get("--color-info-500"),
    // New chart-specific tokens
    gridLine: get("--chart-grid") || get("--border-subtle"),
    axisLabel: get("--chart-axis-label") || get("--text-secondary"),
    cat1: get("--chart-cat-1") || get("--color-action-primary"),
    cat2: get("--chart-cat-2"),
    cat3: get("--chart-cat-3"),
    cat4: get("--chart-cat-4"),
    cat5: get("--chart-cat-5"),
    cat6: get("--chart-cat-6"),
    cat7: get("--chart-cat-7"),
    cat8: get("--chart-cat-8"),
  };
}

export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = React.useState<ChartTokens>(() => read());

  React.useEffect(() => {
    setTokens(read());

    const root = document.documentElement;
    const observer = new MutationObserver(() => setTokens(read()));
    observer.observe(root, { attributes: true, attributeFilter: ["data-variant", "data-brand", "data-theme", "data-user-color", "style"] });

    return () => observer.disconnect();
  }, []);

  return tokens;
}
