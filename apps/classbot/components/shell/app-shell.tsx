"use client";

import { type ReactNode, useCallback, useSyncExternalStore } from "react";
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
import styles from "./classbot-shell.module.css";

const RAIL_STORAGE_KEY = "puds-rail-collapsed";
const RAIL_CHANGE_EVENT = "classbot-rail-collapse";
let railFallback = false;

function readRailCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_STORAGE_KEY) === "1";
  } catch {
    return railFallback;
  }
}

function subscribeRailCollapse(notify: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === RAIL_STORAGE_KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(RAIL_CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RAIL_CHANGE_EVENT, notify);
  };
}

function useClassbotRailCollapse() {
  const collapsed = useSyncExternalStore(subscribeRailCollapse, readRailCollapsed, () => false);
  const toggle = useCallback(() => {
    const next = !readRailCollapsed();
    railFallback = next;
    try {
      localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // 저장 실패 시에도 이 탭의 레일 상태는 fallback 으로 유지한다.
    }
    window.dispatchEvent(new Event(RAIL_CHANGE_EVENT));
  }, []);

  return { collapsed, toggle };
}

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const { collapsed, toggle: toggleRail } = useClassbotRailCollapse();

  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div id="app-rail" className="flex w-max flex-col gap-2" data-collapsed={collapsed}>
      {sections.map((s, i) => (
        <OsRail
          key={s.head + i}
          head={s.head}
          items={s.items}
          linkComponent={Link}
          className="w-[248px] px-0 py-2"
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
        // 플래너처럼 접으면 아이콘 레일도 남기지 않고 aside 전체를 숨긴다.
        collapsed={collapsed}
        onToggleCollapsed={toggleRail}
        hideToggle
        tabbar={role === "student" ? (
          <OsTabbar
            items={tabItems(pathname)}
            linkComponent={Link}
            className={styles.tabbar}
          />
        ) : undefined}
        linkComponent={Link}
        className={`${styles.shell} ${collapsed ? styles.railCollapsed : ""}`}
      >
        {/* SkipLink 의 착지점. DashboardShell 이 <main> 에 id 를 받지 않아 래퍼로 잡는다. */}
        <div
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1180px] outline-none"
        >
          <Breadcrumb role={role} />
          {children}
        </div>
      </DashboardShell>
    </>
  );
}
