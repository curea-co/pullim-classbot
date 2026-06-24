import * as React from "react";
import { cn } from "@/lib/cn";
import { OsTabbar, type TabbarItem } from "./os-tabbar";

export type BrandProp =
  | React.ReactNode
  | { logo?: React.ReactNode; title: string; sub?: string; href?: string };

export interface DashboardShellProps {
  brand: BrandProp;
  switcher?: React.ReactNode;
  actions?: React.ReactNode;
  /** Left navigation. Pass a labelled <nav> (e.g. OsRail) for landmark accessibility. */
  rail?: React.ReactNode;
  tabbar?: TabbarItem[] | React.ReactNode;
  /** Sidebar collapsed (icon-only) state. */
  collapsed?: boolean;
  /** Toggle handler — renders a floating collapse button on the sidebar divider. */
  onToggleCollapsed?: () => void;
  /** Content landmark element. Use "div" when consumer pages render their own <main>. */
  as?: "main" | "div";
  /** Link element for the brand (e.g. next/link's Link). Defaults to "a". */
  linkComponent?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

function isBrandObject(
  b: BrandProp,
): b is { logo?: React.ReactNode; title: string; sub?: string; href?: string } {
  return typeof b === "object" && b !== null && "title" in b;
}

function Brand({ brand, linkComponent }: { brand: BrandProp; linkComponent: React.ElementType }) {
  if (!isBrandObject(brand)) return <>{brand}</>;
  const { logo, title, sub, href = "/" } = brand;
  const Link = linkComponent;
  return (
    <Link href={href} className="flex items-center gap-2 text-[var(--text-primary)] no-underline">
      {logo}
      <span className="text-[15px] font-extrabold tracking-[-.02em]">{title}</span>
      {sub && (
        <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-[.1em] text-[var(--text-tertiary)]">
          {sub}
        </span>
      )}
    </Link>
  );
}

export function DashboardShell({
  brand,
  switcher,
  actions,
  rail,
  tabbar,
  collapsed = false,
  onToggleCollapsed,
  as = "main",
  linkComponent = "a",
  children,
  className,
}: DashboardShellProps) {
  const tabbarNode = Array.isArray(tabbar) ? <OsTabbar items={tabbar} linkComponent={linkComponent} /> : tabbar;
  const Content = as;
  return (
    <div className={cn("min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]", className)}>
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b border-[var(--border-default)] bg-[var(--surface-raised)] px-4">
        <Brand brand={brand} linkComponent={linkComponent} />
        {switcher}
        <div className="flex-1" />
        {actions}
      </header>
      <div className="mx-auto flex w-full max-w-[1400px]">
        {rail && (
          <aside className="sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 border-r border-[var(--border-subtle)] md:block">
            {/* relative wrapper so the toggle button sticks WITH the sticky aside (not the page),
                and right-0 keeps it on the divider as the rail width changes on collapse. */}
            <div className="relative h-full w-max">
              <div className="h-full overflow-y-auto">{rail}</div>
              {onToggleCollapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
                  aria-expanded={!collapsed}
                  className="absolute right-0 top-5 z-30 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] shadow-[var(--shadow-md)] transition-colors duration-200 hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] md:flex"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cn("transition-transform duration-200", collapsed && "rotate-180")}
                  >
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>
              )}
            </div>
          </aside>
        )}
        <Content className="min-w-0 flex-1 px-6 py-8 pb-24 md:pb-8">{children}</Content>
      </div>
      {tabbarNode}
    </div>
  );
}
