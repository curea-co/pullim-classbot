import {
  isDepthShort, isOfflineToday, lastSeenRank, shortcutTries,
  type MonitoredStudent, type ReachStatus,
} from '@/lib/mock/classbot-monitoring';
import { scopeExits } from '@/lib/mock/classbot-student-report';

/**
 * 관제소 명단의 거르기·정렬 규칙 — 상단 요약 카드와 아래 명단이 **같은 규칙**을 읽게 한 곳.
 *
 * 카드에 적힌 숫자와 명단에 걸리는 조건이 다른 함수에서 나오면 둘이 어긋난다.
 * 카드는 `filterCards` 로 그리고, 명단은 `matchesFilter` 로 거른다 — 둘 다 여기 있다.
 *
 * 카드에 담는 것은 **학생 수(명)뿐**이다. 지름길·이탈 같은 횟수(회)는 카드에 올리지 않는다 —
 * 학생을 고르는 조건이 아니라 과제·프롬프트 설계 신호라 명단 아래 학급 합계로만 읽는다.
 */

export type RosterFilter = 'all' | ReachStatus | 'depth-short' | 'offline';
export type RosterSort = 'name' | 'shortcut' | 'exit' | 'stale';

/** 카드 톤 — KpiStat 과 같은 값만 쓴다 */
type CardTone = 'default' | 'accent' | 'alert';

export const filterLabels: Record<RosterFilter, string> = {
  all: '전체',
  reached: '도달',
  partial: '부분',
  'not-reached': '미도달',
  'depth-short': '목표 수준 미달',
  offline: '오늘 안 들어옴',
};

/** 상단 요약 카드 = 명단 거르개. 카드 순서가 곧 화면 순서다. */
export const filterCards: { value: RosterFilter; tone: CardTone }[] = [
  { value: 'all', tone: 'default' },
  { value: 'reached', tone: 'accent' },
  { value: 'partial', tone: 'default' },
  { value: 'not-reached', tone: 'alert' },
  { value: 'depth-short', tone: 'alert' },
  { value: 'offline', tone: 'default' },
];

export const sortOptions: { value: RosterSort; label: string }[] = [
  { value: 'name', label: '이름순' },
  { value: 'shortcut', label: '지름길 많은 순' },
  { value: 'exit', label: '이탈 많은 순' },
  { value: 'stale', label: '활동 오래된 순' },
];

export function matchesFilter(s: MonitoredStudent, filter: RosterFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'offline': return isOfflineToday(s);
    case 'depth-short': return isDepthShort(s);
    default: return s.reach === filter;
  }
}

/** 카드에 적을 숫자 — 명단을 거르는 것과 같은 규칙으로 센다 */
export function countByFilter(students: MonitoredStudent[]): Record<RosterFilter, number> {
  const counts = {} as Record<RosterFilter, number>;
  for (const { value } of filterCards) {
    counts[value] = students.filter(s => matchesFilter(s, value)).length;
  }
  return counts;
}

const byName = (a: MonitoredStudent, b: MonitoredStudent) => a.name.localeCompare(b.name, 'ko');

export function sortRoster(students: MonitoredStudent[], sort: RosterSort): MonitoredStudent[] {
  const sorted = [...students];
  switch (sort) {
    case 'shortcut':
      return sorted.sort((a, b) => shortcutTries(b) - shortcutTries(a) || byName(a, b));
    case 'exit':
      return sorted.sort((a, b) => scopeExits(b) - scopeExits(a) || byName(a, b));
    case 'stale':
      return sorted.sort((a, b) => lastSeenRank(b) - lastSeenRank(a) || byName(a, b));
    default:
      return sorted.sort(byName);
  }
}

export function visibleRoster(
  students: MonitoredStudent[],
  filter: RosterFilter,
  sort: RosterSort,
): MonitoredStudent[] {
  return sortRoster(students.filter(s => matchesFilter(s, filter)), sort);
}

/** 요약 카드를 누르면 명단으로 데려간다 — 두 곳이 같은 앵커를 읽게 한다. */
export const ROSTER_ANCHOR = 'monitor-roster';
