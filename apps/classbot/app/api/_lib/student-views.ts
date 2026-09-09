/**
 * 학생 시점 읽기 조각 — 학생 본인(`/api/me/*`)과 학부모(`/api/parent/children`)가 같이 쓴다.
 *
 * 같은 것을 두 번 짜면 두 화면이 서로 다른 답을 하게 된다. 학부모가 보는 자녀의 수업방·과제는
 * 자녀 본인이 보는 것과 **글자 그대로 같은 질의**여야 한다.
 *
 * 다른 것은 **조건**뿐이다.
 *
 * ① **동의 축** — 학부모가 보는 것은 `class_assignment_summary` 하나라서, 자기주도
 * (`self_study_summary`)로 갈린 것이 이 목록에 섞이면 안 된다(05 § 11.4). 그래서 과제
 * 목록은 축을 인자로 받아 술어에 넘긴다. 수업방 목록은 축을 받지 않는다 —
 * `enrollments ⨝ classrooms` 라서 **반이 없는 자기주도 봇은 구조적으로 이 조인에 들어올 수
 * 없다**(`classrooms` 는 교사 소유 자원이다).
 *
 * ② **동의 자체** — 학부모가 타는 읽기에는 「학생이 이 보호자에게 준 살아 있는 동의」가
 * `where` 에 함께 들어가야 한다. 그래서 두 함수 모두 **덧붙일 술어(`gate`)를 선택 인자로**
 * 받는다. 학생 본인 경로는 아무것도 넘기지 않으므로 질의가 종전 그대로이고, 학부모 경로는
 * `app/api/_lib/parent-views.ts` 가 동의 EXISTS 를 넘긴다.
 *
 * 게이트를 **호출부가 넘기는 조각**으로 둔 이유: 여기에 보호자 사정(부모 id·동의 축)을
 * 박아 넣으면 학생 본인 경로까지 그 개념을 짊어진다. 반대로 학부모용 질의를 통째로 베끼면
 * 고른 칸·조인·정렬이 두 벌이 되어 「내 아이 화면과 부모 화면이 서로 다른 답을 하는」
 * 바로 그 상태가 된다. 조건만 갈라 놓으면 모양은 한 벌로 남는다.
 *
 * ⚠️ `gate` 는 학생 좁히기를 **대체하지 않고 덧붙는다** — 아래 두 함수 모두 `studentId`
 * 조건을 언제나 함께 걸므로, 게이트를 잘못 넘겨도 남의 아이 자료가 열리지는 않는다.
 */

import { and, asc, desc, eq, type SQL } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments, classBots, classrooms, enrollments } from '@/lib/db/schema';
import {
  visibleAssignmentsWhere,
  type AssignmentReadAxis,
} from '@/app/api/_lib/assignment-visibility';
import type { StudentClassroomItem } from '@/app/api/_lib/contract-types';

/**
 * 그 학생이 참여 중인 수업방 목록.
 *
 * 반 이름·소속은 참여 시점 스냅샷(`classroom_label`)이 아니라 `classrooms` 현재 값을 쓴다 —
 * 선생님이 반 이름을 고치면 학생 화면도 따라가야 한다.
 * @param studentId - 학생 도메인 id
 * @param gate - 이 읽기에 **더 붙일** 조건(학부모의 동의 EXISTS). 생략하면 학생 본인 질의 그대로.
 * @returns 참여 시각 오름차순 목록
 */
export async function listStudentClassrooms(
  studentId: string,
  gate?: SQL,
): Promise<StudentClassroomItem[]> {
  const mine = eq(enrollments.studentId, studentId);
  const rows = await getDb()
    .select({
      classroomId: classrooms.id,
      label: classrooms.label,
      organization: classrooms.organization,
      botId: classBots.id,
      botName: classBots.name,
      botAvatarEmoji: classBots.avatarEmoji,
      subject: classBots.subject,
      grade: classBots.grade,
      teacherName: classBots.teacherName,
      joinedAt: enrollments.assignedAt,
      via: enrollments.via,
    })
    .from(enrollments)
    .innerJoin(classBots, eq(enrollments.botId, classBots.id))
    .innerJoin(classrooms, eq(enrollments.classroomId, classrooms.id))
    // 게이트는 학생 좁히기와 **함께** 선다 — 갈아치우지 않는다.
    .where(gate ? and(mine, gate) : mine)
    .orderBy(asc(enrollments.assignedAt), asc(classrooms.id));

  return rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString() }));
}

/**
 * 그 학생에게 보여야 할 과제 목록 — 개인 배정 + 반 단위 발사.
 *
 * 축을 **받아서 넘긴다**(기본값 없음). 학생 본인과 학부모가 같은 질의를 쓰되, 학부모 쪽은
 * `class_assignment_summary` 가 허용한 출처로 좁혀진다 — 자기주도는 다른 동의 축이라
 * 이 목록에 섞이면 안 된다(05 § 11.4).
 *
 * @param studentId - 학생 도메인 id
 * @param axis - 읽는 쪽의 동의 축(`assignment-visibility.ts`)
 * @param gate - 이 읽기에 **더 붙일** 조건(학부모의 동의 EXISTS). 생략하면 축 술어 그대로.
 * @returns 과제 행 목록(최신 발사가 위)
 */
export async function listVisibleAssignments(
  studentId: string,
  axis: AssignmentReadAxis,
  gate?: SQL,
): Promise<(typeof assignments.$inferSelect)[]> {
  // 가시성 술어는 **그대로 재사용**하고 게이트만 덧붙인다 — 학부모용 판본을 따로 짜면
  // 반 단위 발사·발사 상태 같은 규칙이 두 벌이 되어 한쪽만 고쳐지는 날이 온다.
  const visible = visibleAssignmentsWhere(studentId, axis);

  return getDb()
    .select()
    .from(assignments)
    .where(gate ? and(visible, gate) : visible)
    .orderBy(desc(assignments.dispatchedAt), desc(assignments.id));
}
