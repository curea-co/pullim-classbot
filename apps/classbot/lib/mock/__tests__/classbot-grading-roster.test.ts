import { gradingQueue, overriddenSample } from '@/lib/mock';
import { monitoredRoster } from '../classbot-monitoring';
import {
  allGradingItems, buildGradingRoster, gradingItemsOfStudent, gradingStudentName,
  rosterIdOfGradingStudent, rosterStudentOfGrading, studentHrefOfGrading,
} from '../classbot-grading-roster';

/**
 * 채점 항목과 등록 학생 명단을 잇는 표의 회귀 (spec 11 § 7.1).
 *
 * 여기서 지키는 것 두 가지.
 *   ① 채점 항목이 **하나도 빠짐없이** 학생 명단에 붙는다 — 하나라도 떨어지면
 *      「학생별 대기 건수 합계」와 「큐 전체 건수」가 어긋난다
 *   ② 등록 학생은 **대기가 0건이어도** 목록에서 빠지지 않는다 — 이 화면을 바꾼 이유 그 자체
 */

describe('채점 항목 ↔ 학생 명단 잇기', () => {
  it('채점 항목이 하나도 빠짐없이 학생 명단에 붙는다', () => {
    expect(allGradingItems.length).toBe(gradingQueue.length + 1);
    for (const item of allGradingItems) {
      expect(rosterStudentOfGrading(item)).toBeDefined();
    }
  });

  it('이름으로 확인되는 5명은 명단 이름이 시드 이름으로 끝난다', () => {
    // spec 11 § 7.1 의 표에서 이름이 이어지는 줄. 깨지면 잇기를 다시 봐야 한다.
    const confirmed: [string, string][] = [
      ['s1', '서연'], ['s4', '도현'], ['s6', '주원'], ['s9', '나린'], ['s13', '윤서'],
    ];
    for (const [gradingId, given] of confirmed) {
      const rosterId = rosterIdOfGradingStudent(gradingId);
      const student = monitoredRoster.find(s => s.id === rosterId);
      expect(student?.name.endsWith(given)).toBe(true);
    }
  });

  it('표에 없는 학생은 번호가 나란해도 잇지 않는다', () => {
    // 번호를 일반 규칙으로 쓰면 s3 지우 ↔ m03 박하람 처럼 이름이 이어지지 않는 학생까지
    // 조용히 같은 사람으로 묶인다. 그래서 표에 적힌 7명만 잇는다 (spec 11 § 7.1).
    expect(monitoredRoster.find(s => s.id === 'm03')?.name).toBe('박하람');
    expect(rosterIdOfGradingStudent('s3')).toBeUndefined();
    expect(rosterIdOfGradingStudent('s7')).toBeUndefined();
  });

  it('명단에 없는 번호는 잇지 않는다 — 없는 학생을 만들지 않는다', () => {
    expect(rosterIdOfGradingStudent('s99')).toBeUndefined();
    expect(rosterIdOfGradingStudent('student_001')).toBeUndefined();
  });

  it('화면에 적는 이름은 명단 쪽(성 포함)이다', () => {
    const item = gradingQueue[0]; // gr_001 · s13 윤서
    expect(item.studentName).toBe('윤서');
    expect(gradingStudentName(item)).toBe('신윤서');
    expect(studentHrefOfGrading(item)).toBe('/teacher/students/m13');
  });
});

describe('buildGradingRoster — 등록 학생 전체', () => {
  const rows = buildGradingRoster();

  it('등록 학생 전원이 줄을 갖는다', () => {
    expect(rows).toHaveLength(monitoredRoster.length);
    expect(rows.map(r => r.student.id)).toEqual(monitoredRoster.map(s => s.id));
  });

  it('채점 대기가 0건인 학생도 빠지지 않는다', () => {
    const empty = rows.filter(r => r.items.length === 0);
    // 채점 시드는 7건뿐이라 대부분의 학생은 채점 항목이 없다 — 그래도 줄은 남는다.
    expect(empty.length).toBeGreaterThan(0);
    for (const row of empty) {
      expect(row.pending).toBe(0);
      expect(row.next).toBeUndefined();
    }
  });

  it('학생별 대기 건수의 합 = 큐 전체 대기 건수', () => {
    const perStudent = rows.reduce((n, r) => n + r.pending, 0);
    const total = allGradingItems.filter(i => i.status === 'queue').length;
    expect(perStudent).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('「지금 검수할 한 건」은 대기 중 AI 신뢰도가 가장 낮은 항목이다', () => {
    for (const row of rows) {
      const queued = row.items.filter(i => i.status === 'queue');
      if (queued.length === 0) {
        expect(row.next).toBeUndefined();
        continue;
      }
      const lowest = Math.min(...queued.map(i => i.aiConfidence));
      expect(row.next?.aiConfidence).toBe(lowest);
    }
  });

  it('확정한 채점을 얹으면 그 학생의 대기가 줄어든다', () => {
    const target = allGradingItems.find(i => i.status === 'queue')!;
    const before = buildGradingRoster(allGradingItems)
      .find(r => r.student.id === rosterIdOfGradingStudent(target.studentId))!;
    const after = buildGradingRoster(
      allGradingItems.map(i => (i.id === target.id ? { ...i, status: 'approved' as const } : i)),
    ).find(r => r.student.id === before.student.id)!;

    expect(after.pending).toBe(before.pending - 1);
    expect(after.done).toBe(before.done + 1);
  });
});

describe('gradingItemsOfStudent — 학생 상세가 읽는다', () => {
  it('그 학생 앞으로 온 항목만 돌려준다', () => {
    const items = gradingItemsOfStudent('m09');
    expect(items.map(i => i.id)).toEqual([overriddenSample.id]);
  });

  it('채점 항목이 없는 학생은 빈 배열', () => {
    expect(gradingItemsOfStudent('m20')).toEqual([]);
  });
});
