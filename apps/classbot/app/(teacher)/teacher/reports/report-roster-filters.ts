import { attentionReason, pickAttentionStudents } from '@/lib/mock/classbot-teacher-home';
import type { MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import {
  filterLabels, matchesFilter, sortOptions, sortRoster,
  type RosterSort,
} from '../monitor/roster-filters';

/**
 * 리포트 센터 명단의 거르기·정렬 규칙 — **판정은 하나도 새로 만들지 않는다.**
 *
 * 교사가 「미도달」·「목표 수준 미달」이 무슨 뜻인지 화면마다 다시 배우면 안 된다.
 * 그래서 여기서는 이미 있는 두 곳을 **읽기만** 한다.
 *   - 학급 관제소 `../monitor/roster-filters` — 거르개(`matchesFilter`)와 정렬(`sortRoster`)
 *   - 교사 홈 `@/lib/mock/classbot-teacher-home` — 「먼저 볼 학생」 판정(`attentionReason`)과
 *     그 순서(`pickAttentionStudents`)
 *
 * 이 파일이 더하는 것은 **고르는 폭**뿐이다.
 *   - 거르개: 관제소 여섯 중 「짚을 이유」가 되는 셋만 쓰고, 그 셋을 묶은 「먼저 볼 학생」을 하나 더 둔다.
 *     도달·부분은 빼둔다 — 리포트 센터는 잘 가고 있는 학생을 골라 보는 화면이 아니다.
 *   - 정렬: 관제소 넷에 「먼저 볼 순서」를 앞에 붙이고 그것을 기본으로 둔다.
 *
 * 「먼저 볼 학생」은 교사 홈이 쓰는 이름 그대로다. 같은 규칙에 새 이름을 붙이지 않는다.
 */

/** 리포트 센터가 쓰는 거르개. `'attention'` 을 뺀 값은 전부 관제소 거르개 값 그대로다. */
export type ReportRosterFilter = 'all' | 'attention' | 'not-reached' | 'depth-short' | 'offline';

/** 리포트 센터가 쓰는 정렬. `'attention'` 을 뺀 값은 전부 관제소 정렬 값 그대로다. */
export type ReportRosterSort = 'attention' | RosterSort;

export const reportFilterLabels: Record<ReportRosterFilter, string> = {
  all: filterLabels.all,
  attention: '먼저 볼 학생',
  'not-reached': filterLabels['not-reached'],
  'depth-short': filterLabels['depth-short'],
  offline: filterLabels.offline,
};

/** 화면 순서 — 넓은 것에서 좁은 것으로 */
export const reportFilterOrder: ReportRosterFilter[] = [
  'all', 'attention', 'not-reached', 'depth-short', 'offline',
];

/**
 * 거르개가 무슨 뜻인지 **화면이 직접 말한다** ([13 § 3.3.1.1]).
 * 「먼저 볼 학생」이 무엇을 세는 말인지 모르면 숫자를 믿을 수 없다.
 */
export const reportFilterCriteria: Record<ReportRosterFilter, string> = {
  all: '「먼저 볼 학생」은 오늘 안 들어옴 · 미도달 · 목표 수준 미달 셋 중 하나에 걸린 학생이에요. 교사 홈과 같은 기준이에요.',
  attention: '오늘 안 들어옴 · 미도달 · 목표 수준 미달 셋 중 하나에 걸린 학생이에요. 교사 홈 「먼저 볼 학생」과 같은 기준이에요.',
  'not-reached': '과제 대화에서 성취기준까지 못 간 학생이에요.',
  'depth-short': '성취기준엔 닿았지만 과제가 요구한 사고 수준(1~4단계)에 못 미친 학생이에요.',
  offline: '마지막 활동이 오늘 자정보다 앞선 학생이에요 — 오늘 한 번도 안 들어왔어요.',
};

export const reportSortOptions: { value: ReportRosterSort; label: string }[] = [
  { value: 'attention', label: '먼저 볼 순서' },
  ...sortOptions,
];

/** 정렬 기준도 화면이 말한다 — 무엇이 위로 오는지 모르면 순서를 읽을 수 없다. */
export const reportSortCriteria: Record<ReportRosterSort, string> = {
  attention: '오늘 안 들어옴 → 미도달 → 목표 수준 미달 차례예요. 같은 이유면 활동이 오래된 학생이 위로 와요.',
  name: '이름 가나다순이에요.',
  shortcut: '답을 바로 요구하거나 붙여넣은 횟수가 많은 학생이 위로 와요.',
  exit: '봇이 수업 범위 밖 요청을 되돌린 횟수가 많은 학생이 위로 와요.',
  stale: '마지막 활동이 오래된 학생이 위로 와요.',
};

export function matchesReportFilter(s: MonitoredStudent, filter: ReportRosterFilter): boolean {
  // 「먼저 볼 학생」만 교사 홈 판정을 읽고, 나머지는 관제소 거르개에 그대로 넘긴다
  // — `'attention'` 을 걷어내면 남는 값이 전부 관제소 거르개 값이라 형변환이 필요 없다.
  return filter === 'attention'
    ? attentionReason(s) !== null
    : matchesFilter(s, filter);
}

/** 알약에 적을 숫자 — 명단을 거르는 것과 같은 규칙으로 센다 */
export function countByReportFilter(
  students: MonitoredStudent[],
): Record<ReportRosterFilter, number> {
  const counts = {} as Record<ReportRosterFilter, number>;
  for (const value of reportFilterOrder) {
    counts[value] = students.filter(s => matchesReportFilter(s, value)).length;
  }
  return counts;
}

export function sortReportRoster(
  students: MonitoredStudent[],
  sort: ReportRosterSort,
): MonitoredStudent[] {
  if (sort !== 'attention') return sortRoster(students, sort);

  // 교사 홈이 「먼저 볼 학생」을 고르는 순서 그대로 쓴다 — limit 만 풀어 전원을 줄 세운다.
  const rank = new Map(
    pickAttentionStudents(students, students.length).map((a, i) => [a.student.id, i]),
  );
  const last = rank.size; // 아무 데도 안 걸린 학생은 뒤로
  return [...students].sort((a, b) => (
    (rank.get(a.id) ?? last) - (rank.get(b.id) ?? last)
    || a.name.localeCompare(b.name, 'ko')
  ));
}

export function visibleReportRoster(
  students: MonitoredStudent[],
  filter: ReportRosterFilter,
  sort: ReportRosterSort,
): MonitoredStudent[] {
  return sortReportRoster(students.filter(s => matchesReportFilter(s, filter)), sort);
}
