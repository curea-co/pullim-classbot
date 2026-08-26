import * as React from "react";
import { cn } from "@/lib/cn";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";

/**
 * PageHeader — 브레드크럼 + 타이틀 + 우측 액션.
 *
 * 브레드크럼은 예전에 이 파일 안에 인라인 <nav> + Fragment 나열로 구현돼
 * 있었다. 지금은 `@puds/breadcrumb` 에 위임한다 — 그쪽이 APG 패턴대로
 * <ol>/<li> 구조를 쓰고, 마지막 크럼이 링크일 때도 aria-current 를 붙이며,
 * maxItems 접기를 지원한다. 공개 props 는 그대로다.
 *
 * mono + tracking 룩은 이 헤더의 정체성이라 className 으로 얹어 유지하되,
 * 크기는 Breadcrumb 기본값(--text-sm, 13px)을 따른다 — 이전 12px 은
 * 한국어 하한선에 겨우 걸쳐 있었다.
 */

/** @deprecated `BreadcrumbItem` 의 별칭. 구조가 동일하다. */
export type Crumb = BreadcrumbItem;

export interface PageHeaderProps {
  crumbs?: Crumb[];
  title: string;
  actions?: React.ReactNode;
  /** 크럼이 이 개수를 넘으면 가운데를 `…` 로 접는다. */
  maxCrumbs?: number;
  /** Link element (e.g. next/link's Link). Defaults to "a". */
  linkComponent?: React.ElementType;
  className?: string;
}

export function PageHeader({
  crumbs,
  title,
  actions,
  maxCrumbs,
  linkComponent = "a",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-[var(--gap-xl)]", className)}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb
          items={crumbs}
          maxItems={maxCrumbs}
          linkComponent={linkComponent}
          className="mb-[var(--gap-md)] font-[var(--font-mono)] tracking-[.04em]"
        />
      )}
      <div className="flex items-end justify-between gap-[var(--gap-lg)]">
        <h1 className="text-[length:var(--text-2xl)] font-extrabold tracking-[-.03em] text-[var(--text-primary)]">
          {title}
        </h1>
        {actions}
      </div>
    </div>
  );
}
