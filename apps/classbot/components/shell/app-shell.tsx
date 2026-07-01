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
      // 사이드바 왼쪽 고정 — 데스크톱 레일을 항상 펼침으로 핀(controlled=false, 접기 토글 없음).
      // 앱 측 controlled 경로라 PUDS resync 에 안전(벤더 파일 미의존). onToggleCollapsed 는 넘기지 않아
      // dashboard-shell 이 토글 버튼 자체를 렌더하지 않는다.
      collapsed={false}
      tabbar={role === "student" ? <OsTabbar items={tabItems(pathname)} linkComponent={Link} /> : undefined}
      linkComponent={Link}
    >
      <Breadcrumb role={role} />
      {children}
    </DashboardShell>
  );
}
