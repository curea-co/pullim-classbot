import * as React from "react";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";

export interface ServiceSwitcherItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface ServiceSwitcherProps {
  current: string;
  services: ServiceSwitcherItem[];
  className?: string;
}

export function ServiceSwitcher({ current, services, className }: ServiceSwitcherProps) {
  const active = services.find((s) => s.active) ?? services.find((s) => s.name === current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`서비스 전환: ${active?.name ?? current}`}
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]",
          className,
        )}
      >
        {active?.icon}
        <span>{active?.name ?? current}</span>
        <span aria-hidden="true" className="text-[var(--text-tertiary)]">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {services.map((s) => (
          <DropdownMenuItem key={s.href + s.name} render={<a href={s.href} aria-current={s.active ? "page" : undefined} className="flex items-center gap-2" />}>{s.icon}{s.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
