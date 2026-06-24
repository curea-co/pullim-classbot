"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { AppBrand, AppHeaderActions } from "./app-header";
import { Breadcrumb } from "./breadcrumb";
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  // 사이드바(레일) 접기/펼치기 — 데스크톱 전용. 접으면 rail 미렌더 → 본문 풀폭.
  const [railOpen, setRailOpen] = useState(true);
  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div className="flex w-[var(--rail-w,248px)] flex-col gap-2 py-3">
      {sections.map((s, i) => (
        <OsRail key={s.head + i} head={s.head} items={s.items} />
      ))}
    </div>
  );
  const brand = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setRailOpen((o) => !o)}
        aria-label="사이드바 접기/펼치기"
        aria-pressed={!railOpen}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] md:inline-flex"
      >
        <PanelLeft className="h-5 w-5" />
      </button>
      <AppBrand role={role} />
    </div>
  );
  return (
    <DashboardShell
      brand={brand}
      actions={<AppHeaderActions role={role} />}
      rail={railOpen ? rail : undefined}
      tabbar={role === "student" ? <OsTabbar items={tabItems(pathname)} /> : undefined}
    >
      <Breadcrumb role={role} />
      {children}
    </DashboardShell>
  );
}
