'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SetNodeFn = (n: ReactNode) => void;

/** Stable setter — never changes after mount */
const SetCtx = createContext<SetNodeFn | null>(null);
/** Reactive value — consumed only by RightRailAside */
const NodeCtx = createContext<ReactNode>(null);

export function RightRailProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  // useCallback so SetCtx value is referentially stable
  const stableSetNode = useCallback<SetNodeFn>((n) => setNode(n), []);
  return (
    <SetCtx.Provider value={stableSetNode}>
      <NodeCtx.Provider value={node}>{children}</NodeCtx.Provider>
    </SetCtx.Provider>
  );
}

/** Page-side: register right-rail content; clears on unmount. */
export function useSetRightRail(node: ReactNode): void {
  const setNode = useContext(SetCtx);
  useEffect(() => {
    setNode?.(node);
    return () => setNode?.(null);
  }, [setNode, node]);
}

/** Shell-side: renders the 3rd column when a page registered content. */
export function RightRailAside({ className }: { className?: string }) {
  const node = useContext(NodeCtx);
  if (!node) return null;
  return (
    <aside className={cn('border-pullim-slate-200 bg-card hidden w-80 shrink-0 overflow-y-auto border-l lg:flex lg:flex-col', className)}>
      {node}
    </aside>
  );
}
