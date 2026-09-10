"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { SkipLink } from "@/components/ui/skip-link";
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
    <>
      {/* WCAG 2.4.1 — 헤더·레일을 건너뛰는 첫 포커스 대상. 포커스 전엔 sr-only. */}
      <SkipLink />
      <DashboardShell
        brand={<AppBrand role={role} />}
        actions={<AppHeaderActions role={role} />}
        rail={rail}
        // 사이드바 왼쪽 고정 — 데스크톱 레일을 항상 펼침으로 핀.
        // collapsed={false}(항상 펼침) + hideToggle(접기 토글 숨김). 둘 다 PUDS 상류 prop 이다.
        collapsed={false}
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
