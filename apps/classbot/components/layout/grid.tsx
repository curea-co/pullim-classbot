/* ══════════════════════════════════════════════════════════════════════════
 * 상류 PUDS 와 **의도적으로 다르다** — 되돌리기 전에 읽어라.
 *
 * 정본: PUDS v0.5.1 동결본 `grid.json` (registry target `components/ui/layout/grid.tsx`).
 * 이 앱은 그것을 `components/layout/` 로 옮겨 벤더링했고, 아래 두 가지를 바꿨다.
 * 형제 파일 `stack.tsx` 는 상류와 **바이트 동일**이다 — 드리프트는 여기와 flex.tsx 뿐이다.
 *
 * ── 델타 1 · cn import 경로 ────────────────────────────────────────────────
 *   상류 `@/lib/cn` → 이 앱 `@/lib/utils`
 *   `lib/cn.ts` 도 존재하므로 상류 경로도 해석은 된다. 앱 관례에 맞춘 것뿐이다.
 *
 * ── 델타 2 · gap 구현 (**값이 바뀐다**) ────────────────────────────────────
 *   상류: style={{ gap: `var(--space-${gap})` }}  → CUDS --space-* 스케일
 *   여기: 정적 룩업 맵 GAP[gap] → Tailwind `gap-*` 클래스
 *
 *   같은 prop 이 다른 크기를 낸다. 이 앱 `app/tokens/_base.css` 기준:
 *
 *     gap  |  상류 var(--space-N)  |  여기 gap-N
 *     -----+-----------------------+------------
 *       2  |  4px                  |  8px
 *       4  |  8px                  |  16px
 *       6  |  16px                 |  24px
 *       8  |  24px                 |  32px
 *
 *   상류 구현이 여기서 깨지는 건 아니다 — `--space-*` 는 이 앱에도 정의돼 있다.
 *
 * ── 왜 되돌리지 않았나 ─────────────────────────────────────────────────────
 *  1. 상류는 템플릿 문자열로 gap 을 만드는데, Tailwind 는 소스를 정적 스캔하므로
 *     그건 클래스가 될 수 없어 인라인 style 로 갈 수밖에 없다. 정적 룩업 맵은
 *     같은 문제의 **더 나은 해법**이고, PUDS 규칙서가 권하는 형태이기도 하다.
 *  2. 드리프트가 사고가 아니라 결정이라는 증거가 있다 — 「avoids purging dynamic strings」
 *     주석과, gap 클래스 매핑을 못박는
 *     `__tests__/layout.test.tsx` 의 전용 케이스 5 개.
 *  3. 되돌리면 그 5 개가 함께 깨지고, 공개 API 의 **숫자 의미**가 절반으로 바뀐다.
 *     현재 `<Flex>`·`<Grid>`·`<Stack>` 의 비테스트 호출부는 **0 건**이라 화면 영향은
 *     지금 없지만, 첫 호출부가 어느 쪽 값을 받느냐가 갈린다. 그건 정리가 아니라
 *     디자인 결정이라 별건으로 다룰 일이다.
 *
 * 되돌리기로 정하면 `layout.test.tsx` 의 gap 케이스 5 개를 함께 고쳐야 한다.
 * ═════════════════════════════════════════════════════════════════════════ */
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
