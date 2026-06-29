/**
 * 개념 숙련도·약점 복습 store — B1B2.
 *
 * 퀴즈 결과(정/오답)를 개념별로 누적해 정답률(숙련도)을 추적하고,
 * 오답·회고 약점을 "복습 대상(due)" 으로 모은다. 레일이 숙련도 막대와
 * '복습할 약점' 카드를 띄우고, '다시 풀기' 가 챗에 review 퀴즈를 주입한다.
 *
 * 간격반복은 **'오답=due(now+10분)' boolean 수준 단순화** 우선 — SM-2 다단 간격은
 * mock 과투자 우려로 후속 PR 분리(plan §배치4 비범위/축소 스코프).
 *
 * per-user localStorage mock. 흡수 후 recordQuizResult/addReplayWeakness 가
 * 실 API 로 교체될 지점 — Phase β 별도 PR.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

/** 오답 → 복습 대상까지의 단순 지연(10분). 다단 간격(SM-2)은 후속 PR. */
export const DUE_DELAY_MS = 10 * 60 * 1000;
/** 약점 해제 기준 — 연속 정답 streak 이 이 값에 도달하면 약점에서 제거. */
export const CLEAR_STREAK = 2;

export interface ConceptStat {
  conceptId: string;
  botId: string;
  correct: number;
  wrong: number;
  /** 연속 정답 streak(오답 시 0) — 약점 해제 판정. */
  streak: number;
  lastSeenAt: number;
  /** 복습 예정 시각(ms). 미설정(0)=복습 대상 아님. */
  dueAt: number;
}

export interface WeaknessItem {
  /** 안정 dedup 키 — quiz:`q:${botId}:${conceptId}` / replay:`r:${replayId}:${atSec}`. */
  key: string;
  botId: string;
  conceptId: string;
  label: string;
  source: 'quiz' | 'replay';
  replayId?: string;
  atSec?: number;
  /** 복습 예정 시각(ms). due≤now 면 복습 노출. */
  dueAt: number;
}

interface UserProficiency {
  /** key=`${botId}:${conceptId}` → ConceptStat */
  concepts: Record<string, ConceptStat>;
  weaknesses: WeaknessItem[];
}

interface ProficiencyStore {
  byUser: Record<string, UserProficiency>;
  recordQuizResult: (
    userId: string,
    input: { botId: string; conceptId: string; correct: boolean },
  ) => void;
  addReplayWeakness: (
    userId: string,
    input: { botId: string; replayId: string; atSec: number; conceptId: string; label: string },
  ) => void;
  clearWeakness: (userId: string, key: string) => void;
}

function emptyUser(): UserProficiency {
  return { concepts: {}, weaknesses: [] };
}

function conceptKey(botId: string, conceptId: string): string {
  return `${botId}:${conceptId}`;
}

export const useProficiencyStore = create<ProficiencyStore>()(
  persist(
    (set) => ({
      byUser: {},

      recordQuizResult: (userId, { botId, conceptId, correct }) =>
        set((s) => {
          const now = Date.now();
          const user = s.byUser[userId] ?? emptyUser();
          const key = conceptKey(botId, conceptId);
          const prev = user.concepts[key] ?? {
            conceptId, botId, correct: 0, wrong: 0, streak: 0, lastSeenAt: 0, dueAt: 0,
          };
          const stat: ConceptStat = correct
            ? {
                ...prev,
                correct: prev.correct + 1,
                streak: prev.streak + 1,
                lastSeenAt: now,
                // 정답이면 복습 예약 해제.
                dueAt: 0,
              }
            : {
                ...prev,
                wrong: prev.wrong + 1,
                streak: 0,
                lastSeenAt: now,
                // 오답=복습 대상(now+10분). 다단 간격은 후속 PR.
                dueAt: now + DUE_DELAY_MS,
              };

          const wKey = `q:${botId}:${conceptId}`;
          let weaknesses = user.weaknesses;
          if (correct) {
            // 연속 정답 streak 도달 → 해당 퀴즈 약점 제거.
            if (stat.streak >= CLEAR_STREAK) {
              weaknesses = weaknesses.filter((w) => w.key !== wKey);
            }
          } else {
            // 오답 → 퀴즈 약점 upsert(dueAt 갱신).
            const existing = weaknesses.find((w) => w.key === wKey);
            const item: WeaknessItem = {
              key: wKey,
              botId,
              conceptId,
              label: existing?.label ?? conceptId,
              source: 'quiz',
              dueAt: stat.dueAt,
            };
            weaknesses = existing
              ? weaknesses.map((w) => (w.key === wKey ? { ...w, dueAt: stat.dueAt } : w))
              : [...weaknesses, item];
          }

          return {
            byUser: {
              ...s.byUser,
              [userId]: {
                concepts: { ...user.concepts, [key]: stat },
                weaknesses,
              },
            },
          };
        }),

      addReplayWeakness: (userId, { botId, replayId, atSec, conceptId, label }) =>
        set((s) => {
          const now = Date.now();
          const user = s.byUser[userId] ?? emptyUser();
          const wKey = `r:${replayId}:${atSec}`;
          const item: WeaknessItem = {
            key: wKey, botId, conceptId, label, source: 'replay', replayId, atSec,
            // 회고 약점은 즉시 복습 대상.
            dueAt: now,
          };
          const existing = user.weaknesses.find((w) => w.key === wKey);
          const weaknesses = existing
            ? user.weaknesses.map((w) => (w.key === wKey ? { ...item } : w))
            : [...user.weaknesses, item];
          return {
            byUser: { ...s.byUser, [userId]: { ...user, weaknesses } },
          };
        }),

      clearWeakness: (userId, key) =>
        set((s) => {
          const user = s.byUser[userId];
          if (!user) return s;
          if (!user.weaknesses.some((w) => w.key === key)) return s;
          return {
            byUser: {
              ...s.byUser,
              [userId]: { ...user, weaknesses: user.weaknesses.filter((w) => w.key !== key) },
            },
          };
        }),
    }),
    { name: 'pullim-proficiency' },
  ),
);

/* ─── 셀렉터 / 파생 ─── */

/** 안정 빈 객체/배열 — ref churn 방지. */
const EMPTY_CONCEPTS: Record<string, ConceptStat> = {};
const EMPTY_WEAK: WeaknessItem[] = [];

/**
 * per-user × per-bot 개념별 stat 맵(reactive). 키=`${botId}:${conceptId}`.
 * useShallow 로 얕은 비교 — 매 렌더 새 객체를 만들어도 내용 불변이면 리렌더 churn 없음.
 */
export function useConceptStats(userId: string, botId: string): Record<string, ConceptStat> {
  return useProficiencyStore(
    useShallow((s) => {
      const all = s.byUser[userId]?.concepts ?? EMPTY_CONCEPTS;
      if (all === EMPTY_CONCEPTS) return EMPTY_CONCEPTS;
      const out: Record<string, ConceptStat> = {};
      for (const k of Object.keys(all)) {
        if (all[k].botId === botId) out[k] = all[k];
      }
      return out;
    }),
  );
}

/**
 * due≤now 인 per-user × per-bot 약점, 오래된 due 우선 정렬.
 * now 주입(테스트 결정성) — 미지정 시 Date.now().
 */
export function useDueWeaknesses(
  userId: string,
  botId: string,
  now?: number,
): WeaknessItem[] {
  const at = now ?? Date.now();
  return useProficiencyStore(
    useShallow((s) => {
      const list = s.byUser[userId]?.weaknesses ?? EMPTY_WEAK;
      if (list === EMPTY_WEAK) return EMPTY_WEAK;
      const due = list
        .filter((w) => w.botId === botId && w.dueAt <= at)
        .sort((a, b) => a.dueAt - b.dueAt);
      return due.length === 0 ? EMPTY_WEAK : due;
    }),
  );
}

/** 정답률(correct/(correct+wrong)). 0시도 → null(미응시). 순수함수 — 테스트 공용. */
export function useMasteryPct(stat: ConceptStat | undefined): number | null {
  if (!stat) return null;
  const total = stat.correct + stat.wrong;
  if (total === 0) return null;
  return stat.correct / total;
}
