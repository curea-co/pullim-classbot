"use client";
import * as React from "react";

const RailCollapseContext = React.createContext(false);

export function RailCollapseProvider({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return <RailCollapseContext.Provider value={collapsed}>{children}</RailCollapseContext.Provider>;
}

export function useRailCollapsed(): boolean {
  return React.useContext(RailCollapseContext);
}
