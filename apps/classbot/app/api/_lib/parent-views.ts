/**
 * 학부모 시점 읽기 조각 — `GET /api/parent/children` 이 쓴다.
 *
 * 이 파일이 지는 책임은 둘이다.
 *
 * ① **무엇을 읽어도 되는가** — 반·과제는 학생의 살아 있는 동의 뒤에 있다. 그래서 학부모용
 * 읽기 함수를 여기 따로 두고, 동의 EXISTS 를 **질의의 `where` 안**에 넣어 부른다
 * (05 § 11.4 규칙 1). 라우트가 `student-views.ts` 를 직접 부르지 않고 여기를 거치게 한 것도
 * 그래서다 — 게이트를 빠뜨리려면 이 파일을 지나쳐야 하고, 그건 눈에 띈다.
 *
 * ② **어떤 칸이 나가도 되는가** — 아래 매퍼가 `assignments` 행에서 학부모 몫만 손으로 옮긴다.
 * 이건 단순 변환이 아니라 **인가 판단**이라, 지워 두면 다음 사람이 가장 쉬운 길(`{ ...row }`)
 * 로 되돌아간다. 판단은 테스트와 함께 산다(`app/api/__tests__/parent-views.test.ts`).
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 App Router 의 라우트 세그먼트에서 제외된다(private folder).
 */

import type { SQL } from 'drizzle-orm';

import type { assignments } from '@/lib/db/schema';
import {
  CLASS_ASSIGNMENT_CONSENT,
  livingConsentExists,
} from '@/app/api/_lib/consent';
import {
  listStudentClassrooms,
  listVisibleAssignments,
} from '@/app/api/_lib/student-views';
import type {
  ParentAssignmentItem,
  StudentClassroomItem,
} from '@/app/api/_lib/contract-types';

/**
 * 학부모의 「반·과제 현황」 축이 서는 동의 술어 — 아래 두 읽기가 **똑같은 것**을 쓴다.
 *
 * 축을 여기 한 번만 적어 두면, 나중에 「자기주도 요약」 축의 읽기가 생겨도 그쪽은 자기
 * 술어를 갖게 된다. 두 축이 한 함수를 나눠 쓰면 스위치 하나로 둘 다 열리는 사고가 난다.
 * @param parentId - 읽는 보호자 id
 * @param studentId - 자녀(학생) id
 * @returns 질의 `where` 에 그대로 얹는 EXISTS 술어
 */
function classSummaryGate(parentId: string, studentId: string): SQL {
  return livingConsentExists(parentId, studentId, CLASS_ASSIGNMENT_CONSENT);
}

/**
 * 동의를 준 자녀의 **수업방** 목록 — 동의가 없으면 0행.
 *
 * 동의를 미리 조회해 두고 그 결과로 이 질의를 부를지 말지 고르는 방식이 아니다. 두 걸음으로
 * 나누면 그 사이에 학생이 공유를 거뒀을 때 이미 통과한 판정이 질의를 열어 준다. 여기서는
 * 동의와 자료를 **한 질의에서 함께** 본다(`consent.ts` 의 `livingConsentExists` 주석).
 *
 * 고르는 칸·조인·정렬은 학생 본인 화면과 **한 벌을 나눠 쓴다**(`student-views.ts`) —
 * 부모 화면만 뒤처지는 일이 없게.
 * @param parentId - 읽는 보호자 id
 * @param studentId - 자녀(학생) id
 * @returns 참여 시각 오름차순 목록(미동의면 빈 배열)
 */
export async function listConsentedChildClassrooms(
  parentId: string,
  studentId: string,
): Promise<StudentClassroomItem[]> {
  return listStudentClassrooms(studentId, classSummaryGate(parentId, studentId));
}

/**
 * 동의를 준 자녀의 **과제** 행 — 동의가 없으면 0행.
 *
 * 축은 `class-summary` 로 못박는다. 자기주도(`self`)로 담은 봇의 과제는 학생이 따로 켜는
 * 다른 스위치라 이 목록에 섞이면 안 된다(`assignment-visibility.ts`).
 *
 * 돌려주는 것은 **행 그대로**다 — 학부모에게 나갈 칸으로 줄이는 일은 `toParentAssignment`
 * 가 한다. 두 관문(무엇을 읽는가 · 무엇을 내보내는가)을 한 함수에 합치지 않는다.
 * @param parentId - 읽는 보호자 id
 * @param studentId - 자녀(학생) id
 * @returns 과제 행 목록(미동의면 빈 배열)
 */
export async function listConsentedChildAssignments(
  parentId: string,
  studentId: string,
): Promise<(typeof assignments.$inferSelect)[]> {
  return listVisibleAssignments(
    studentId,
    'class-summary',
    classSummaryGate(parentId, studentId),
  );
}

/**
 * 과제 행 → 학부모가 볼 칸. **행을 전개하지 않고 칸을 손으로 옮긴다.**
 *
 * `{ ...row }` 를 쓰면 `assignments` 에 컬럼이 하나 늘 때마다 학부모 응답이 **조용히**
 * 넓어진다. 실제로 그 행에는 정답률(`recentAccuracy`) · 풀이 딥링크(`solveHref`) ·
 * 오답 문항 키(`requizQuestionIds`)가 실려 있고, 반 단위 발사 행에는 **다른 아이들의
 * user id**(`targetStudentIds`)까지 실려 있다. 05 § 11.4 는 이 축이 내보낼 것을
 * 「받은 과제 현황 **(답안·점수 제외)**」으로 못박았다 — 무엇을 왜 뺐는지는 계약 타입
 * (`ParentAssignmentItem`) 주석에 칸별로 적어 두었다.
 *
 * @param row - `assignments` 한 행
 * @returns 학부모에게 나가도 되는 칸만 담은 객체
 */
export function toParentAssignment(
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
