"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { useRailCollapsed } from "./rail-collapse-context";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  /**
   * Locked entry — 이동할 수 없는 항목. `<span role="link" aria-disabled>` 로
   * 렌더된다: href 없음, 라우터 프리페치 없음, 이동 없음.
   *
   * `active` 와 **직교한다.** 잠겨 있어도 현재 위치는 현재 위치이므로
   * `aria-current="page"` 와 강조를 그대로 갖고, 탭 순서에도 남는다.
   * 자세한 근거는 `nav/sidebar.tsx` 참고.
   */
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
        <div className="px-[var(--pad-md)] pb-[var(--pad-xs)] pt-[var(--pad-sm)] font-[var(--font-mono)] text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {head}
        </div>
      )}
      {items.map((item) => {
        // Locked items never render a link: no href, no router prefetch, no navigation.
        const Comp: React.ElementType = item.disabled ? "span" : Link;
        // 잠긴 항목도 현재 위치면 키보드로 닿아야 한다 — 현재 위치를 알려 주는 바로 그
        // 항목만 도달 불가가 되면 aria-current 를 붙인 목적이 무너진다.
        const lockedTabIndex = item.active ? 0 : -1;
        return (
          <Comp
            key={item.href + item.label}
            // 현재 위치 안내는 두 갈래 모두에 붙는다 — active 만의 몫이다.
            aria-current={item.active ? "page" : undefined}
            {...(item.disabled
              ? { role: "link", "aria-disabled": true, tabIndex: lockedTabIndex }
              : { href: item.href })}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "relative flex items-center gap-[var(--gap-md)] rounded-[var(--radius-lg)] text-[length:var(--text-base)] font-medium text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)]",
              collapsed
                ? "h-[var(--row-h-compact)] w-[var(--row-h-compact)] justify-center"
                : "min-h-[var(--row-h-compact)] px-[var(--pad-md)] py-[var(--pad-sm)]",
              !item.disabled && "hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
              "[&_svg]:h-[19px] [&_svg]:w-[19px]",
              // 강조는 active 만 결정한다 — 잠금 여부와 무관하다.
              item.active &&
                "bg-[var(--color-action-secondary)] font-semibold text-[var(--color-action-primary)]",
              item.active && !collapsed &&
                "before:absolute before:bottom-[9px] before:left-[-14px] before:top-[9px] before:w-[3px] before:rounded-[0_3px_3px_0] before:bg-[var(--color-action-primary)] before:content-['']",
              // 커서는 이동 가능성을 따라간다.
              item.disabled && "cursor-not-allowed",
              // 후퇴는 색으로만 한다 — `opacity-*` 금지. 근거·실측 수치는 nav/sidebar.tsx 참고.
              // 이 레일은 잠금 항목도 기본색(secondary)이라 알파가 유일한 구분이었다.
              // 알파를 걷어내는 대신 한 단계 후퇴시킨다(secondary → tertiary).
              item.disabled && !item.active && "text-[var(--text-tertiary)]",
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
