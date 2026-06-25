/**
 * 가벼운 모드(Light Day) 상태 — 그날 하루 opt-in. spec §5.
 * 날짜 키(enabledDate)라 다음 날 자동 해제. localStorage persist.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LightDayStore {
  /** 가벼운 모드를 켠 날짜(YYYY-MM-DD). null = 꺼짐. */
  enabledDate: string | null;
  enable: (today: string) => void;
  disable: () => void;
}

export const useLightDayStore = create<LightDayStore>()(
  persist(
    (set) => ({
      enabledDate: null,
      enable: (today) => set({ enabledDate: today }),
      disable: () => set({ enabledDate: null }),
    }),
    { name: 'pullim-light-day' },
  ),
);

/** 오늘 가벼운 모드가 켜져 있는지 (reactive). 날짜가 다르면 false → 다음 날 자동 off. */
export function useLightDayOn(today: string): boolean {
  return useLightDayStore((s) => s.enabledDate === today);
}

export function useLightDayActions(): { enable: (today: string) => void; disable: () => void } {
  const enable = useLightDayStore((s) => s.enable);
  const disable = useLightDayStore((s) => s.disable);
  return { enable, disable };
}
