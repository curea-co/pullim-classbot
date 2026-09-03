/**
 * 학생이 볼 수 있는 과제 술어 — 개인 배정 + **반 단위 발사** (계약 §4 「기존 라우트 수정」).
 *
 * 예전에는 `student_id = 나` 한 줄이었다. 교사가 반 전체에 쏜 과제는 학생 1인 행을 만들지
 * 않고 `student_id IS NULL` + `target_student_ids` 로 대상을 표현하므로, 그 조건만으로는
 * 학생 화면에 영영 안 나온다. 술어를 이렇게 넓힌다:
 *
 * ```
 * student_id = 나
 *   OR ( student_id IS NULL
 *        AND dispatch_status = 'sent'
 *        AND ( target_student_ids @> '["나"]'          -- 지정 발사
 *              OR ( target_student_ids = '[]'          -- 반 전체(스키마 주석이 정한 규약)
 *                   AND 내가 그 bot_id 에 참여 중 ) ) )
 * ```
 *
 * `dispatch_status='sent'` 를 반드시 끼운다 — draft/scheduled/withdrawn 행이 학생에게
 * 새어 나가면 안 된다.
 *
 * 참여 여부는 서브쿼리를 **raw SQL 로** 짠다: 쿼리 빌더 객체를 `inArray` 에 넘기면
 * 술어 조립이 DB 핸들에 묶여, 핸들을 mock 으로 대체한 라우트 테스트에서 깨진다.
 */

import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';

import { assignments, enrollments } from '@/lib/db/schema';

/**
 * 해당 학생에게 보여야 할 과제 술어를 만든다.
 * @param studentId - 학생 도메인 id
 * @returns drizzle `where` 에 그대로 넣는 술어
 */
export function visibleAssignmentsWhere(studentId: string): SQL {
  const classWide = and(
    // 빈 배열 = 반 전체 — 내가 그 봇에 참여 중일 때만 보인다.
    sql`${assignments.targetStudentIds} = '[]'::jsonb`,
    sql`${assignments.botId} in (
      select ${enrollments.botId} from ${enrollments}
      where ${enrollments.studentId} = ${studentId}
    )`,
  );

  const dispatched = and(
    isNull(assignments.studentId),
    eq(assignments.dispatchStatus, 'sent'),
    or(
      // 지정 발사 — 대상 목록에 내가 들어 있다.
      sql`${assignments.targetStudentIds} @> ${JSON.stringify([studentId])}::jsonb`,
      classWide,
    ),
  );

  // or(...) 는 인자가 모두 있으면 undefined 를 반환하지 않는다 — 계약상 SQL 로 좁힌다.
  return or(eq(assignments.studentId, studentId), dispatched) as SQL;
}
