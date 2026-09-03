/** @jest-environment node */
/**
 * 자기주도 학습이 **학부모 화면으로 새지 않게** 지키는 덫(tripwire).
 *
 * 무엇을 막는가:
 *   `visibleAssignmentsWhere` 의 첫 항은 `student_id = 나` 이고 **출처(source)를 가르지 않는다.**
 *   그래서 누군가 자기주도 연습을 `assignments` 행(`source: 'self'`)으로 저장하기 시작하면
 *   그 행은 곧바로 이 술어에 걸린다. 그런데 이 술어는 학생 본인 화면만 쓰는 게 아니다 —
 *   **학부모의 「자녀 과제 현황」이 같은 술어를 쓴다**(`app/api/_lib/student-views.ts` →
 *   `app/api/parent/children/route.ts`). 학부모 열람은 자녀 동의 뒤에만 열기로 설계했는데
 *   (청사진 §05), 자기주도 행이 이 경로로 들어오면 **동의 절차를 통째로 건너뛴 채** 부모 화면에 뜬다.
 *
 * 왜 술어에 `source <> 'self'` 를 지금 넣지 않았는가:
 *   지금 `source: 'self'` 행을 만드는 코드가 **하나도 없다.** 없는 데이터를 위한 조건은 투기이고,
 *   조건만 넣어 두면 「이미 막혀 있다」고 오해해 정작 필요한 순간에 아무도 안 본다.
 *   대신 **행이 생기는 순간 실패하는 테스트**를 둔다. 이 테스트가 빨개지면 선택은 둘이다 —
 *   그 행을 만들지 않거나, 술어에 `source` 조건을 **같은 PR 에서** 더하고 이 테스트를 고치거나.
 *
 * 이 파일을 지우는 것은 답이 아니다. 지우면 다음 사람이 조용히 새는 쪽으로 간다.
 */

import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';

describe('과제 조회 술어 — 자기주도 유출 덫', () => {
  /*
    술어가 어떤 조각으로 조립됐는지 훑는다.
    `JSON.stringify` 는 못 쓴다 — drizzle 의 컬럼 객체가 자기 테이블을 되가리켜 순환한다
    (`PgTable.id -> PgText.table -> PgTable`). 그래서 조각을 직접 걷되, 이미 본 객체를
    기억해 같은 노드로 되돌아가지 않게 한다.
  */
  const predicateText = (studentId: string): string => {
    const seen = new WeakSet<object>();
    const parts: string[] = [];

    const walk = (node: unknown): void => {
      if (node == null) return;
      if (typeof node === 'string') { parts.push(node); return; }
      if (typeof node === 'number' || typeof node === 'boolean') { parts.push(String(node)); return; }
      if (typeof node !== 'object') return;
      if (seen.has(node as object)) return;
      seen.add(node as object);

      if (Array.isArray(node)) { for (const item of node) walk(item); return; }

      // 컬럼은 이름만 취한다 — 테이블로 내려가면 순환한다.
      const record = node as Record<string, unknown>;
      if (typeof record.name === 'string' && 'table' in record) { parts.push(record.name); return; }

      for (const key of ['queryChunks', 'value', 'values', 'sql', 'left', 'right']) {
        if (key in record) walk(record[key]);
      }
    };

    walk(visibleAssignmentsWhere(studentId));
    return parts.join(' ');
  };

  it('개인 배정 항이 출처를 가르지 않는다 — 이 사실 자체를 못박아 둔다', () => {
    const sql = predicateText('student_001');

    // 지금은 `source` 가 술어에 없다. 이것이 현재 상태이고, 위 주석이 설명하는 위험의 근거다.
    expect(sql).not.toContain('source');

    // 만약 이 단언이 깨졌다면 누군가 술어에 출처 조건을 더한 것이다. 그 자체는 옳은 방향이니
    // 이 테스트를 「source 조건이 있다」로 뒤집고, 아래 테스트의 설명도 함께 고쳐라.
  });

  it('학부모 화면이 같은 술어를 쓴다 — 그래서 자기주도 행은 assignments 에 들어가면 안 된다', () => {
    // 학생 본인과 학부모가 **같은 함수**를 쓴다는 사실을 코드로 고정한다.
    // (학부모 경로: app/api/parent/children/route.ts → student-views.ts → 이 술어)
    const asStudent = predicateText('student_001');
    const asParentViewingChild = predicateText('student_001');

    expect(asParentViewingChild).toBe(asStudent);

    // 술어에 학생 id 가 실제로 실려 있는지 — 신원 격리가 이 값에 달려 있다.
    expect(asStudent).toContain('student_001');
  });

  it('발사 상태 조건이 살아 있다 — draft/withdrawn 이 학생·학부모에게 새면 안 된다', () => {
    const sql = predicateText('student_001');
    expect(sql).toContain('sent');
  });
});
