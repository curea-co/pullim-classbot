"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

export interface ServiceSwitcherItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface ServiceSwitcherProps {
  current: string;
  services: ServiceSwitcherItem[];
  /** Link element (e.g. next/link's Link). Defaults to "a". */
  linkComponent?: React.ElementType;
  className?: string;
}

export function ServiceSwitcher({ current, services, linkComponent = "a", className }: ServiceSwitcherProps) {
  const Link = linkComponent;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const active = services.find((s) => s.active) ?? services.find((s) => s.name === current);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`서비스 전환: ${active?.name ?? current}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)]"
      >
        {active?.icon}
        <span>{active?.name ?? current}</span>
        <span aria-hidden="true" className="text-[var(--text-tertiary)]">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-1 min-w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-lg)]"
        >
          {services.map((s) => (
            <Link
              key={s.href + s.name}
              href={s.href}
              role="menuitem"
              aria-current={s.active ? "page" : undefined}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] no-underline transition-colors hover:bg-[var(--surface-sunken)]"
            >
              {s.icon}
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
