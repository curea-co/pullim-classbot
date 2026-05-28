/**
 * 리플레이 store — 검수 단계 편집/승인 + 라이브 종료 시 신규 processing 인스턴스 생성.
 * v1 client-side persist (localStorage).
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReplayStatus, Replay } from '@/lib/mock';

type ReplayOverride = {
  status?: ReplayStatus;
  keyTakeaways?: string[];
};

/** 라이브 종료 시 client-side에 새로 생긴 리플레이 (mock seed 외 추가분) */
export type CreatedReplay = Pick<
  Replay,
  | 'id' | 'lessonId' | 'botId' | 'classroom' | 'title' | 'chapter' | 'botName'
  | 'date' | 'startedAt' | 'endedAt' | 'durationMin' | 'participantCount'
> & {
  status: ReplayStatus;
  keyTakeaways: string[];
};

type ReplayStore = {
  overrides: Record<string, ReplayOverride>;
  created: CreatedReplay[];
  setTakeaways: (id: string, takeaways: string[]) => void;
  approve: (id: string) => void;
  /** processing → review (AI 처리 완료 후 검수 대기로 자동 진입) */
  promoteToReview: (id: string) => void;
  createFromLive: (payload: CreatedReplay) => void;
  reset: (id: string) => void;
};

export const useReplayStore = create<ReplayStore>()(
  persist(
    set => ({
      overrides: {},
      created: [],
      setTakeaways: (id, takeaways) =>
        set(state => ({
          overrides: { ...state.overrides, [id]: { ...state.overrides[id], keyTakeaways: takeaways } },
        })),
      approve: id =>
        set(state => {
          // seed 리플레이라면 override만, created에 있으면 직접 status 변경
          const inCreated = state.created.find(r => r.id === id);
          if (inCreated) {
            return {
              created: state.created.map(r => r.id === id ? { ...r, status: 'sent' as const } : r),
            };
          }
          return {
            overrides: { ...state.overrides, [id]: { ...state.overrides[id], status: 'sent' } },
          };
        }),
      promoteToReview: id =>
        set(state => ({
          created: state.created.map(r => r.id === id ? { ...r, status: 'review' as const } : r),
        })),
      createFromLive: payload =>
        set(state => ({
          created: [payload, ...state.created],
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
