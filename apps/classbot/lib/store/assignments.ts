/**
 * 과제 **초안** store — 이 브라우저에만 사는 임시저장.
 *
 * **낸 과제(`dispatched`)와 제출(`submissions`) 레인은 은퇴했다**(2026-09-16 계획 §06 R6~R10 · FE PR 6).
 * 정본은 pullim-api 다 — 내기는 `hooks/api/assignment-dispatch.ts`(`POST /classes/:id/assignments`, 문항까지),
 * 학생 읽기는 `app/(student)/classbot/assignment/use-assignment-reads.ts`, 제출은 `use-assignment-submit.ts`
 * (`POST /assignments/:id/submit`), 제출 현황은 `useAssignmentSubmissions`(`GET /assignments/:id/submissions`).
 * 함께 걷은 것: `useMergedAssignments`·`useAssignmentLookup`·`getQuestionsForAssignment`(mode 시드 폴백)·
 * `computeMockScore`·`recordSubmission`·`withdraw`/`restore`/`updateDispatched`(정본에 문이 없어 화면이 숨겼다).
 *
 * **초안은 남긴다.** 초안은 아직 아무에게도 안 간 것이라 기기 하나에만 있어도 뜻이 선다 — 서버에 둘 이유가 없다.
 * 다만 지금 `saveDraft` 를 부르는 곳은 없다(출제 화면의 「임시저장」이 `disabled` · 준비 중 v2). 그 버튼이
 * 열리는 날 이 스토어가 그 자리다.
 *
 * persist 키를 `pullim-assignments` → `pullim-assignment-drafts` 로 바꿨다 — 옛 키에는 `dispatched`·`submissions` 가
 * 굳어 있어 그대로 이어받으면 은퇴한 레인이 상태에 다시 앉는다. 옛 키는 rehydrate 뒤에 지운다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assignment, AssignmentQuestion } from '@/lib/mock';

/** 은퇴한 persist 키 — 옛 브라우저에 남은 것을 한 번 지운다. */
const RETIRED_STORAGE_KEY = 'pullim-assignments';

/** 초안 한 건 — 학생이 보는 모양(`Assignment`) + 출제 화면이 더 갖고 있던 것. */
export type UserAssignment = Assignment & {
  /** 초안은 언제나 `'draft'` — 낸 과제는 여기 오지 않는다. */
  dispatchStatus: 'draft';
  /** 대상 학생 id — 비면 반 전체. */
  targetStudentIds: string[];
  /** 마감 시각(ISO8601). 라벨(`dueLabel`·`dDay`)은 저장 시점에 굳으므로 견줄 값을 따로 둔다. */
  dueAt?: string;
  /** 시험 모드 시간 제한 (분) */
  examTimeLimitMin?: number;
  /** 교사가 출제 화면에서 쓴 문항 — 내는 순간 `toDispatchQuestions` 가 정본 본문으로 옮긴다. */
  questions?: AssignmentQuestion[];
};

type AssignmentStore = {
  /** 임시 저장 모음 (학생 미발송) */
  drafts: UserAssignment[];
  saveDraft: (a: UserAssignment) => void;
  removeDraft: (id: string) => void;
};

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set) => ({
      drafts: [],

      saveDraft: (a) =>
        set((s) => {
          const exists = s.drafts.some((d) => d.id === a.id);
          const next: UserAssignment = { ...a, dispatchStatus: 'draft' };
          return {
            drafts: exists ? s.drafts.map((d) => (d.id === a.id ? next : d)) : [...s.drafts, next],
          };
        }),

      removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    {
      name: 'pullim-assignment-drafts',
      partialize: (s) => ({ drafts: s.drafts }),
      onRehydrateStorage: () => () => {
        // 옛 키의 `dispatched`·`submissions` 는 정본과 어긋난 사본이다 — 남겨 두면 e2e·개발자가 그것을 읽는다.
        try {
          window.localStorage.removeItem(RETIRED_STORAGE_KEY);
        } catch {
          // SSR·저장소 차단 환경 — 지울 것도 없다.
        }
      },
    },
  ),
);

/** 새 초안 id — 정본 id(`asg_…`)와 겹치지 않게 접두사를 둔다. */
export function nextAssignmentId(): string {
  return `as_draft_${Date.now()}`;
}
