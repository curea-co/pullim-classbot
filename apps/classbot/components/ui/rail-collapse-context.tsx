"use client";
import * as React from "react";

export interface RailCollapseValue {
  collapsed: boolean;
  /** Flip the collapsed state. No-op when the provider was given no handler. */
  toggle: () => void;
}

const noop = () => {};

const RailCollapseContext = React.createContext<RailCollapseValue>({
  collapsed: false,
  toggle: noop,
});

export function RailCollapseProvider({
  collapsed,
  toggle = noop,
  children,
}: {
  collapsed: boolean;
  /** Optional so `<RailCollapseProvider collapsed>` keeps working read-only. */
  toggle?: () => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo<RailCollapseValue>(() => ({ collapsed, toggle }), [collapsed, toggle]);
  return <RailCollapseContext.Provider value={value}>{children}</RailCollapseContext.Provider>;
}

/**
 * Full rail-collapse control — lets a header button and the rail share one state.
 * `const { collapsed, toggle } = useRailCollapse();`
 */
export function useRailCollapse(): RailCollapseValue {
  return React.useContext(RailCollapseContext);
}

/** Read-only convenience for consumers that only render by state. */
export function useRailCollapsed(): boolean {
  return React.useContext(RailCollapseContext).collapsed;
}
