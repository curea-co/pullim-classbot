/**
 * 학부모 — 내 자녀와 자녀의 수업방·과제 (계약 §4 「학부모」).
 *
 * 자녀 목록은 `parent_child_links` 가 권위다. 그 링크에 없는 학생은 어떤 경로로도
 * 조회되지 않는다 — 학부모가 남의 아이 자료를 볼 수 있는 구멍이 여기서 닫힌다.
 *
 * 자녀의 수업방·과제는 학생 본인 화면과 **같은 함수**로 읽는다
 * (`app/api/_lib/student-views.ts`) — 두 화면이 다른 답을 하면 안 된다.
 *
 * 역할 판정은 도메인 `users.role` 을 본다. 공유 JWT 타입에는 아직 `parent` 가 없어서
 * claim 만으로는 학부모를 알아볼 수 없다(`app/api/_lib/guards.ts` 주석 참조).
 */

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments, parentChildLinks, users } from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import {
  listStudentClassrooms,
  listVisibleAssignments,
} from '@/app/api/_lib/student-views';
import type {
  ParentAssignmentItem,
  ParentChildItem,
} from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 과제 행 → 학부모가 볼 칸. **행을 전개하지 않고 칸을 손으로 옮긴다.**
 *
 * `{ ...row }` 를 쓰면 `assignments` 에 컬럼이 하나 늘 때마다 학부모 응답이 **조용히**
 * 넓어진다. 실제로 그 행에는 정답률(`recentAccuracy`) · 풀이 딥링크(`solveHref`) ·
 * 오답 문항 키(`requizQuestionIds`)가 실려 있고, 반 단위 발사 행에는 **다른 아이들의
 * user id**(`targetStudentIds`)까지 실려 있다. 05 § 11.4 는 이 축이 내보낼 것을
 * 「받은 과제 현황 **(답안·점수 제외)**」으로 못박았다 — 무엇을 뺐는지는 계약 타입
 * (`ParentAssignmentItem`) 주석에 칸별로 적어 두었다.
 *
 * @param row - `assignments` 한 행
 * @returns 학부모에게 나가도 되는 칸만 담은 객체
 */
function toParentAssignment(
  row: typeof assignments.$inferSelect,
): ParentAssignmentItem {
  return {
    id: row.id,
    botId: row.botId,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    scope: row.scope,
    mode: row.mode,
    difficulty: row.difficulty,
    questionCount: row.questionCount,
    completedCount: row.completedCount,
    state: row.state,
    assignedBy: row.assignedBy,
    assignedAtLabel: row.assignedAtLabel,
    dueLabel: row.dueLabel,
    dDay: row.dDay,
    // 직렬화 형태를 계약 타입(문자열 시각)에 맞춘다.
    dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
  };
}

/**
 * 내 자녀 목록 + 각 자녀의 수업방·과제.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { children } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'parent') return forbidden('보호자만 볼 수 있어요.');

  const links = await getDb()
    .select({
      id: users.id,
      name: users.name,
      relation: parentChildLinks.relation,
    })
    .from(parentChildLinks)
    .innerJoin(users, eq(parentChildLinks.studentId, users.id))
    .where(eq(parentChildLinks.parentId, actor.id))
    .orderBy(asc(users.name));

  const children: ParentChildItem[] = await Promise.all(
    links.map(async (child) => {
      // 이름을 `assignments` 로 두면 스키마 테이블 import 를 가린다 — 행 목록임을 이름에 적는다.
      const [classrooms, assignmentRows] = await Promise.all([
        listStudentClassrooms(child.id),
        // 학부모가 보는 축은 `class_assignment_summary` 하나다 — 자기주도는 다른 축이라
        // 여기로 딸려 나오면 안 된다(05 § 11.4 의 표). 술어가 출처로 그 경계를 긋는다.
        listVisibleAssignments(child.id, 'class-summary'),
      ]);
      return {
        id: child.id,
        name: child.name,
        relation: child.relation,
        classrooms,
        assignments: assignmentRows.map(toParentAssignment),
      };
    }),
  );

  return NextResponse.json({ children });
}
