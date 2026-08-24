/**
 * 채점 허브가 읽는 「등록 학생 × 채점 항목」 — spec 11 § 3.3.0 · § 7.1.
 *
 * **잇는 표가 없다. 필요가 없어졌다.**
 *
 * 예전에는 채점 시드가 `classRoster`(`s1`~`s18`, 중2 수학 A반)를 가리키고 학생 목록·상세는
 * `monitoredRoster`(`m01`~`m20`, 중1-3반 과학)를 읽어서, 둘을 잇는 브리지 표가 필요했다.
 * 그런데 그 둘은 **다른 반·다른 과목의 다른 학생들**이라 어떤 표를 적어도 없는 관계를 지어내는 것이었다
 * (서연 ≠ 김서연). 그래서 표를 만드는 대신 **채점 시드를 `monitoredRoster` 로 옮겼다**
 * (`classbot.ts` 의 `gradingQueue` · `gradingHistory` · `overriddenSample`).
 *
 * 이제 `GradingItem.studentId` 가 곧 학생 명단의 id 다. 이름도 한 벌이고, 채점 항목에서
 * 학생 상세로 건너가도 **같은 학생·같은 수업**이다. 여기 남은 것은 세는 일뿐이다.
 *
 * 새로 만든 지표는 없다. 건수는 전부 이미 있던 `GradingItem.status` 를 센 것이다.
 */

import { gradingQueue, overriddenSample, type GradingItem } from './classbot';
import { monitoredRoster, type MonitoredStudent } from './classbot-monitoring';

/** 채점 허브가 보는 채점 항목 전체 — 큐 시드 6건 + overridden 시연 1건. */
export const allGradingItems: GradingItem[] = [...gradingQueue, overriddenSample];

/**
 * 학생 상세로 가는 링크.
 *
 * `from` 을 달아 학생 상세의 뒤로 가기가 **온 자리로** 돌아오게 한다 (spec 11 § 3.3.3).
 * 학생 목록에서 왔으면 `grading`, 검수하다 건너왔으면 `grading-queue` —
 * 큐를 학생 전체 탭과 뭉뚱그리면 검수하던 자리를 잃는다.
 */
export function studentHrefOfGrading(
  item: GradingItem,
  from: 'grading' | 'grading-queue' = 'grading',
): string {
  return `/teacher/students/${item.studentId}?from=${from}`;
}

/** 학생 한 명이 채점 허브 목록에서 차지하는 한 줄. */
export type GradingRosterRow = {
  student: MonitoredStudent;
  /** 이 학생 앞으로 온 채점 항목 전부 (없으면 빈 배열) */
  items: GradingItem[];
  /** 검수 대기 — 교사가 아직 손대지 않은 건수 */
  pending: number;
  /** 검수 중 */
  reviewing: number;
  /** 교사가 끝낸 건수 (그대로 승인 + 수정 후 승인) */
  done: number;
  /**
   * 지금 검수할 한 건 — 대기 중 AI 신뢰도가 가장 낮은 항목.
   * 큐 정렬(신뢰도 낮은 순)과 같은 기준이라 목록에서 눌러 들어간 자리가 큐에서 볼 자리와 같다.
   */
  next?: GradingItem;
};

/**
 * 등록 학생 전체를 한 줄씩 만든다 — **채점 대기가 0건인 학생도 빠지지 않는다.**
 * 그게 이 화면을 바꾼 이유다.
 *
 * 명단을 **인자로 받는다.** 지금 mock 에 학급이 한 벌뿐이라 한 벌이 보이는 것이고,
 * BE 가 enrollment 를 내려주면 원천만 갈아 끼우면 된다.
 *
 * @param items 채점 항목. 교사 확정(store)을 얹은 뒤 넘긴다 — 확정한 항목은 대기에서 빠져야 한다.
 * @param roster 등록 학생 명단.
 */
export function buildGradingRoster(
  items: GradingItem[] = allGradingItems,
  roster: MonitoredStudent[] = monitoredRoster,
): GradingRosterRow[] {
  return roster.map(student => {
    const mine = items.filter(item => item.studentId === student.id);
    const queued = mine.filter(item => item.status === 'queue');
    return {
      student,
      items: mine,
      pending: queued.length,
      reviewing: mine.filter(item => item.status === 'reviewing').length,
      done: mine.filter(item => item.status === 'approved' || item.status === 'overridden').length,
      next: [...queued].sort((a, b) => a.aiConfidence - b.aiConfidence)[0],
    };
  });
}

/** 한 학생 앞으로 온 채점 항목 — 학생 상세가 읽는다. */
export function gradingItemsOfStudent(
  studentId: string,
  items: GradingItem[] = allGradingItems,
): GradingItem[] {
  return items.filter(item => item.studentId === studentId);
}
