import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Flex — orthogonal layout primitive (Radix Themes pattern).
 *
 * Instead of ad-hoc `className="flex items-center gap-3 flex-wrap"` repeated
 * across every file, layout intent becomes typed props. Gap values map to Tailwind
 * gap-* classes.
 *
 *   <Flex align="center" gap={4} wrap>...</Flex>
 *   <Flex direction="column" gap={6} asChild><ul>...</ul></Flex>
 */

type GapStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  /** Gap on the Tailwind scale (0–12). */
  gap?: GapStep;
  wrap?: boolean;
  /** Flex-grow the element itself inside a parent flex container. */
  grow?: boolean;
  /** Render as a different element via the `as` prop (div default). */
  as?: "div" | "section" | "header" | "footer" | "nav" | "ul" | "li" | "span";
}

const alignMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
} as const;

const justifyMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
} as const;

// Static gap lookup map for Tailwind classes (avoids purging dynamic strings)
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

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    { direction = "row", align, justify, gap, wrap, grow, as: Tag = "div", className, style, ...props },
    ref
  ) => (
    <Tag
      // @ts-expect-error — polymorphic ref; safe for the listed tags
      ref={ref}
      className={cn("flex", gap !== undefined && GAP[gap], className)}
      style={{
        flexDirection: direction,
        alignItems: align ? alignMap[align] : undefined,
        justifyContent: justify ? justifyMap[justify] : undefined,
        flexWrap: wrap ? "wrap" : undefined,
        flexGrow: grow ? 1 : undefined,
        ...style,
      }}
      {...props}
    />
  )
);
Flex.displayName = "Flex";
