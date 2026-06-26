"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { AppBrand, AppHeaderActions } from "./app-header";
import { Breadcrumb } from "./breadcrumb";
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();

  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div className="flex w-max flex-col gap-2 py-3">
      {sections.map((s, i) => (
        <OsRail
          key={s.head + i}
          head={s.head}
          items={s.items}
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
    >
      <Breadcrumb role={role} />
      {children}
    </DashboardShell>
  );
}
