"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useRailCollapsed } from "./rail-collapse-context";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  /** Locked entry — rendered non-navigable with aria-disabled. */
  disabled?: boolean;
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
  const ctxCollapsed = useRailCollapsed();
  const collapsed = collapsedProp ?? ctxCollapsed;
  const Link = linkComponent;
  return (
    <nav
      aria-label={head}
      className={cn(
        "flex flex-col gap-[var(--gap-2xs)] p-[var(--pad-md)] transition-[width] duration-[var(--duration-fast)]",
        collapsed ? "w-[68px] items-center" : "w-64",
        className,
      )}
    >
      {!collapsed && (
        <div className="px-[var(--pad-md)] pb-[var(--pad-xs)] pt-[var(--pad-sm)] font-[var(--font-mono)] text-[length:var(--text-xs)] uppercase tracking-[.14em] text-[var(--text-tertiary)]">
          {head}
        </div>
      )}
      {items.map((item) => {
        // Locked items never render a link: no href, no router prefetch, no navigation.
        const Comp: React.ElementType = item.disabled ? "span" : Link;
        return (
          <Comp
            key={item.href + item.label}
            {...(item.disabled
              ? { role: "link", "aria-disabled": true, tabIndex: -1 }
              : { href: item.href, "aria-current": item.active ? "page" : undefined })}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "relative flex items-center gap-[var(--gap-md)] rounded-[var(--radius-lg)] text-[length:var(--text-base)] font-medium text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)]",
              collapsed
                ? "h-[var(--row-h-compact)] w-[var(--row-h-compact)] justify-center"
                : "min-h-[var(--row-h-compact)] px-[var(--pad-md)] py-[var(--pad-sm)]",
              !item.disabled && "hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
              "[&_svg]:h-[19px] [&_svg]:w-[19px]",
              item.active && !item.disabled &&
                "bg-[var(--color-action-secondary)] font-semibold text-[var(--color-action-primary)]",
              item.active && !item.disabled && !collapsed &&
                "before:absolute before:bottom-[9px] before:left-[-14px] before:top-[9px] before:w-[3px] before:rounded-[0_3px_3px_0] before:bg-[var(--color-action-primary)] before:content-['']",
              item.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Comp>
        );
      })}
    </nav>
  );
}
