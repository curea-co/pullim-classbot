'use client';

import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api/client-fetch';
import { useUpdateAssignment, type UpdateAssignmentInput } from '@/hooks/api/assignment-dispatch';
import { useTeacherClassrooms } from '@/hooks/api/classroom';

/** 쓰기 결과 — 호출부가 **성공을 알릴지** 가르는 값이다. */
export type WriteOutcome = 'saved' | 'local-only' | 'failed';

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
 * 남아 있는 상태가 제일 나쁘다. 그래서 실패를 **값으로 돌려준다**: 호출부는 그 값을 보고
 * 성공 토스트와 화면 이동을 **건다**. 토스트만 띄우고 호출부가 그대로 성공을 알리면
 * 오류와 성공이 나란히 뜨고 교사는 둘 중 무엇을 믿을지 모른다.
 */
export function useAssignmentWrite(): {
  /**
   * 서버를 먼저 고친다.
   * @returns `'saved'` 서버까지 닿았다 · `'local-only'` 서버에 없는 과제(데모) · `'failed'` 못 고쳤다
   */
  write: (input: UpdateAssignmentInput) => Promise<WriteOutcome>;
  isPending: boolean;
} {
  const mutation = useUpdateAssignment();
  /*
    세션 유무의 **단일 출처**. 내기 화면이 쓰는 것과 같은 신호라, 두 화면이 「지금 데모인가」를
    다르게 답하지 않는다. 이 조회는 이미 다른 교사 화면들이 걸어 두어 캐시에서 온다.
  */
  const classrooms = useTeacherClassrooms();
  const signedOut =
    classrooms.isError &&
    classrooms.error instanceof ApiClientError &&
    classrooms.error.status === 401;
  /*
    조회가 **아직 안 끝났으면 판정이 없다.** 그 사이에 누르면 `signedOut` 이 false 라
    공개 데모의 401 이 「실패」로 읽히고, 서버에 닿을 길이 애초에 없는 세션에서
    「학생 화면에는 아직 반영되지 않았어요」가 뜬다. 그래서 정해질 때까지 버튼을 잠근다.
  */
  const settling = classrooms.isPending;

  async function write(input: UpdateAssignmentInput): Promise<WriteOutcome> {
    try {
      await mutation.mutateAsync(input);
      return 'saved';
    } catch (error) {
      /*
        **데모인지는 「401 이 왔나」로 판정하지 않는다.** 토큰이 만료됐거나 다른 탭에서 로그아웃한
        **진짜 교사**도 401 을 받는다 — 그걸 「데모라 서버에 없는 과제」로 읽으면 로컬만 회수하고
        성공을 알린 뒤, DB 행은 `'sent'` 그대로라 학생은 계속 푼다. 이 파일이 「제일 나쁘다」고
        적은 바로 그 상태다.

        그래서 **들어오기 전에** 정한다 — 교사 수업방 조회가 401 이면 이 브라우저에는 세션이
        없는 것이고(내기 화면의 `signedOut` 과 같은 신호), 그때만 서버를 건너뛴다.
        세션이 있는데 온 401 은 **실패**다.
      */
      if (signedOut) return 'local-only';

      /*
        **404 = 「내 명의로 서버에 없는 과제」.** 데모에서 낸 뒤 같은 브라우저에서 로그인하면
        localStorage 는 살아남는데 그 행들은 DB 에 없다 — `signedOut` 은 이제 false 라
        실패로 떨어뜨리면 그 과제들이 **영영 고칠 수도 회수할 수도 없게** 된다.
        그래서 로컬만 고치되 **조용히 넘기지 않는다** — 학생에게 안 갔다는 사실을 말한다.
        (`createdBy` 가 다른 신원으로 만든 행도 같은 답을 받는다.)
      */
      if (error instanceof ApiClientError && error.status === 404) {
        toast.info('이 브라우저에만 반영했어요', {
          description: '서버에 없는 과제예요 — 학생 화면은 바뀌지 않아요.',
        });
        return 'local-only';
      }
      const message = error instanceof ApiClientError ? error.message : '서버에 전하지 못했어요.';
      toast.error('학생 화면에는 아직 반영되지 않았어요', { description: message });
      return 'failed';
    }
  }

  return { write, isPending: mutation.isPending || settling };
}
