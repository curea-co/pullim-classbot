/**
 * 과제 대화 상태 — **대화를 과제에 매어 두는 자리** (SCR-C-37 · FR-C-39).
 *
 * 이 화면이 따로 있는 까닭이 여기 있다. 봇 대화(`/classbot/chat`)는 봇 단위로 흘러가지만,
 * 과제 대화는 **어떤 과제를 풀며 나눈 말인지**가 남아야 한다 — 선생님이 나중에 그 과제의
 * 풀이 과정을 볼 수 있어야 하기 때문이다. 그래서 대화는 `assignmentId` 로 묶어서 들고 다닌다.
 *
 * ── 지금 어디까지인가
 * DB 스키마를 건드릴 수 없어(이번 작업 제약) 아직 **클라이언트 상태**다. localStorage persist 라
 * 새로고침에는 견디지만 기기를 옮기면 사라지고, 선생님 쪽에서는 보이지 않는다.
 *
 * ── 영속을 붙일 자리 (딱 두 군데)
 *  1) `seed()`  — 지금은 mock 오프너를 넣는다. 서버가 생기면 여기서
 *                 `GET /api/assignments/:assignmentId/chat` 를 받아 그 결과로 대체한다.
 *                 (봇 대화의 `fetchChatHistory` 가 같은 일을 하는 선례다 — `lib/api/chat-stream.ts`)
 *  2) `append()` — 지금은 로컬 배열에 밀어 넣는다. 서버가 생기면 같은 자리에서
 *                 `POST /api/assignments/:assignmentId/chat` 로 한 턴을 보낸다.
 *                 명의는 서버가 JWT claim 으로 정하므로 본문에는 assignmentId 와 text 만 실으면 된다
 *                 (`persistChatMessage` 와 같은 규약 — `app/(student)/classbot/chat/page.tsx`).
 *
 * 두 자리 모두 **assignmentId 를 이미 손에 들고 있다** — 그게 이 store 의 모양을 이렇게 잡은 이유다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AssignmentChatTag } from '@/lib/mock/classbot-assignment-chat';

export interface AssignmentChatTurn {
  id: string;
  role: 'student' | 'bot';
  text: string;
  /** epoch ms — 말풍선 시각·날짜 구분선용. */
  at: number;
  tag?: AssignmentChatTag;
  /** 수업 범위 밖 질문을 되돌린 답 — 안내 줄을 덧붙인다. */
  redirected?: boolean;
}

interface AssignmentChatStore {
  /** assignmentId → 그 과제에 매인 대화. 이 키가 화면의 존재 이유다. */
  byAssignment: Record<string, AssignmentChatTurn[]>;
  /** 처음 열 때 오프너를 깐다. 이미 대화가 있으면 아무것도 하지 않는다(멱등). */
  seed: (assignmentId: string, turns: AssignmentChatTurn[]) => void;
  append: (assignmentId: string, turn: AssignmentChatTurn) => void;
}

export const useAssignmentChatStore = create<AssignmentChatStore>()(
  persist(
    (set, get) => ({
      byAssignment: {},

      seed: (assignmentId, turns) => {
        // 이미 대화가 있으면 덮지 않는다 — 재진입 때 학생이 쓴 말이 사라지면 안 된다.
        if ((get().byAssignment[assignmentId]?.length ?? 0) > 0) return;
        // ▼ 영속 붙일 자리 ①: 여기서 GET /api/assignments/:assignmentId/chat 를 받아 turns 를 대체한다.
        set(s => ({ byAssignment: { ...s.byAssignment, [assignmentId]: turns } }));
      },

      append: (assignmentId, turn) => {
        set(s => ({
          byAssignment: {
            ...s.byAssignment,
            [assignmentId]: [...(s.byAssignment[assignmentId] ?? []), turn],
          },
        }));
        // ▼ 영속 붙일 자리 ②: 위 로컬 반영 직후 POST /api/assignments/:assignmentId/chat (fire-and-forget).
        //   지금은 보내지 않는다 — DB 스키마·API 라우트가 이번 작업 범위 밖이라서다.
      },
    }),
    { name: 'pullim-assignment-chat' },
  ),
);

/** 한 과제의 대화(reactive). 없으면 빈 배열. */
export function useAssignmentChatTurns(assignmentId: string): AssignmentChatTurn[] {
  return useAssignmentChatStore(s => s.byAssignment[assignmentId]) ?? EMPTY;
}

/** 셀렉터가 매번 새 배열을 만들지 않도록 고정 빈 배열을 쓴다(무한 리렌더 방지). */
const EMPTY: AssignmentChatTurn[] = [];
