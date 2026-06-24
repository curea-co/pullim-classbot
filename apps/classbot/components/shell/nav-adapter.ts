import React from "react";
import { navForRole, studentBottomTabs, type Role } from "./nav-config";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}
export interface RailSection {
  head: string;
  items: RailItem[];
}

const ROLE_LABEL: Record<Role, string> = { student: "클래스봇", teacher: "교사" };

function isActive(href: string, pathname: string, matchPrefix?: string[]): boolean {
  if (href === "/" || href === "/classbot") return pathname === href;
  if (pathname === href) return true;
  if (matchPrefix?.some((p) => pathname.startsWith(p))) return true;
  return pathname.startsWith(href + "/");
}

/** '/' 은 /classbot 로 redirect → 같은 목적지로 취급해 홈 중복 제거 */
const normHref = (href: string): string => (href === "/" ? "/classbot" : href);

export function railSectionsForRole(role: Role, pathname: string): RailSection[] {
  const groups = navForRole(role);
  return groups.map((g) => {
    const items: RailItem[] = [];
    const seen = new Set<string>();
    const push = (it: { label: string; href: string; icon?: React.ComponentType<{ className?: string }>; matchPrefix?: string[] }) => {
      const key = normHref(it.href);
      if (seen.has(key)) return; // 중복 목적지(예: 홈 '/' vs '/classbot') 제거
      seen.add(key);
      items.push({
        label: it.label,
        href: it.href,
        icon: it.icon ? React.createElement(it.icon, { className: "h-[19px] w-[19px]" }) : undefined,
        active: isActive(it.href, pathname, it.matchPrefix),
      });
    };
    for (const item of g.items) {
      // children 있는 도메인은 그룹 컨테이너 — 부모 행은 생략하고 children 만 평탄화
      if (item.children?.length) {
        for (const child of item.children) push(child);
      } else {
        push(item);
      }
    }
    return { head: g.label || ROLE_LABEL[role], items };
  });
}

export function tabItems(pathname: string): RailItem[] {
  return studentBottomTabs.map((t) => {
    const Icon = t.icon;
    return {
      label: t.label,
      href: t.href,
      icon: Icon ? React.createElement(Icon, { className: "h-[22px] w-[22px]" }) : undefined,
      active: isActive(t.href, pathname, t.matchPrefix),
    };
  });
}
