"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { AppBrand, AppHeaderActions } from "./app-header";
import { Breadcrumb } from "./breadcrumb";
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("puds-rail-collapsed") === "1");
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      localStorage.setItem("puds-rail-collapsed", v ? "0" : "1");
      return !v;
    });

  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div
      className={cn(
        "flex flex-col gap-2 py-3",
        collapsed ? "w-[68px]" : "w-[var(--rail-w,248px)]",
      )}
    >
      {sections.map((s, i) => (
        <OsRail
          key={s.head + i}
          head={s.head}
          items={s.items}
          collapsed={collapsed}
          linkComponent={Link}
        />
      ))}
    </div>
  );

  return (
    <DashboardShell
      brand={<AppBrand role={role} />}
      actions={<AppHeaderActions role={role} />}
      rail={rail}
      tabbar={role === "student" ? <OsTabbar items={tabItems(pathname)} linkComponent={Link} /> : undefined}
      linkComponent={Link}
      collapsed={collapsed}
      onToggleCollapsed={toggleCollapsed}
    >
      <Breadcrumb role={role} />
      {children}
    </DashboardShell>
  );
}
