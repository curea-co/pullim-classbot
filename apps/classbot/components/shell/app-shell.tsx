"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { SkipLink } from "@/components/ui/skip-link";
import { AppHeaderActions, AppHeaderStart, AppServiceSwitcher } from "./app-header";
import { Breadcrumb } from "./breadcrumb";
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();

  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div id="app-rail" className="flex w-max flex-col gap-2 py-3">
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
    <>
      {/* WCAG 2.4.1 — 헤더·레일을 건너뛰는 첫 포커스 대상. 포커스 전엔 sr-only. */}
      <SkipLink />
      <DashboardShell
        brand={<AppHeaderStart role={role} />}
        switcher={<AppServiceSwitcher />}
        actions={<AppHeaderActions role={role} />}
        rail={rail}
        // 열기/접기는 topbar 첫 자리에 둔다. PUDS 내부 버튼만 숨기고,
        // collapsed prop 은 넘기지 않아 셸의 저장 상태(puds-rail-collapsed)를 그대로 쓴다.
        hideToggle
        tabbar={role === "student" ? <OsTabbar items={tabItems(pathname)} linkComponent={Link} /> : undefined}
        linkComponent={Link}
      >
        {/* SkipLink 의 착지점. DashboardShell 이 <main> 에 id 를 받지 않아 래퍼로 잡는다. */}
        <div id="main-content" tabIndex={-1} className="outline-none">
          <Breadcrumb role={role} />
          {children}
        </div>
      </DashboardShell>
    </>
  );
}
