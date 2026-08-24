/**
 * 채점 항목 ↔ 등록 학생 명단을 잇는 표 — spec 11 § 7.1.
 *
 * 채점 허브가 「채점할 게 있는 학생」이 아니라 **등록된 학생 전체**를 보여주려면
 * 채점 항목을 학생 명단에 붙여야 한다. 그런데 두 mock 이 같은 교실을 따로 적어 뒀다.
 *
 *   채점 항목(`GradingItem.studentId`) → `classbot.ts` 의 `classRoster` (`s1`~`s18`, 이름만: 서연)
 *   학생 목록·상세                     → `classbot-monitoring.ts` 의 `monitoredRoster` (`m01`~`m20`, 성까지: 김서연)
 *
 * 잇는 규칙은 **번호 그대로**(`sN` ↔ `m0N`)다. 근거 — 채점 시드 7건 중 5건이 번호도 이름도 함께 맞는다:
 *   `s1`=김**서연** · `s4`=최**도현** · `s6`=강**주원** · `s9`=임**나린** · `s13`=신**윤서**.
 * 반례가 없어서 이름이 갈리는 2건(`s2` 민준 · `s5` 하윤)도 같은 규칙으로 잇는다.
 * 규칙이 실제로 다 붙는지는 `__tests__/classbot-grading-roster.test.ts` 가 지킨다.
 *
 * **시드를 고치지 않고 읽을 때 잇는다.** 채점 시드는 채점 상세·이력(`gradingHistory`)·테스트도
 * 같은 id 로 읽기 때문이다. 화면에 뜨는 이름만 학생 명단 쪽(성 포함)으로 통일한다 —
 * 채점 허브에서 `민준`, 학생 상세에서 `이준서` 로 갈리면 같은 사람인지 알 수 없다.
 *
 * 여기서 새로 만든 지표는 없다. 건수는 전부 이미 있던 `GradingItem.status` 를 센 것이다.
 */

import { gradingQueue, overriddenSample, type GradingItem } from './classbot';
import { monitoredRoster, type MonitoredStudent } from './classbot-monitoring';

/** 채점 허브가 보는 채점 항목 전체 — 큐 시드 6건 + overridden 시연 1건. */
export const allGradingItems: GradingItem[] = [...gradingQueue, overriddenSample];

/** `s13` → `m13`. 학생 명단에 그 번호가 없으면 undefined. */
export function rosterIdOfGradingStudent(gradingStudentId: string): string | undefined {
  const matched = /^s(\d{1,2})$/.exec(gradingStudentId);
  if (!matched) return undefined;
  const rosterId = `m${matched[1].padStart(2, '0')}`;
  return monitoredRoster.some(s => s.id === rosterId) ? rosterId : undefined;
}

/** 이 채점 항목이 가리키는 학생 명단의 학생. */
export function rosterStudentOfGrading(item: GradingItem): MonitoredStudent | undefined {
  const rosterId = rosterIdOfGradingStudent(item.studentId);
  return rosterId ? monitoredRoster.find(s => s.id === rosterId) : undefined;
}

/**
 * 화면에 적을 이름 — 학생 명단 쪽(성 포함)을 쓴다.
 * 명단에 없는 항목이면 시드 이름 그대로 둔다(이름을 지어내지 않는다).
 */
export function gradingStudentName(item: GradingItem): string {
  return rosterStudentOfGrading(item)?.name ?? item.studentName;
}

/** 학생 상세로 가는 링크 — 명단에 없으면 undefined(누를 곳이 없다). */
export function studentHrefOfGrading(item: GradingItem): string | undefined {
  const rosterId = rosterIdOfGradingStudent(item.studentId);
  return rosterId ? `/teacher/students/${rosterId}` : undefined;
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
 * @param items 채점 항목. 교사 확정(store)을 얹은 뒤 넘긴다 — 확정한 항목은 대기에서 빠져야 한다.
 * @param roster 등록 학생 명단.
 */
export function buildGradingRoster(
  items: GradingItem[] = allGradingItems,
  roster: MonitoredStudent[] = monitoredRoster,
): GradingRosterRow[] {
  return roster.map(student => {
    const mine = items.filter(item => rosterIdOfGradingStudent(item.studentId) === student.id);
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
  return items.filter(item => rosterIdOfGradingStudent(item.studentId) === studentId);
}
