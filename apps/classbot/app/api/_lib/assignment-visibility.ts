/**
 * 학생이 볼 수 있는 과제 술어 — 개인 배정 + **반 단위 발사** (계약 §4 「기존 라우트 수정」).
 *
 * 예전에는 `student_id = 나` 한 줄이었다. 교사가 반 전체에 쏜 과제는 학생 1인 행을 만들지
 * 않고 `student_id IS NULL` + `target_student_ids` 로 대상을 표현하므로, 그 조건만으로는
 * 학생 화면에 영영 안 나온다. 술어를 이렇게 넓힌다:
 *
 * ```
 * ( student_id = 나 AND dispatch_status = 'sent' )
 *   OR ( student_id IS NULL
 *        AND dispatch_status = 'sent'
 *        AND ( target_student_ids @> '["나"]'          -- 지정 발사
 *              OR ( target_student_ids = '[]'          -- 반 전체(스키마 주석이 정한 규약)
 *                   AND 내가 그 bot_id 에 참여 중 ) ) )
 * ```
 *
 * `dispatch_status='sent'` 를 **두 항 모두에** 끼운다 — draft/scheduled/withdrawn 행이
 * 학생에게 새어 나가면 안 된다. 개인 배정 항에 빠져 있던 것을 채웠다: 지금은 개인 배정 행을
 * 만드는 코드가 발사 즉시 'sent' 로만 쓰지만, 그 상태 컬럼의 값이 넷인 이유는 언젠가
 * draft/withdrawn 행이 생기기 때문이고 그때 이 항이 그대로면 초안이 학생·학부모에게 뜬다.
 * (컬럼 기본값이 'sent' 라 기존 행의 가시성은 그대로다.)
 *
 * ## 읽는 축이 둘이다 — 이 술어는 학생 본인만 쓰는 게 아니다
 *
 * **학부모의 「자녀 반·과제 현황」이 같은 술어를 탄다**(`student-views.ts` →
 * `app/api/parent/children/route.ts`). 그런데 [05 § 11.4](../../../../../proc/spec/05-business-rules.md)
 * 는 학부모 열람을 **동의 축별로** 갈라 두었다 — `class_assignment_summary`(참여한 반 ·
 * 받은 과제 현황)와 `self_study_summary`(스스로 담은 봇 · 공부한 날 · 연속일수)는 학생이
 * **따로 켜는** 스위치다. 그래서 학부모가 타는 읽기는 그 경계를 **술어 안에서** 지켜야 한다.
 *
 * 종전에는 이 자리를 「아직 `source='self'` 행을 만드는 코드가 없다」는 전제와 덫 테스트로만
 * 지켰다. 그 전제는 **첫 writer PR 하나로 무너진다** — 자기주도 행이 `assignments` 에
 * 들어오는 순간 `student_id = 나` 항에 그대로 걸려, 반·과제 동의만 켠 학부모에게 자기주도가
 * 딸려 나간다. 그래서 전제를 **축 인자**로 바꿔 컴파일이 강제하게 한다: 호출부는 자기가 어느
 * 축을 읽는지 **반드시** 적어야 하고, 학부모 축에는 출처 허용 목록이 붙는다.
 *
 * 참여 여부는 서브쿼리를 **raw SQL 로** 짠다: 쿼리 빌더 객체를 `inArray` 에 넘기면
 * 술어 조립이 DB 핸들에 묶여, 핸들을 mock 으로 대체한 라우트 테스트에서 깨진다.
 */

import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { assignments, enrollments } from '@/lib/db/schema';

/**
 * 이 읽기가 어느 동의 축인가 — 05 § 11.4 의 표가 가른 그 축이다.
 *
 * - `'student-own'` — 학생 본인 화면(`/api/assignments`). 자기 것은 출처를 가르지 않고 다 본다.
 * - `'class-summary'` — 학부모의 `class_assignment_summary` 축. **반·과제만** 나간다.
 *
 * 인자를 선택이 아니라 **필수**로 둔 이유: 기본값을 주면 새 호출부가 아무것도 안 적고
 * 넓은 쪽으로 붙는다. 축을 안 적으면 컴파일이 안 되게 해서, 다음 사람이 「이 읽기를 부모가
 * 보나」를 **반드시 한 번 생각하게** 만든다.
 */
export type AssignmentReadAxis = 'student-own' | 'class-summary';

/** 스키마 enum 에서 그대로 끌어온 출처 값 — 아래 표가 이 union 을 따라간다. */
type AssignmentSourceValue = (typeof assignments.$inferSelect)['source'];

/**
 * 출처마다 **학부모의 반·과제 축으로 나가는가**를 한 칸씩 적는다.
 *
 * `Record<union, boolean>` 이라서 스키마 enum 에 값이 하나 늘면 **여기서 컴파일이 깨진다** —
 * 새 출처를 어느 축에 넣을지 정하지 않고는 지나갈 수 없다. 「막을 것을 세는」 부정 목록이
 * 아니라 「내보낼 것을 세는」 허용 목록이라, 판단을 빠뜨렸을 때 기본값이 **닫히는 쪽**이다.
 */
const CLASS_AXIS_BY_SOURCE: Record<AssignmentSourceValue, boolean> = {
  // 교사가 낸 과제 — 「받은 과제 현황」 그 자체.
  'teacher-assigned': true,
  // 수업방 봇이 덧붙인 연습 — 학생 화면에도 「받은 과제」로 서고, 반 활동에서 나온다.
  'bot-prescribed': true,
  // 자기주도 — 반·과제가 아니라 `self_study_summary` 축의 것이고, 그 축이 부모에게 주는 건
  // 「스스로 담은 봇 · 공부한 날 · 연속일수」지 과제 행이 아니다. 두 축은 따로 켠다.
  self: false,
};

/** 학부모의 `class_assignment_summary` 로 나갈 수 있는 출처. */
const CLASS_AXIS_SOURCES = (
  Object.keys(CLASS_AXIS_BY_SOURCE) as AssignmentSourceValue[]
).filter((value) => CLASS_AXIS_BY_SOURCE[value]);

/**
 * 해당 학생에게 보여야 할 과제 술어를 만든다.
 * @param studentId - 학생 도메인 id
 * @param axis - 읽는 쪽의 동의 축(위 타입 주석 참조) — 생략할 수 없다
 * @returns drizzle `where` 에 그대로 넣는 술어
 */
export function visibleAssignmentsWhere(
  studentId: string,
  axis: AssignmentReadAxis,
): SQL {
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

  // 개인 배정 — 나에게 직접 꽂힌 행. 발사 상태 게이트는 반 단위 항과 같다.
  const personal = and(
    eq(assignments.studentId, studentId),
    eq(assignments.dispatchStatus, 'sent'),
  );

  // or(...) 는 인자가 모두 있으면 undefined 를 반환하지 않는다 — 계약상 SQL 로 좁힌다.
  const mine = or(personal, dispatched) as SQL;

  if (axis === 'student-own') return mine;

  // 학부모 축 — 출처 허용 목록을 **조회 조건 안에** 얹는다(05 § 11.4 규칙 1: 읽고 나서
  // 거르지 않는다). 목록이 비면 `inArray` 가 거짓이 되어 아무것도 안 나간다 — 닫히는 쪽이다.
  return and(mine, inArray(assignments.source, CLASS_AXIS_SOURCES)) as SQL;
}
