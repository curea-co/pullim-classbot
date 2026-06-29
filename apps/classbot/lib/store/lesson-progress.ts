/**
 * 레슨 진도 — 챗 봇 주도 수업의 4단 위상(개념→예제→퀴즈→정리) 방문 기록.
 * per-user × per-bot 격리, localStorage persist 로 세션 간 유지.
 *
 * 실제 학습 위상 전진은 chat/page.tsx 의 lessonRequest useEffect / send() 콜백이
 * turn.kind → phase 매핑 후 markPhase 로 마킹한다(A1).
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LessonPhase = 'concept' | 'example' | 'quiz' | 'summary';

/** 위상 진행 순서 — current 계산(최후미 방문 위상)에 사용. */
export const PHASE_ORDER: LessonPhase[] = ['concept', 'example', 'quiz', 'summary'];

/** `${userId}:${botId}` 합성 키 — per-user × per-bot 격리. */
function progressKey(userId: string, botId: string): string {
  return `${userId}:${botId}`;
}

interface LessonProgressStore {
  /** key=`${userId}:${botId}` → 방문한 위상 목록(중복 없음) */
  visited: Record<string, LessonPhase[]>;
  /** 위상 방문 마킹 (중복 방지 push) */
  markPhase: (userId: string, botId: string, phase: LessonPhase) => void;
  /** 특정 user×bot 진도 초기화 */
  reset: (userId: string, botId: string) => void;
}

export const useLessonProgressStore = create<LessonProgressStore>()(
  persist(
    (set) => ({
      visited: {},

      markPhase: (userId, botId, phase) =>
        set((s) => {
          const key = progressKey(userId, botId);
          const prev = s.visited[key] ?? [];
          if (prev.includes(phase)) return s;
          return { visited: { ...s.visited, [key]: [...prev, phase] } };
        }),

      reset: (userId, botId) =>
        set((s) => {
          const key = progressKey(userId, botId);
          if (!(key in s.visited)) return s;
          const next = { ...s.visited };
          delete next[key];
          return { visited: next };
        }),
    }),
    { name: 'pullim-lesson-progress' },
  ),
);

/**
 * per-user × per-bot 진도 셀렉터.
 * current = 방문 위상 중 PHASE_ORDER 최후미(빈 배열 → 'concept' 폴백).
 * hydration 전에는 visited 가 빈 배열로 평가돼 SSR 일치(useStoresHydrated 와 무관하게 안전).
 */
export function useLessonProgress(
  userId: string,
  botId: string,
): { visited: LessonPhase[]; current: LessonPhase } {
  const visited = useLessonProgressStore((s) => s.visited[progressKey(userId, botId)]);
  return resolveProgress(visited);
}

/** visited 배열 → { visited, current } 파생(테스트·셀렉터 공용). */
export function resolveProgress(visited: LessonPhase[] | undefined): {
  visited: LessonPhase[];
  current: LessonPhase;
} {
  const list = visited ?? [];
  let current: LessonPhase = 'concept';
  for (const phase of PHASE_ORDER) {
    if (list.includes(phase)) current = phase;
  }
  return { visited: list, current };
}
