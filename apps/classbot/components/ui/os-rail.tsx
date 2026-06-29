"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useRailCollapsed } from "./rail-collapse-context";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface OsRailProps {
  head: string;
  items: RailItem[];
  /** Icon-only collapsed mode. */
  collapsed?: boolean;
  /** Link element (e.g. next/link's Link). Defaults to "a". */
  linkComponent?: React.ElementType;
  className?: string;
}

export function OsRail({ head, items, collapsed: collapsedProp, linkComponent = "a", className }: OsRailProps) {
  const ctx = useRailCollapsed();
  const collapsed = collapsedProp ?? ctx;
  const Link = linkComponent;
  return (
    <nav
      aria-label={head}
      className={cn(
        "flex flex-col gap-0.5 p-3 transition-[width] duration-200",
        collapsed ? "w-[68px] items-center" : "w-64",
        className,
      )}
    >
      {!collapsed && (
        <div className="px-3 pb-1.5 pt-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[.14em] text-[var(--text-tertiary)]">
          {head}
        </div>
      )}
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          title={collapsed ? item.label : undefined}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-[11px] rounded-[11px] text-sm font-medium text-[var(--text-secondary)] transition-colors duration-150",
            collapsed ? "h-[42px] w-[42px] justify-center" : "px-3 py-2.5",
            "hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
            "[&_svg]:h-[19px] [&_svg]:w-[19px]",
            item.active && "bg-[var(--color-action-secondary)] font-semibold text-[var(--color-action-primary)]",
            item.active && !collapsed &&
              "before:absolute before:bottom-[9px] before:left-[-14px] before:top-[9px] before:w-[3px] before:rounded-[0_3px_3px_0] before:bg-[var(--color-action-primary)] before:content-['']",
          )}
        >
          {item.icon}
          {!collapsed && <span>{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
