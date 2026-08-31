import { isOfflineToday, reachBadge } from '@/lib/mock/classbot-monitoring';
import type { GradingRosterRow } from '@/lib/mock/classbot-grading-roster';

/**
 * 채점 허브 학생 탭의 거르기·정렬 규칙 — 서버(`page.tsx`)와 클라이언트(`grading-student-list.tsx`)가
 * **같은 규칙을 읽는** 자리.
 *
 * 종전에는 이 함수들이 `grading-student-list.tsx` 안에 있었다. 그 파일은 `'use client'` 라
 * 서버 컴포넌트인 `page.tsx` 가 `toStudentFilter()` 를 호출하면 런타임이 거절했다 —
 * `/teacher/grading` 이 500 으로 죽던 원인이다(`?view=queue` 도 같이).
 * 클라이언트 모듈의 export 는 서버에서 **부를 수 없고** 컴포넌트로 렌더하거나 prop 으로만 넘길 수 있다.
 *
 * 그래서 순수 규칙만 여기로 뺐다. 이 파일에는 `'use client'` 를 붙이지 않는다 —
 * 붙이는 순간 같은 결함이 돌아온다.
 *
 * 관제소(`../monitor/roster-filters`)·리포트 센터(`../reports/report-roster-filters`)가
 * 이미 쓰던 것과 같은 모양이다.
 */

export type StudentFilter = 'all' | 'pending' | 'not-reached' | 'offline';
export type StudentSort = 'pending' | 'name' | 'stale';

/**
 * 거르개·정렬은 **URL 이 1차**다 (spec 11 § 10) — 큐 탭(`?status`·`?type`)과 같은 결.
 * 새로고침·링크 공유·뒤로 가기에서 보던 조건이 유지돼야 한다.
 */
export const STUDENT_FILTER_DEFAULT: StudentFilter = 'all';
export const STUDENT_SORT_DEFAULT: StudentSort = 'pending';

export function toStudentFilter(v: string | undefined): StudentFilter {
  return v === 'pending' || v === 'not-reached' || v === 'offline' ? v : STUDENT_FILTER_DEFAULT;
}

export function toStudentSort(v: string | undefined): StudentSort {
  return v === 'name' || v === 'stale' ? v : STUDENT_SORT_DEFAULT;
}

/** 학생 탭의 URL — 기본값은 적지 않는다(주소가 길어지기만 한다). */
export function studentViewHref(filter: StudentFilter, sort: StudentSort): string {
  const q = new URLSearchParams();
  if (filter !== STUDENT_FILTER_DEFAULT) q.set('filter', filter);
  if (sort !== STUDENT_SORT_DEFAULT) q.set('sort', sort);
  const query = q.toString();
  return query ? `/teacher/grading?${query}` : '/teacher/grading';
}

export const filterLabels: Record<StudentFilter, string> = {
  all: '전체',
  pending: '채점 대기 있음',
  'not-reached': '미도달',
  offline: '오늘 안 들어옴',
};

export const sortOptions = [
  { value: 'pending', label: '채점 대기 많은 순' },
  { value: 'name',    label: '이름순' },
  { value: 'stale',   label: '활동 오래된 순' },
] as const;

/** 알약에 적는 수와 실제로 걸리는 줄이 어긋나지 않도록 **한 함수**로 판정한다. */
export function matchesStudentFilter(row: GradingRosterRow, filter: StudentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return row.pending > 0;
  if (filter === 'offline') return isOfflineToday(row.student);
  return reachBadge(row.student) === 'not-reached';
}
