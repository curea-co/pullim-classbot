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
 * the first item and the last `maxItems - 1` items. `maxItems` 는 **실제 크럼
 * 수**의 상한이고 `…` 는 세지 않으므로, 접힌 트레일의 `<li>` 개수는
 * `maxItems + 1` 이다.
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
  /**
   * Fold the middle of the trail once it exceeds this many **real** crumbs.
   *
   * `…` 는 이 수에 포함되지 않고 슬롯을 하나 더 쓴다 — 접힌 트레일은
   * `<li>` 를 `maxItems + 1` 개 렌더한다.
   *
   * 접힌 최소 형태가 「첫 + `…` + 마지막」이라 상한 1 은 표현할 수 없다.
   * 그래서 **2 미만(0·음수 포함)은 전부 2 로 올려 잡는다.** 접기를 끄려면
   * 이 prop 을 넘기지 마라 — 0 은 "끔"이 아니다.
   */
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

/**
 * 첫 크럼 + `…` + 마지막 `cap - 1` 개를 남긴다.
 *
 * `maxItems` 는 실제 크럼 수의 상한이다. `…` 는 세지 않고 슬롯을 하나 더
 * 쓰므로 접힌 결과의 길이는 언제나 `cap + 1` 이다.
 *
 * **2 미만은 2 로 올려 잡는다.** 접힌 최소 형태가 「첫 + `…` + 마지막」이라
 * 상한 1 을 문자 그대로 지키려면 첫 크럼을 버려야 하는데, 그러면 브레드크럼
 * 패턴 자체가 무의미해진다. 예전 코드는 `maxItems < 1` 을 "접지 않음"으로
 * 처리해서 `maxItems={0}` 이 `maxItems={1}` 보다 **더 긴** 트레일을 뱉었다 —
 * 상한이 작을수록 결과가 길어지는 역전이었다. 접기를 끄는 유일한 방법은
 * `maxItems` 를 넘기지 않는 것이다.
 */
function collapse(items: BreadcrumbItem[], maxItems?: number): RenderItem[] {
  if (maxItems == null || !Number.isFinite(maxItems)) return items;
  const cap = Math.max(2, Math.floor(maxItems));
  if (items.length <= cap) return items;
  const tailCount = Math.min(cap - 1, items.length - 1);
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
                    // 구분자는 장식이지만 `opacity-60` 이면 라이트에서 1.88:1 이라
                    // 사실상 사라진다. 불투명 tertiary 로 둔다.
                    className="select-none text-[var(--text-tertiary)]"
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
                      isLast && "font-medium text-[var(--text-secondary)]",
                      "break-keep"
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    lang="ko"
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast && "font-medium text-[var(--text-secondary)]",
                      "break-keep"
                    )}
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
