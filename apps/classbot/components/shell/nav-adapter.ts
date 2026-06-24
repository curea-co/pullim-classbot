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

export function railSectionsForRole(role: Role, pathname: string): RailSection[] {
  const groups = navForRole(role);
  return groups.map((g) => {
    const items: RailItem[] = [];
    for (const item of g.items) {
      const Icon = item.icon;
      items.push({
        label: item.label,
        href: item.href,
        icon: Icon ? React.createElement(Icon, { className: "h-[19px] w-[19px]" }) : undefined,
        active: isActive(item.href, pathname, item.matchPrefix),
      });
      // flatten a domain's children in after it
      for (const child of item.children ?? []) {
        const CIcon = child.icon;
        items.push({
          label: child.label,
          href: child.href,
          icon: CIcon ? React.createElement(CIcon, { className: "h-[19px] w-[19px]" }) : undefined,
          active: isActive(child.href, pathname),
        });
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
