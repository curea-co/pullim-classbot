import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Grid — orthogonal layout primitive.
 *
 *   <Grid columns={4} gap={4}>...</Grid>                  // fixed 4 columns
 *   <Grid columns="auto-fit" min={260} gap={5}>...</Grid> // responsive auto-fit
 */

type GapStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column count, or "auto-fit"/"auto-fill" with `min` for responsive grids. */
  columns?: number | "auto-fit" | "auto-fill";
  /** Min column width in px — used with auto-fit/auto-fill. */
  min?: number;
  /** Gap on the Tailwind scale. */
  gap?: GapStep;
  /** Separate row gap (defaults to `gap`). */
  gapY?: GapStep;
}

// Static gap lookup maps for Tailwind classes (avoids purging dynamic strings)
const GAP: Record<GapStep, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  7: "gap-7",
  8: "gap-8",
  9: "gap-9",
  10: "gap-10",
  11: "gap-11",
  12: "gap-12",
};

const GAP_Y: Record<GapStep, string> = {
  0: "gap-y-0",
  1: "gap-y-1",
  2: "gap-y-2",
  3: "gap-y-3",
  4: "gap-y-4",
  5: "gap-y-5",
  6: "gap-y-6",
  7: "gap-y-7",
  8: "gap-y-8",
  9: "gap-y-9",
  10: "gap-y-10",
  11: "gap-y-11",
  12: "gap-y-12",
};

const GAP_X: Record<GapStep, string> = {
  0: "gap-x-0",
  1: "gap-x-1",
  2: "gap-x-2",
  3: "gap-x-3",
  4: "gap-x-4",
  5: "gap-x-5",
  6: "gap-x-6",
  7: "gap-x-7",
  8: "gap-x-8",
  9: "gap-x-9",
  10: "gap-x-10",
  11: "gap-x-11",
  12: "gap-x-12",
};

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 1, min = 240, gap, gapY, className, style, ...props }, ref) => {
    const template =
      typeof columns === "number"
        ? `repeat(${columns}, minmax(0, 1fr))`
        : `repeat(${columns}, minmax(${min}px, 1fr))`;

    // Determine which gap classes to use
    const gapClass = gapY !== undefined ? GAP_Y[gapY] : gap !== undefined ? GAP[gap] : undefined;
    const gapXClass = gap !== undefined ? GAP_X[gap] : undefined;

    return (
      <div
        ref={ref}
        className={cn("grid", gapClass, gapXClass, className)}
        style={{
          gridTemplateColumns: template,
          ...style,
        }}
        {...props}
      />
    );
  }
);
Grid.displayName = "Grid";
