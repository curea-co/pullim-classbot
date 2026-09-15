/**
 * 과제 마감 라벨/D-day 계산 — 발사 폼과 재발사(제출 현황 시트)가 공유.
 * (원래 assignment-form 로컬 헬퍼 — 재발사가 신선한 마감을 만들 때 필요해 추출)
 */

export function formatDueLabel(iso: string): string {
  if (!iso) return '내일 22:00';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diffDays <= 0) return `오늘 ${hh}:${mm}`;
  if (diffDays === 1) return `내일 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export function computeDDay(iso: string): string {
  if (!iso) return 'D-1';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return 'D-1';
  return `D-${diffDays}`;
}

/**
 * D-day 라벨을 숫자로 — 「연장인가」를 재려면 두 마감을 견줘야 하는데 과제에 남는 것은
 * 라벨뿐이다(`dueLabel` · `dDay`). 저장된 ISO 가 없어서 라벨을 되읽는다.
 *
 * `'오늘'` = 0, `'D-3'` = 3. 모르는 꼴은 `null` — **0 으로 접지 않는다.**
 * 0 으로 접으면 「오늘 마감」으로 읽혀서, 라벨 규약이 바뀌는 날 연장 검사가 조용히
 * 모든 날짜를 통과시킨다(fail-open). 모르면 호출부가 검사를 건너뛰게 둔다.
 *
 * @param label - `dDay` 문자열
 * @returns 남은 날 수, 또는 읽을 수 없으면 null
 */
export function dDayValue(label: string): number | null {
  const t = label.trim();
  if (t === '오늘') return 0;
  const m = /^D-(\d+)$/.exec(t);
  return m ? Number(m[1]) : null;
}
