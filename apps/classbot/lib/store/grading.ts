/**
 * 교사 채점 확정 store — 채점 허브 「AI 초안 검수」의 결론을 남긴다.
 *
 * 정책:
 * - localStorage persist — 새로고침해도 확정이 남는다 (assignments.ts 와 동일 문법)
 * - 확정 방식 2종을 구분해 저장: `approved`(AI 초안 그대로) / `overridden`(교사가 고쳐서 승인).
 *   수정 후 승인은 교사가 고친 점수·의견·루브릭을 함께 남겨 다시 열었을 때 그대로 복원한다.
 * - mock 시드(`GradingItem.status`) 위에 확정 결과를 **덮어쓰는** 병합은 mergeGradingItems /
 *   useMergedGradingItems 가 맡는다 — assignments.ts 의 useMergedAssignments 와 같은 결
 * - 소비 화면은 `useStoresHydrated(useGradingStore)` 로 rehydrate 를 기다린다
 *
 * 서버 전송은 아직 없다 — 정본 라우트가 생기면 decide() 안 TODO 자리에서 낙관 전송한다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradingItem } from '@/lib/mock';

/** 루브릭 한 항목 — 채점 허브 mock 의 항목 모양 그대로. */
export type GradingRubricItem = GradingItem['rubric'][number];

/** 확정 방식 — 'approved' = AI 초안 그대로, 'overridden' = 교사가 고쳐서 승인. */
export type GradingDecisionKind = 'approved' | 'overridden';

/** 교사가 확정한 채점 1건. */
export interface GradingDecision {
  /** 채점 항목 id (GradingItem.id) */
  itemId: string;
  kind: GradingDecisionKind;
  /** 확정 점수 (만점 기준 원점수) — 그대로 승인이면 AI 초안 점수와 같다 */
  finalScore: number;
  maxScore: number;
  /** 확정 의견 — 그대로 승인이면 AI 초안 문구 그대로 */
  comment: string;
  /** 루브릭 항목별 점수 스냅샷 — 다시 열었을 때 슬라이더 복원용 */
  rubric: GradingRubricItem[];
  /** AI 초안 대비 점수 변경률(%) — 그대로 승인은 항상 0 */
  overrideDelta: number;
  /** 확정 시각 (ISO8601) */
  decidedAt: string;
}

/** 확정 입력 — kind·decidedAt 은 store 가 채운다. */
export type GradingDecisionInput = Omit<GradingDecision, 'kind' | 'decidedAt' | 'overrideDelta'> & {
  /** 수정 후 승인일 때 AI 초안 대비 점수 변경률(%). 그대로 승인에서는 무시되고 0 이 된다. */
  overrideDelta?: number;
};

interface GradingStore {
  /** itemId → 확정 1건 (재확정은 덮어쓰기) */
  decisions: Record<string, GradingDecision>;
  /** 그대로 승인 — AI 초안을 손대지 않고 확정 */
  approve: (input: GradingDecisionInput) => GradingDecision;
  /** 수정 후 승인 — 교사가 고친 점수·의견·루브릭으로 확정 */
  approveWithEdit: (input: GradingDecisionInput) => GradingDecision;
}

export const useGradingStore = create<GradingStore>()(
  persist(
    (set) => {
      const decide = (kind: GradingDecisionKind, input: GradingDecisionInput): GradingDecision => {
        const decision: GradingDecision = {
          itemId: input.itemId,
          kind,
          finalScore: input.finalScore,
          maxScore: input.maxScore,
          comment: input.comment,
          rubric: input.rubric,
          // 그대로 승인은 정의상 초안과 같은 점수 → 변경률 0.
          overrideDelta: kind === 'overridden' ? (input.overrideDelta ?? 0) : 0,
          decidedAt: new Date().toISOString(),
        };
        set((s) => ({ decisions: { ...s.decisions, [decision.itemId]: decision } }));
        // TODO(Phase β) — 채점 확정 정본 라우트가 생기면 여기서 낙관 전송한다.
        // assignments.ts 의 dispatchToBackend 패턴 그대로: 스토어 선반영 후 전송,
        // 실패는 콘솔 경고 + 로컬 유지. 지금은 localStorage 가 유일한 저장소다.
        return decision;
      };

      return {
        decisions: {},
        approve: (input) => decide('approved', input),
        approveWithEdit: (input) => decide('overridden', input),
      };
    },
    {
      name: 'pullim-grading',
    },
  ),
);

/** 특정 항목의 확정 결과 — 아직 확정 전이면 undefined. */
export function useGradingDecision(itemId: string): GradingDecision | undefined {
  return useGradingStore((s) => s.decisions[itemId]);
}

/** 확정 모음 (reactive). */
export function useGradingDecisions(): Record<string, GradingDecision> {
  return useGradingStore((s) => s.decisions);
}

/**
 * 확정 결과를 얹은 상태 — 확정이 있으면 그 방식(approved/overridden)이 mock status 를 이긴다.
 * 확정 전이면 시드 status 그대로.
 */
export function resolveGradingStatus(
  item: GradingItem,
  decisions: Record<string, GradingDecision>,
): GradingItem['status'] {
  return decisions[item.id]?.kind ?? item.status;
}

/**
 * 채점 큐 병합 — mock 시드 위에 확정 결과를 덮어쓴다(status·overrideDelta).
 * AI 초안 점수(draftScore)는 초안 그대로 둔다 — 큐 행이 보여주는 건 「AI 초안」이라서다.
 * 컴포넌트 밖(테스트·루프)에서 쓰는 순수 버전.
 */
export function mergeGradingItems(
  items: GradingItem[],
  decisions: Record<string, GradingDecision>,
): GradingItem[] {
  return items.map((item) => {
    const decision = decisions[item.id];
    if (!decision) return item;
    return { ...item, status: decision.kind, overrideDelta: decision.overrideDelta };
  });
}

/** mergeGradingItems 의 훅 버전 — 채점 큐/KPI 가 쓴다. */
export function useMergedGradingItems(items: GradingItem[]): GradingItem[] {
  const decisions = useGradingDecisions();
  return mergeGradingItems(items, decisions);
}
