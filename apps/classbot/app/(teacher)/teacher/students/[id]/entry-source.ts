/**
 * 들어온 곳 → 되돌아갈 곳 (spec 11 § 3.3.3).
 *
 * 학생 상세는 관제소 명단과 채점 허브 학생 목록이 **함께** 보내는 곳이다.
 * 되돌아갈 곳을 한쪽으로 고정해 두면 다른 쪽에서 들어온 교사는 엉뚱한 화면으로 튄다 —
 * 채점하러 들어왔는데 뒤로 가기가 관제소로 가면 검수하던 자리를 잃는다.
 *
 * `from` 이 없으면 지금까지처럼 관제소에서 온 것으로 본다(기존 링크가 그대로 동작한다).
 * 이동·기간 링크는 `from` 을 그대로 이어받는다 — 몇 명을 넘겨도 되돌아갈 곳이 유지된다.
 */

export const entrySources = {
  grading: { href: '/teacher/grading', label: '채점 허브' },
  monitor: { href: '/teacher/monitor', label: '학급 관제소' },
} as const;

export type EntrySource = keyof typeof entrySources;

export function isEntrySource(v: string | undefined): v is EntrySource {
  return v === 'grading' || v === 'monitor';
}

/** 모르는 값·빈 값은 관제소로 — 기존 진입 동선이 기본값이다. */
export function resolveEntrySource(v: string | undefined): EntrySource {
  return isEntrySource(v) ? v : 'monitor';
}

export function entryTarget(v: string | undefined): (typeof entrySources)[EntrySource] {
  return entrySources[resolveEntrySource(v)];
}
