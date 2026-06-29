/**
 * 오개념 패턴 누적 store — B6.
 *
 * 퀴즈 오답 시 그 보기의 함정 태그(DistractorTag)를 per-user 로 누적한다.
 * 같은 유형에 임계(threshold=2회) 도달하면 챗에 코칭 카드를 띄우고(usePendingCoachTag),
 * 학생이 '확인했어요' 하면 markCoached 로 그 태그를 잠재운다.
 *
 * per-user localStorage mock(pullim-api 부재). 흡수 후 record/markCoached 가
 * 실 API 로 교체될 지점 — Phase β 별도 PR.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DistractorTag } from '@/lib/mock/classbot-distractor';

/** 코칭 카드 등장 임계 — 같은 함정에 이 횟수 도달 시 노출. */
export const COACH_THRESHOLD = 2;

interface MisconceptionStore {
  /** userId → (tag → 누적 횟수). 'correct'/falsy 태그는 기록하지 않는다. */
  counts: Record<string, Record<string, number>>;
  /** userId → 이미 코칭(확인)한 태그 목록 — 재등장 억제. */
  coached: Record<string, DistractorTag[]>;
  /** 오답 함정 1회 누적. tag 가 falsy 또는 'correct' 면 무시(no-op). */
  record: (userId: string, tag: DistractorTag | undefined) => void;
  /** 태그를 '확인함'으로 표시(idempotent) — 코칭 카드 dismiss. */
  markCoached: (userId: string, tag: DistractorTag) => void;
  /** 해당 user 의 누적·코칭 기록 초기화. */
  reset: (userId: string) => void;
}

export const useMisconceptionStore = create<MisconceptionStore>()(
  persist(
    (set) => ({
      counts: {},
      coached: {},

      record: (userId, tag) =>
        set((s) => {
          // 'correct'/falsy 는 누적 대상 아님.
          if (!tag || tag === 'correct') return s;
          const userCounts = s.counts[userId] ?? {};
          const next = (userCounts[tag] ?? 0) + 1;
          return {
            counts: { ...s.counts, [userId]: { ...userCounts, [tag]: next } },
          };
        }),

      markCoached: (userId, tag) =>
        set((s) => {
          const prev = s.coached[userId] ?? [];
          if (prev.includes(tag)) return s;
          return { coached: { ...s.coached, [userId]: [...prev, tag] } };
        }),

      reset: (userId) =>
        set((s) => {
          if (!(userId in s.counts) && !(userId in s.coached)) return s;
          const counts = { ...s.counts };
          const coached = { ...s.coached };
          delete counts[userId];
          delete coached[userId];
          return { counts, coached };
        }),
    }),
    { name: 'pullim-misconception' },
  ),
);

/** 안정 빈 객체 — 셀렉터 ref churn 방지. */
const EMPTY_COUNTS: Record<string, number> = {};

/** per-user 함정 누적 카운트(reactive). */
export function useMisconceptionCounts(userId: string): Record<string, number> {
  return useMisconceptionStore((s) => s.counts[userId] ?? EMPTY_COUNTS);
}

/**
 * threshold 도달 && 아직 코칭 안 한 첫 태그(DistractorTag) 반환, 없으면 null.
 * counts 객체 키 순서(누적 순) 중 첫 매칭 — 가장 먼저 임계에 닿은 함정을 코칭.
 */
export function usePendingCoachTag(
  userId: string,
  threshold: number = COACH_THRESHOLD,
): DistractorTag | null {
  return useMisconceptionStore((s) => {
    const counts = s.counts[userId];
    if (!counts) return null;
    const coached = s.coached[userId] ?? [];
    for (const tag of Object.keys(counts)) {
      if (counts[tag] >= threshold && !coached.includes(tag as DistractorTag)) {
        return tag as DistractorTag;
      }
    }
    return null;
  });
}
