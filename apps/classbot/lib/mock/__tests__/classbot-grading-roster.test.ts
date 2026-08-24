import { gradingQueue, overriddenSample } from '@/lib/mock';
import { monitoredRoster } from '../classbot-monitoring';
import {
  allGradingItems, buildGradingRoster, gradingItemsOfStudent, gradingStudentName,
  rosterIdOfGradingStudent, rosterStudentOfGrading, studentHrefOfGrading, unlinkedGradingItems,
} from '../classbot-grading-roster';

/**
 * 채점 항목과 등록 학생 명단을 잇는 표의 회귀 (spec 11 § 7.1).
 *
 * 여기서 지키는 것 세 가지.
 *   ① 잇는 기준은 **이름 하나뿐**이다 — 번호가 나란해도 이름이 다르면 잇지 않는다.
 *      번호로 이으면 다른 학생의 제출물이 한 사람 밑에 붙는다
 *   ② 이어지지 않은 항목이 **말없이 사라지지 않는다** —
 *      「학생별 대기 합계 + 이어지지 않은 대기 = 큐 전체 대기」
 *   ③ 등록 학생은 **대기가 0건이어도** 목록에서 빠지지 않는다 — 이 화면을 바꾼 이유 그 자체
 */

describe('채점 항목 ↔ 학생 명단 잇기', () => {
  it('이어진 항목은 명단 이름이 시드 이름으로 끝난다 — 이것이 잇는 유일한 기준이다', () => {
    expect(allGradingItems.length).toBe(gradingQueue.length + 1);
    for (const item of allGradingItems) {
      const student = rosterStudentOfGrading(item);
      if (!student) continue;
      expect(student.name.endsWith(item.studentName)).toBe(true);
    }
  });

  it('이름이 이어지는 5건이 실제로 이어져 있다', () => {
    // spec 11 § 7.1 의 표. 하나라도 끊기면 그 학생 줄에서 대기가 사라진다.
    const linked: [string, string][] = [
      ['s1', 'm01'], ['s4', 'm04'], ['s6', 'm06'], ['s9', 'm09'], ['s13', 'm13'],
    ];
    for (const [gradingId, rosterId] of linked) {
      expect(rosterIdOfGradingStudent(gradingId)).toBe(rosterId);
    }
  });

  it('이름이 다르면 번호가 나란해도 잇지 않는다', () => {
    // 번호로 이으면 s2 민준이 m02 이준서 밑에 붙는다. 교사가 그 답을 검수하면
    // 누구 답을 봤는지 알 수 없다 — 틀린 결합보다 비어 있는 결합이 낫다 (spec 11 § 7.1).
    expect(monitoredRoster.find(s => s.id === 'm02')?.name).toBe('이준서');
    expect(monitoredRoster.find(s => s.id === 'm05')?.name).toBe('정예린');
    expect(rosterIdOfGradingStudent('s2')).toBeUndefined();
    expect(rosterIdOfGradingStudent('s5')).toBeUndefined();
    expect(rosterIdOfGradingStudent('s3')).toBeUndefined();
    expect(rosterIdOfGradingStudent('s7')).toBeUndefined();
  });

  it('이어지지 않은 항목은 시드 이름을 그대로 쓴다 — 화면마다 이름이 갈리지 않는다', () => {
    const unlinked = unlinkedGradingItems();
    expect(unlinked.map(i => i.studentName)).toEqual(['민준', '하윤']);
    for (const item of unlinked) {
      expect(gradingStudentName(item)).toBe(item.studentName);
      expect(studentHrefOfGrading(item)).toBeUndefined();
    }
  });

  it('모르는 id 는 잇지 않는다 — 없는 학생을 만들지 않는다', () => {
    expect(rosterIdOfGradingStudent('s99')).toBeUndefined();
    expect(rosterIdOfGradingStudent('student_001')).toBeUndefined();
  });

  it('화면에 적는 이름은 명단 쪽(성 포함)이다', () => {
    const item = gradingQueue[0]; // gr_001 · s13 윤서
    expect(item.studentName).toBe('윤서');
    expect(gradingStudentName(item)).toBe('신윤서');
    // from=grading 이 붙어야 학생 상세의 뒤로 가기가 채점 허브로 돌아온다.
    expect(studentHrefOfGrading(item)).toBe('/teacher/students/m13?from=grading');
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

  it('학생별 대기 합계 + 이어지지 않은 대기 = 큐 전체 대기', () => {
    // 이어지지 않은 항목이 말없이 사라지면 줄 배지 합계와 상단 KPI 「대기」가 어긋난다.
    // 화면은 그 건수를 목록 아래에 적어 준다 (spec 11 § 7.1).
    const perStudent = rows.reduce((n, r) => n + r.pending, 0);
    const unlinked = unlinkedGradingItems().filter(i => i.status === 'queue').length;
    const total = allGradingItems.filter(i => i.status === 'queue').length;
    expect(perStudent + unlinked).toBe(total);
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
