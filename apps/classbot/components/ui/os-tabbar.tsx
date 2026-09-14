import * as React from "react";
import { cn } from "@/lib/cn";

export interface TabbarItem {
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
        // 잠긴 탭도 현재 위치면 키보드로 닿아야 한다 — 현재 위치를 알려 주는 바로 그
        // 탭만 도달 불가가 되면 aria-current 를 붙인 목적이 무너진다.
        const lockedTabIndex = item.active ? 0 : -1;
        return (
          <Comp
            key={item.href + item.label}
            // 현재 위치 안내는 두 갈래 모두에 붙는다 — active 만의 몫이다.
            aria-current={item.active ? "page" : undefined}
            {...(item.disabled
              ? { role: "link", "aria-disabled": true, tabIndex: lockedTabIndex }
              : { href: item.href })}
            className={cn(
              // 평시 탭은 secondary 다. 예전엔 tertiary 였고 잠금 탭과 색이 같아서
              // 구분을 반투명이 혼자 지고 있었다 — 알파를 걷어내려면 사다리를 한 칸
              // 벌려야 한다. 평시 라벨 대비도 함께 올라간다(라이트 4.65~5.12 → 9.37~10.46).
              "flex min-h-[var(--row-h-compact)] w-[68px] shrink-0 flex-col items-center justify-center gap-[var(--gap-xs)] py-[var(--pad-sm)] text-[length:var(--text-xs)] font-medium text-[var(--text-secondary)] transition-colors [&_svg]:h-[22px] [&_svg]:w-[22px]",
              // 강조는 active 만 결정한다 — 잠금 여부와 무관하다.
              item.active && "text-[var(--color-action-primary)]",
              // 커서는 이동 가능성을 따라간다.
              item.disabled && "cursor-not-allowed",
              // 후퇴는 색으로만 한다 — `opacity-*` 금지. 근거·실측 수치는 nav/sidebar.tsx 참고.
              item.disabled && !item.active && "text-[var(--text-tertiary)]",
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
