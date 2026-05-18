/**
 * 리플레이 review store — 교사가 검수 단계에서 핵심 메시지를 편집·승인할 때 사용.
 * v1 client-side. 발송 후 학생 리플레이 list에 즉시 반영(전체 새로고침 시 seed 복귀).
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReplayStatus } from '@/lib/mock';

type ReplayOverride = {
  status?: ReplayStatus;
  keyTakeaways?: string[];
};

type ReplayStore = {
  overrides: Record<string, ReplayOverride>;
  setTakeaways: (id: string, takeaways: string[]) => void;
  approve: (id: string) => void;
  reset: (id: string) => void;
};

export const useReplayStore = create<ReplayStore>()(
  persist(
    set => ({
      overrides: {},
      setTakeaways: (id, takeaways) =>
        set(state => ({
          overrides: { ...state.overrides, [id]: { ...state.overrides[id], keyTakeaways: takeaways } },
        })),
      approve: id =>
        set(state => ({
          overrides: { ...state.overrides, [id]: { ...state.overrides[id], status: 'sent' } },
        })),
      reset: id =>
        set(state => {
          const next = { ...state.overrides };
          delete next[id];
          return { overrides: next };
        }),
    }),
    { name: 'pullim-replay-overrides' },
  ),
);
