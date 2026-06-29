/**
 * 세션 목표 진척 — "오늘의 한 가지"(개념/예제/퀴즈) 달성도.
 * key=`${userId}::${botId}` 격리, localStorage persist 로 세션 간 유지(B7).
 *
 * 유일 실시간 구독자는 SessionGoalBanner. summary 버블은 구독하지 않고
 * 빌드 시점 done snapshot 을 payload 에 박아 정적 렌더한다(render-perf).
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionStep = 'concept' | 'example' | 'quiz';

export interface SessionProgress {
  concept: boolean;
  example: boolean;
  quiz: boolean;
  goalDone: boolean;
}

const EMPTY_PROGRESS: SessionProgress = {
  concept: false,
  example: false,
  quiz: false,
  goalDone: false,
};

interface SessionGoalStore {
  /** key=`${userId}::${botId}` → 단계별 달성 + 목표완료 */
  progress: Record<string, SessionProgress>;
  /** 단계 달성 마킹 (idempotent) */
  mark: (key: string, step: SessionStep) => void;
  setGoalDone: (key: string, v: boolean) => void;
  reset: (key: string) => void;
}

export const useSessionGoalStore = create<SessionGoalStore>()(
  persist(
    (set) => ({
      progress: {},

      mark: (key, step) =>
        set((s) => {
          const prev = s.progress[key] ?? EMPTY_PROGRESS;
          if (prev[step]) return s;
          return { progress: { ...s.progress, [key]: { ...prev, [step]: true } } };
        }),

      setGoalDone: (key, v) =>
        set((s) => {
          const prev = s.progress[key] ?? EMPTY_PROGRESS;
          if (prev.goalDone === v) return s;
          return { progress: { ...s.progress, [key]: { ...prev, goalDone: v } } };
        }),

      reset: (key) =>
        set((s) => {
          if (!(key in s.progress)) return s;
          const next = { ...s.progress };
          delete next[key];
          return { progress: next };
        }),
    }),
    { name: 'pullim-session-goal' },
  ),
);

/** 미존재 key → 전부 false. 달성도(doneCount)는 컴포넌트에서 계산. */
export function useSessionProgress(key: string): SessionProgress {
  return useSessionGoalStore((s) => s.progress[key] ?? EMPTY_PROGRESS);
}
