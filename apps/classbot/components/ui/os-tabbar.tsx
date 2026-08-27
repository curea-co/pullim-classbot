import * as React from "react";
import { cn } from "@/lib/cn";

export interface TabbarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  /** Locked entry — rendered non-navigable with aria-disabled. */
  disabled?: boolean;
}

export interface OsTabbarProps {
  items: TabbarItem[];
  /** Link element (e.g. next/link's Link). Defaults to "a". */
  linkComponent?: React.ElementType;
  className?: string;
}

export function OsTabbar({ items, linkComponent = "a", className }: OsTabbarProps) {
  const Link = linkComponent;
  return (
    <nav
      aria-label="모바일 탭 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[var(--z-sticky)] flex justify-start gap-[var(--gap-xs)] overflow-x-auto border-t border-[var(--border-default)] bg-[var(--surface-raised)] px-[var(--pad-sm)] pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      {items.map((item) => {
        // Locked tabs never render a link: no href, no router prefetch, no navigation.
        const Comp: React.ElementType = item.disabled ? "span" : Link;
        return (
          <Comp
            key={item.href + item.label}
            {...(item.disabled
              ? { role: "link", "aria-disabled": true, tabIndex: -1 }
              : { href: item.href, "aria-current": item.active ? "page" : undefined })}
            className={cn(
              "flex min-h-[var(--row-h-compact)] w-[68px] shrink-0 flex-col items-center justify-center gap-[var(--gap-xs)] py-[var(--pad-sm)] text-[length:var(--text-xs)] font-medium text-[var(--text-tertiary)] transition-colors [&_svg]:h-[22px] [&_svg]:w-[22px]",
              item.active && !item.disabled && "text-[var(--color-action-primary)]",
              item.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {item.icon}
            {item.label}
          </Comp>
        );
      })}
    </nav>
  );
}
