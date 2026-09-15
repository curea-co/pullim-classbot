'use client';

import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api/client-fetch';
import { useUpdateAssignment, type UpdateAssignmentInput } from '@/hooks/api/assignment-dispatch';

/**
 * 낸 과제 고치기·회수의 **한 통로** (`proc/spec/14 § 3.3.5`·`§ 3.3.6`).
 *
 * 왜 화면마다 따로 부르지 않는가: 회수와 수정은 **서버와 로컬 두 곳**을 같이 건드려야 하고,
 * 그 순서와 실패 처리를 두 화면이 각자 적으면 한쪽만 고쳐지는 날이 온다.
 *
 * ## 두 경로를 섞지 않는다
 *
 * 로그인한 교사가 낸 과제는 DB 행으로도 있고(`POST /api/teacher/assignments`), 학생이 보는
 * 술어가 그 행의 `dispatch_status` 를 읽는다. 그래서 **서버를 먼저** 고친다 — 로컬만
 * 뒤집으면 확인 모달이 「학생의 받은 과제에서 사라져요」라고 말해 놓고 학생은 그대로 푼다.
 *
 * 비로그인 데모의 과제는 DB 에 없다. 그 경로에서는 401·404 가 정상이므로 **조용히 넘기고**
 * 로컬 사본만 고친다(내기 화면의 `signedOut` 분기와 같은 결).
 *
 * 그 밖의 실패(권한 · 5xx)는 **삼키지 않는다** — 교사는 회수했다고 믿는데 학생에게는 그대로
 * 남아 있는 상태가 제일 나쁘다. 로컬은 되돌리지 않고(화면이 이미 그렇게 그려졌다) 무엇이
 * 안 됐는지 말한다.
 */
export function useAssignmentWrite(): {
  /** 서버를 먼저 고치고, 서버에 없는 과제면 조용히 넘긴다. @returns 서버까지 닿았으면 true */
  write: (input: UpdateAssignmentInput) => Promise<boolean>;
  isPending: boolean;
} {
  const mutation = useUpdateAssignment();

  async function write(input: UpdateAssignmentInput): Promise<boolean> {
    try {
      await mutation.mutateAsync(input);
      return true;
    } catch (error) {
      // 데모 경로 — 서버에 그 과제가 없다. 오류가 아니다.
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 404)) {
        return false;
      }
      const message = error instanceof ApiClientError ? error.message : '서버에 전하지 못했어요.';
      toast.error('학생 화면에는 아직 반영되지 않았어요', { description: message });
      return false;
    }
  }

  return { write, isPending: mutation.isPending };
}
