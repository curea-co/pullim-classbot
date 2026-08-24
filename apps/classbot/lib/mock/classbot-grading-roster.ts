/**
 * 채점 항목 ↔ 등록 학생 명단을 잇는 표 — spec 11 § 7.1.
 *
 * 채점 허브가 「채점할 게 있는 학생」이 아니라 **등록된 학생 전체**를 보여주려면
 * 채점 항목을 학생 명단에 붙여야 한다. 그런데 두 mock 이 같은 교실을 따로 적어 뒀다.
 *
 *   채점 항목(`GradingItem.studentId`) → `classbot.ts` 의 `classRoster` (`s1`~`s18`, 이름만: 서연)
 *   학생 목록·상세                     → `classbot-monitoring.ts` 의 `monitoredRoster` (`m01`~`m20`, 성까지: 김서연)
 *
 * **잇는 기준은 이름 하나뿐이다.** 번호(`sN` → `m0N`)로는 잇지 않는다.
 * 두 명단 전체로 보면 번호가 같아도 이름이 이어지지 않는 항목이 이미 있고
 * (`s3` 지우 vs `m03` 박하람, `s7` 예은 vs `m07` 조은채), 번호로 이으면 **다른 이름의 학생이
 * 같은 사람으로 묶인다.** 교사가 그 제출물을 검수하면 누구 답을 봤는지 알 수 없게 된다.
 * 채점은 그런 결합을 감당할 수 있는 화면이 아니다 — **틀린 결합보다 비어 있는 결합이 낫다.**
 *
 * 이어지지 않는 항목은 지우지도 억지로 붙이지도 않는다.
 *   - 학생 목록의 어느 줄에도 붙지 않고 **채점 대기 큐에만** 뜬다
 *   - 이름은 **시드 이름 그대로** 적는다 — 한 항목이 화면마다 다른 이름으로 보이는 일은 없다
 *   - 몇 건인지 학생 목록 아래에 적는다(`unlinkedGradingItems`). 세지 않고 감추면
 *     「학생별 대기 합계」와 상단 KPI 「대기」가 말없이 어긋난다
 *
 * 새 채점 시드가 생기면 이름을 확인하고 아래 표에 한 줄을 손으로 더한다.
 * 빠뜨려도 조용히 사라지지 않는다 — `__tests__/classbot-grading-roster.test.ts` 의
 * 「학생별 대기 합계 + 이어지지 않은 대기 = 큐 전체 대기」가 세고 있다.
 *
 * **시드를 고치지 않고 읽을 때 잇는다.** 채점 시드는 채점 상세·이력(`gradingHistory`)·테스트도
 * 같은 id 로 읽기 때문이다. 화면에 뜨는 이름만 명단 쪽(성 포함)으로 통일한다 —
 * 채점 허브에서 `윤서`, 학생 상세에서 `신윤서` 로 갈리면 같은 사람인지 알 수 없다.
 *
 * 여기서 새로 만든 지표는 없다. 건수는 전부 이미 있던 `GradingItem.status` 를 센 것이다.
 */

import { gradingQueue, overriddenSample, type GradingItem } from './classbot';
import { monitoredRoster, type MonitoredStudent } from './classbot-monitoring';

/** 채점 허브가 보는 채점 항목 전체 — 큐 시드 6건 + overridden 시연 1건. */
export const allGradingItems: GradingItem[] = [...gradingQueue, overriddenSample];

/**
 * 채점 시드의 학생 → 등록 학생 명단의 학생. **이름이 이어지는 것만** 적는다.
 *
 * 채점 시드는 이름만(`윤서`), 명단은 성까지(`신윤서`) 적혀 있어 명단 이름이 시드 이름으로
 * 끝나는지로 확인한다. 확인되지 않는 시드(`s2` 민준 · `s5` 하윤)는 **표에 넣지 않는다** —
 * 명단에 그 이름의 학생이 없다.
 */
const gradingStudentLink: Record<string, string> = {
  s1:  'm01', // 서연 → 김서연
  s4:  'm04', // 도현 → 최도현
  s6:  'm06', // 주원 → 강주원
  s9:  'm09', // 나린 → 임나린
  s13: 'm13', // 윤서 → 신윤서
  // s2 민준 · s5 하윤 — 명단에 같은 이름이 없다. 번호로 붙이지 않는다 (spec 11 § 7.1).
};

/** `s13` → `m13`. 표에 없거나 명단에 없는 번호면 undefined — 없는 학생을 만들지 않는다. */
export function rosterIdOfGradingStudent(gradingStudentId: string): string | undefined {
  const rosterId = gradingStudentLink[gradingStudentId];
  return rosterId && monitoredRoster.some(s => s.id === rosterId) ? rosterId : undefined;
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

/**
 * 학생 상세로 가는 링크 — 명단에 없으면 undefined(누를 곳이 없다).
 * `from=grading` 을 달아 학생 상세의 뒤로 가기가 채점 허브로 돌아오게 한다 (spec 11 § 3.3.3).
 */
export function studentHrefOfGrading(item: GradingItem): string | undefined {
  const rosterId = rosterIdOfGradingStudent(item.studentId);
  return rosterId ? `/teacher/students/${rosterId}?from=grading` : undefined;
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

/**
 * 학생 명단에 이어지지 않은 채점 항목 — 학생 목록 어느 줄에도 붙지 않는 것들.
 * 학생 목록 아래에서 몇 건인지 적어 준다. 감추면 상단 KPI 「대기」와 줄 배지 합계가 말없이 어긋난다.
 */
export function unlinkedGradingItems(items: GradingItem[] = allGradingItems): GradingItem[] {
  return items.filter(item => rosterIdOfGradingStudent(item.studentId) === undefined);
}

/** 한 학생 앞으로 온 채점 항목 — 학생 상세가 읽는다. */
export function gradingItemsOfStudent(
  studentId: string,
  items: GradingItem[] = allGradingItems,
): GradingItem[] {
  return items.filter(item => rosterIdOfGradingStudent(item.studentId) === studentId);
}
