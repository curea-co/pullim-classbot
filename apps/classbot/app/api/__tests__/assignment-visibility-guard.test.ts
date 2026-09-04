/** @jest-environment node */
/**
 * 자기주도 학습이 **학부모 화면으로 새지 않게** 지키는 덫(tripwire).
 *
 * 무엇을 막는가:
 *   `visibleAssignmentsWhere` 의 첫 항은 `student_id = 나` 다. 누군가 자기주도 연습을
 *   `assignments` 행(`source: 'self'`)으로 저장하기 시작하면 그 행은 곧바로 이 술어에 걸린다.
 *   그런데 이 술어는 학생 본인 화면만 쓰는 게 아니다 — **학부모의 「자녀 과제 현황」이 같은
 *   술어를 쓴다**(`app/api/_lib/student-views.ts` → `app/api/parent/children/route.ts`).
 *   [05 § 11.4](../../../../../proc/spec/05-business-rules.md) 는 학부모 열람을 동의 축별로
 *   갈라 두었고(`class_assignment_summary` ↔ `self_study_summary`), 그 둘은 학생이 **따로
 *   켜는** 스위치다. 자기주도 행이 반·과제 경로로 들어오면 **켠 적 없는 축이 딸려 나간다.**
 *
 * 예전에는 이 자리를 「아직 `source='self'` 행을 만드는 코드가 없다」는 전제 + 「술어에
 * source 가 없다」를 못박는 덫으로만 지켰다. 그 덫은 방향이 반대였다 — **행이 생기는 순간이
 * 아니라 고치는 순간에** 빨개져서, 첫 writer PR 은 아무 저항 없이 통과했을 것이다.
 * 그래서 전제를 **축 인자**(`AssignmentReadAxis`)로 바꿔 컴파일이 강제하게 하고,
 * 이 파일은 그 경계가 **실제 SQL 에 남아 있는지**를 본다.
 *
 * 이 파일을 지우는 것은 답이 아니다. 지우면 다음 사람이 조용히 새는 쪽으로 간다.
 */

import { PgDialect } from 'drizzle-orm/pg-core';

import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';

/** 조립된 술어를 실제 Postgres SQL 로 펼친다 — 조각 순회가 아니라 최종 문자열을 본다. */
const render = (
  studentId: string,
  axis: Parameters<typeof visibleAssignmentsWhere>[1],
): { text: string; params: unknown[] } => {
  const query = new PgDialect().sqlToQuery(visibleAssignmentsWhere(studentId, axis));
  return { text: query.sql, params: query.params };
};

const countOf = (text: string, needle: string): number =>
  text.split(needle).length - 1;

describe('과제 조회 술어 — 자기주도 유출 덫', () => {
  it('학생 본인 축은 출처를 가르지 않는다 — 자기 것은 자기주도까지 다 본다', () => {
    const { text, params } = render('student_001', 'student-own');

    expect(text).not.toContain('"assignments"."source"');
    expect(params).not.toContain('teacher-assigned');
    // 신원 격리는 이 값에 달려 있다.
    expect(params).toContain('student_001');
  });

  it('학부모 축은 출처 허용 목록으로 좁힌다 — `self` 는 그 목록에 없다', () => {
    const { text, params } = render('student_001', 'class-summary');

    // 조회 조건 **안에** 있어야 한다(05 § 11.4 규칙 1 — 읽고 나서 거르지 않는다).
    expect(text).toContain('"assignments"."source" in');
    expect(params).toContain('teacher-assigned');
    expect(params).toContain('bot-prescribed');

    // 이 한 줄이 이 파일의 전부다 — 자기주도는 반·과제 축으로 나가지 않는다.
    expect(params).not.toContain('self');
  });

  it('학부모 축은 학생 축을 좁힌 것이다 — 조건을 빼지 않고 더하기만 한다', () => {
    const own = render('student_001', 'student-own');
    const parent = render('student_001', 'class-summary');

    // 학생 축 술어가 통째로 학부모 축 안에 들어 있어야 한다. 둘이 갈라지면
    // 「자녀가 보는 것」과 「부모가 보는 것」이 서로 다른 규칙을 타기 시작한다.
    expect(parent.text).toContain(own.text);
    expect(parent.params.length).toBeGreaterThan(own.params.length);
  });

  it('발사 상태 조건이 두 항 모두에 살아 있다 — 두 축 다', () => {
    for (const axis of ['student-own', 'class-summary'] as const) {
      const { text, params } = render('student_001', axis);
      expect(params).toContain('sent');

      // 개인 배정 항과 반 단위 항 — 게이트가 **양쪽**에 있어야 한다. 한쪽만 걸려 있으면
      // 개인 배정 초안·회수 행이 그대로 뜬다(그 상태가 실제로 쓰이기 시작하는 순간).
      expect(countOf(text, '"assignments"."dispatch_status"')).toBe(2);
    }
  });
});
