/**
 * 들어온 곳 → 되돌아갈 곳 (spec 11 § 3.3.3).
 *
 * 학생 상세는 여러 화면이 **함께** 보내는 곳이다 — 관제소 명단 · 교사 홈 「먼저 볼 학생」 ·
 * 채점 허브 학생 목록 · 채점 상세의 「대화 기록」.
 * 되돌아갈 곳을 한쪽으로 고정해 두면 다른 쪽에서 들어온 교사는 엉뚱한 화면으로 튄다 —
 * 채점하러 들어왔는데 뒤로 가기가 관제소로 가면 검수하던 자리를 잃는다.
 *
 * **규칙 R2** — 모르는 값·빈 값은 `monitor` 로 떨어진다. 없는 화면으로 보내지 않기 위한 것이고,
 * 아직 `from` 을 안 붙이는 링크(리포트 명단)의 동작도 이 기본값이 정의한다.
 * 이동·기간 링크는 `from` 을 그대로 이어받는다 — 몇 명을 넘겨도 되돌아갈 곳이 유지된다.
 */

export const entrySources = {
  grading:        { href: '/teacher/grading',            label: '채점 허브' },
  // 리포트 명단(`/teacher/reports`)도 학생 상세로 링크한다. 그 화면은 v1 후보라 이 변경이
  // 건드리지 않으므로 지금은 `from` 을 안 붙여 R2 대로 관제소로 떨어진다.
  // 값을 미리 정의해 둬서, 리포트 쪽이 `?from=reports` 를 붙이는 날 이 파일을 안 고쳐도 되게 한다.
  reports:        { href: '/teacher/reports',            label: '리포트' },
  // 채점 상세에서 「대화 기록」으로 건너온 교사는 **검수하던 큐로** 돌아가야 한다.
  // 「채점 허브」 하나로 뭉뚱그리면 가장 빈번한 검수 흐름이 학생 전체 탭으로 샌다.
  'grading-queue': { href: '/teacher/grading?view=queue', label: '채점 대기 큐' },
  home:           { href: '/teacher',                    label: '교사 홈' },
  monitor:        { href: '/teacher/monitor',            label: '학급 관제소' },
} as const;

export type EntrySource = keyof typeof entrySources;

export function isEntrySource(v: string | undefined): v is EntrySource {
  return v !== undefined && Object.hasOwn(entrySources, v);
}

/** 모르는 값·빈 값은 관제소로 — 기존 진입 동선이 기본값이다. */
export function resolveEntrySource(v: string | undefined): EntrySource {
  return isEntrySource(v) ? v : 'monitor';
}

export function entryTarget(v: string | undefined): (typeof entrySources)[EntrySource] {
  return entrySources[resolveEntrySource(v)];
}
