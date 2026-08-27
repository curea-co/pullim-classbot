import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * PUDS Breadcrumb
 *
 * Standalone breadcrumb trail — `<nav aria-label="breadcrumb"> > <ol> > <li>`,
 * following the WAI-ARIA breadcrumb pattern. The last crumb carries
 * `aria-current="page"` whether or not it is a link.
 *
 * Type size stays at `--text-sm` (13px): breadcrumbs are recessive because of
 * their COLOR (`--text-tertiary`, hover → `--text-secondary`), never because of
 * a smaller font. Korean below 12px is banned by the component contract.
 *
 * `maxItems` folds the middle of a long trail into a single `…` crumb, keeping
 * the first item and the last `maxItems - 1` items.
 *
 * Data comes in as props only — pass `linkComponent={Link}` to route with
 * next/link instead of a bare `<a>`.
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  items: BreadcrumbItem[];
  /** Link renderer — inject `next/link` here. Default `"a"`. */
  linkComponent?: React.ElementType;
  /** Fold the middle of the trail once it exceeds this many crumbs. */
  maxItems?: number;
  /** Node drawn between crumbs. Default `"/"`. */
  separator?: React.ReactNode;
  /** aria-label on the <nav>. */
  label?: string;
  /** Screen-reader text standing in for the folded crumbs. */
  collapsedLabel?: string;
}

const ELLIPSIS = Symbol("breadcrumb-ellipsis");
type RenderItem = BreadcrumbItem | typeof ELLIPSIS;

/** Keep the first crumb + the last `maxItems - 1`, with `…` in between. */
function collapse(items: BreadcrumbItem[], maxItems?: number): RenderItem[] {
  if (!maxItems || maxItems < 1) return items;
  if (items.length <= maxItems || items.length <= 2) return items;
  const tailCount = Math.min(Math.max(1, maxItems - 1), items.length - 1);
  return [items[0], ELLIPSIS, ...items.slice(items.length - tailCount)];
}

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      className,
      items,
      linkComponent,
      maxItems,
      separator = "/",
      label = "breadcrumb",
      collapsedLabel = "생략된 상위 경로",
      ...props
    },
    ref
  ) => {
    const Link = (linkComponent ?? "a") as React.ElementType;
    const rendered = collapse(items, maxItems);
    const lastIndex = rendered.length - 1;

    return (
      <nav
        ref={ref}
        aria-label={label}
        className={cn(
          "text-[length:var(--text-sm)] text-[var(--text-tertiary)]",
          className
        )}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-[var(--gap-xs)]">
          {rendered.map((item, i) => {
            const isLast = i === lastIndex;
            const key = item === ELLIPSIS ? `ellipsis-${i}` : `${item.label}-${i}`;
            return (
              <li key={key} className="flex items-center gap-[var(--gap-xs)]">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="select-none text-[var(--text-tertiary)] opacity-60"
                  >
                    {separator}
                  </span>
                )}
                {item === ELLIPSIS ? (
                  <span className="inline-flex items-center">
                    <span aria-hidden="true" className="select-none">
                      …
                    </span>
                    <span className="sr-only" lang="ko">
                      {collapsedLabel}
                    </span>
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    lang="ko"
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklch,var(--color-action-primary)_25%,transparent)]",
                      isLast && "font-medium text-[var(--text-secondary)]"
                    )}
                    style={{ wordBreak: "keep-all" }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    lang="ko"
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast && "font-medium text-[var(--text-secondary)]"
                    )}
                    style={{ wordBreak: "keep-all" }}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);
Breadcrumb.displayName = "Breadcrumb";
