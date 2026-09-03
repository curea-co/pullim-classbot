/**
 * 학생 시점 읽기 조각 — 학생 본인(`/api/me/*`)과 학부모(`/api/parent/children`)가 같이 쓴다.
 *
 * 같은 것을 두 번 짜면 두 화면이 서로 다른 답을 하게 된다. 학부모가 보는 자녀의 수업방·과제는
 * 자녀 본인이 보는 것과 **글자 그대로 같은 질의**여야 한다.
 */

import { asc, desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments, classBots, classrooms, enrollments } from '@/lib/db/schema';
import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';
import type { StudentClassroomItem } from '@/app/api/_lib/contract-types';

/**
 * 그 학생이 참여 중인 수업방 목록.
 *
 * 반 이름·소속은 참여 시점 스냅샷(`classroom_label`)이 아니라 `classrooms` 현재 값을 쓴다 —
 * 선생님이 반 이름을 고치면 학생 화면도 따라가야 한다.
 * @param studentId - 학생 도메인 id
 * @returns 참여 시각 오름차순 목록
 */
export async function listStudentClassrooms(
  studentId: string,
): Promise<StudentClassroomItem[]> {
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
    .where(eq(enrollments.studentId, studentId))
    .orderBy(asc(enrollments.assignedAt), asc(classrooms.id));

  return rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString() }));
}

/**
 * 그 학생에게 보여야 할 과제 목록 — 개인 배정 + 반 단위 발사.
 * @param studentId - 학생 도메인 id
 * @returns 과제 행 목록(최신 발사가 위)
 */
export async function listVisibleAssignments(
  studentId: string,
): Promise<(typeof assignments.$inferSelect)[]> {
  return getDb()
    .select()
    .from(assignments)
    .where(visibleAssignmentsWhere(studentId))
    .orderBy(desc(assignments.dispatchedAt), desc(assignments.id));
}
