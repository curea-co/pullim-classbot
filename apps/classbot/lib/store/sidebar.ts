/**
 * 글로벌 좌측 네비 사이드바 접힘 상태 — 데스크톱(lg+)에서 풀 라벨 ↔ 아이콘 전용 토글.
 * localStorage persist 로 새로고침·페이지 이동 후에도 유지. md(태블릿)는 항상 아이콘 전용이라 무관.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
    }),
    { name: 'pullim-sidebar' },
  ),
);
