/**
 * 제출 결과 — **저장하지 않는** 스토어(2026-09-16 계획 §06 R9 · FE PR 6).
 *
 * 풀이 화면이 `POST /classbot/assignments/:id/submit` 의 응답(점수·시각)과 학생이 낸 답을 여기 두고
 * 결과 화면·과제 대화가 읽는다. 종전 `pullim-assignments` persist 의 `submissions` 레인을 대신하는데,
 * **localStorage 에 쓰지 않는다** — 제출의 정본은 서버(`assignment_submissions`)이고, 이 브라우저에 사본을
 * 남기면 다른 기기와 어긋난 채로 오래 산다. 그래서 새로고침하면 비고, 결과 화면은 그때 「점수는 제출한
 * 직후에만 보여요」로 말한다(학생 본인이 제출을 되읽는 문은 아직 정본에 없다 — `/submissions` 는 operator 전용).
 *
 * `answers` 를 함께 두는 이유: 서버 응답에는 답이 없고(`SubmissionDto`), 과제 대화의 진행 트래커가
 * 「낸 답」을 문항 옆에 보여 준다.
 */

import { create } from 'zustand';

import type { SubmissionDto } from '@/lib/api/classbot-dto';

/** 제출 한 건 — 서버 응답 + 그때 보낸 답. */
export interface SubmissionResult {
  submission: SubmissionDto;
  answers: Record<string, unknown>;
}

interface SubmissionResultStore {
  /** 과제 id → 이 세션에서 마지막으로 제출한 결과. */
  results: Record<string, SubmissionResult>;
  record: (assignmentId: string, result: SubmissionResult) => void;
}

export const useSubmissionResultStore = create<SubmissionResultStore>()((set) => ({
  results: {},
  record: (assignmentId, result) =>
    set((s) => ({ results: { ...s.results, [assignmentId]: result } })),
}));

/**
 * 과제 하나의 제출 결과 — 이 세션에서 제출하지 않았으면 undefined.
 * @param assignmentId - 과제 id
 */
export function useSubmissionResult(assignmentId: string): SubmissionResult | undefined {
  return useSubmissionResultStore((s) => s.results[assignmentId]);
}
