import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  matchesStudentFilter, studentViewHref, toStudentFilter, toStudentSort,
  STUDENT_FILTER_DEFAULT, STUDENT_SORT_DEFAULT,
} from '../grading-filters';
import { allGradingItems, buildGradingRoster } from '@/lib/mock/classbot-grading-roster';
import { monitoredRoster } from '@/lib/mock/classbot-monitoring';

const dir = join(__dirname, '..');
const read = (f: string) => readFileSync(join(dir, f), 'utf8');

/**
 * 채점 허브 학생 탭의 거르개 규칙 (spec 11 § 3.3.0 · § 10).
 *
 * 이 파일이 지키는 것은 값 두 가지와 **경계 하나**다.
 * 경계: 이 규칙들은 서버 컴포넌트(`page.tsx`)가 직접 호출한다. 그래서 규칙이 사는 모듈은
 * 클라이언트 모듈이면 안 된다 — 예전에 `grading-student-list.tsx`(`'use client'`) 안에 있어서
 * `/teacher/grading` 이 500 으로 죽었다(`?view=queue` 도 함께).
 * 타입 검사도 빌드도 이걸 못 잡는다. 이 라우트는 dynamic 이라 빌드가 실행해 보지 않기 때문이다.
 */
describe('grading-filters — 서버·클라이언트 경계', () => {
  it('규칙 모듈은 클라이언트 모듈이 아니다 (서버가 직접 부른다)', () => {
    expect(read('grading-filters.ts')).not.toMatch(/^\s*['"]use client['"]/m);
  });

  it('서버 페이지는 클라이언트 모듈이 아니라 규칙 모듈에서 거르개를 읽는다', () => {
    const page = read('page.tsx');
    expect(page).toMatch(/from '\.\/grading-filters'/);
    // 클라이언트 모듈에서는 컴포넌트만 가져온다
    const fromList = page.match(/import \{([^}]*)\} from '\.\/grading-student-list'/);
    expect(fromList).not.toBeNull();
    expect(fromList?.[1]).not.toMatch(/toStudent(Filter|Sort)/);
  });
});

describe('grading-filters — URL 값 읽기', () => {
  it('모르는 값·빈 값은 기본으로 떨어진다', () => {
    expect(toStudentFilter(undefined)).toBe(STUDENT_FILTER_DEFAULT);
    expect(toStudentFilter('없는값')).toBe(STUDENT_FILTER_DEFAULT);
    expect(toStudentSort(undefined)).toBe(STUDENT_SORT_DEFAULT);
    expect(toStudentSort('없는값')).toBe(STUDENT_SORT_DEFAULT);
  });

  it('아는 값은 그대로 통과한다', () => {
    expect(toStudentFilter('pending')).toBe('pending');
    expect(toStudentFilter('not-reached')).toBe('not-reached');
    expect(toStudentFilter('offline')).toBe('offline');
    expect(toStudentSort('name')).toBe('name');
    expect(toStudentSort('stale')).toBe('stale');
  });

  it('기본값은 주소에 적지 않는다', () => {
    expect(studentViewHref(STUDENT_FILTER_DEFAULT, STUDENT_SORT_DEFAULT)).toBe('/teacher/grading');
    expect(studentViewHref('pending', STUDENT_SORT_DEFAULT)).toBe('/teacher/grading?filter=pending');
    expect(studentViewHref(STUDENT_FILTER_DEFAULT, 'name')).toBe('/teacher/grading?sort=name');
  });

  it('주소를 다시 읽으면 같은 값이 나온다 (왕복)', () => {
    const url = new URL(studentViewHref('offline', 'stale'), 'http://x');
    expect(toStudentFilter(url.searchParams.get('filter') ?? undefined)).toBe('offline');
    expect(toStudentSort(url.searchParams.get('sort') ?? undefined)).toBe('stale');
  });
});

describe('grading-filters — 거르개 판정', () => {
  const rows = buildGradingRoster(allGradingItems, monitoredRoster);

  it('전체는 한 줄도 빼지 않는다', () => {
    expect(rows.filter(r => matchesStudentFilter(r, 'all'))).toHaveLength(rows.length);
  });

  it('채점 대기는 대기 건수가 있는 줄만 남긴다', () => {
    const kept = rows.filter(r => matchesStudentFilter(r, 'pending'));
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.every(r => r.pending > 0)).toBe(true);
  });
});
