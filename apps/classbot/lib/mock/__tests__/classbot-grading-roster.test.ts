import { gradingQueue, gradingHistory, overriddenSample } from '@/lib/mock';
import { monitoredClass, monitoredRoster } from '../classbot-monitoring';
import {
  allGradingItems, buildGradingRoster, gradingItemsOfStudent, studentHrefOfGrading,
} from '../classbot-grading-roster';

/**
 * 채점 시드가 **학생 명단과 같은 모집단**인지 지키는 회귀 (spec 11 § 7.1).
 *
 * 예전에는 채점 시드가 `classRoster`(중2 수학 A반)를, 학생 목록·상세는 `monitoredRoster`
 * (중1-3반 과학)를 읽어서 두 화면이 **다른 반의 다른 학생**을 보고 있었다. 채점 항목에서
 * 학생을 눌러 들어가면 수학 제출물을 보러 왔는데 과학 대화가 열렸다.
 * 시드를 `monitoredRoster` 로 옮겨 모집단을 하나로 맞췄고, 여기서 그게 유지되는지 본다.
 *
 * 하나라도 어긋나면 학생 줄에서 그 채점이 사라지거나 다른 학생 밑에 붙는다.
 */

describe('채점 시드는 학생 명단과 같은 모집단이다', () => {
  const rosterIds = new Set(monitoredRoster.map(s => s.id));

  it('모든 채점 항목이 학생 명단의 학생을 가리킨다', () => {
    expect(allGradingItems.length).toBe(gradingQueue.length + 1);
    for (const item of allGradingItems) {
      expect(rosterIds.has(item.studentId)).toBe(true);
    }
  });

  it('이름도 명단 이름 그대로다 — 화면마다 이름이 갈리지 않는다', () => {
    for (const item of allGradingItems) {
      const student = monitoredRoster.find(s => s.id === item.studentId);
      expect(item.studentName).toBe(student?.name);
    }
  });

  it('과목·단원도 그 학생들의 수업이다', () => {
    // 학생 상세 헤더가 말하는 수업과 채점 항목의 수업이 같아야 한다.
    for (const item of allGradingItems) {
      expect(item.topic).toContain(monitoredClass.unit);
    }
  });

  it('채점 이력도 같은 학생을 가리킨다', () => {
    // 채점 상세의 「이 학생 최근 채점」이 studentId 로 곧장 찾는다.
    for (const entry of gradingHistory) {
      expect(rosterIds.has(entry.studentId)).toBe(true);
    }
    const withHistory = new Set(gradingHistory.map(h => h.studentId));
    for (const item of gradingQueue) {
      expect(withHistory.has(item.studentId)).toBe(true);
    }
  });

  it('학생 상세로 가는 링크가 그 학생을 가리키고 되돌아갈 곳을 넘긴다', () => {
    const item = gradingQueue[0]; // gr_001 · m13 신윤서
    expect(item.studentName).toBe('신윤서');
    expect(studentHrefOfGrading(item)).toBe('/teacher/students/m13?from=grading');
    // 검수하다 건너간 것이면 학생 전체 탭이 아니라 큐로 돌아간다.
    expect(studentHrefOfGrading(item, 'grading-queue')).toBe('/teacher/students/m13?from=grading-queue');
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

  it('학생별 대기 합계 = 큐 전체 대기 — 어느 항목도 새지 않는다', () => {
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
      .find(r => r.student.id === target.studentId)!;
    const after = buildGradingRoster(
      allGradingItems.map(i => (i.id === target.id ? { ...i, status: 'approved' as const } : i)),
    ).find(r => r.student.id === before.student.id)!;

    expect(after.pending).toBe(before.pending - 1);
    expect(after.done).toBe(before.done + 1);
  });
});

describe('gradingItemsOfStudent — 학생 상세가 읽는다', () => {
  it('그 학생 앞으로 온 항목만 돌려준다', () => {
    expect(gradingItemsOfStudent('m09').map(i => i.id)).toEqual([overriddenSample.id]);
  });

  it('채점 항목이 없는 학생은 빈 배열', () => {
    expect(gradingItemsOfStudent('m20')).toEqual([]);
  });
});
