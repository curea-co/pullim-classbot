/**
 * 세션 목표 진척 — "오늘의 한 가지"(개념/예제/퀴즈) 달성도.
 * key=`${userId}::${botId}::${YYYY-MM-DD}` 격리(날짜 스코프 → 매일 자연 reset), localStorage persist 로 같은 날 유지(B7).
 *
 * 실시간 구독자: SessionGoalBanner(항상) + summary 버블(summary turn 한정).
 * 둘 다 hydration-게이트된 라이브 store 를 읽어 배너↔summary 가 항상 일치한다.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStoresHydrated } from './use-hydrated';

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
  /** key=`${userId}::${botId}::${YYYY-MM-DD}` → 단계별 달성 + 목표완료 */
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

/**
 * hydration-게이트 버전 — rehydration 완료 전에는 전부 false 를 강제 반환한다.
 * summary 버블이 freeze 된 pre-hydration snapshot 대신 라이브 store 를 읽되,
 * SSR/첫 페인트는 항상 0/false 로 평가돼 배너와 동일(하이드레이션 불일치 없음).
 */
export function useSessionProgressLive(key: string): SessionProgress {
  const hydrated = useStoresHydrated(useSessionGoalStore);
  const live = useSessionProgress(key);
  return hydrated ? live : EMPTY_PROGRESS;
}
