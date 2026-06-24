import * as React from "react";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  crumbs?: Crumb[];
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ crumbs, title, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label="breadcrumb"
          className="mb-3 flex items-center gap-2 font-[var(--font-mono)] text-[11px] tracking-[.04em] text-[var(--text-tertiary)]"
        >
          {crumbs.map((c, i) => (
            <React.Fragment key={c.label + i}>
              {i > 0 && <span aria-hidden="true" className="opacity-50">/</span>}
              {c.href ? (
                <a href={c.href} className="hover:text-[var(--text-secondary)]">{c.label}</a>
              ) : (
                <span aria-current="page">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[22px] font-extrabold tracking-[-.03em] text-[var(--text-primary)]">{title}</h1>
        {actions}
      </div>
    </div>
  );
}
