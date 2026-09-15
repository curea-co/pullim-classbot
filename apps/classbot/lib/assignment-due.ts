/**
 * 과제 마감 라벨/D-day 계산 — 발사 폼과 재발사(제출 현황 시트)가 공유.
 * (원래 assignment-form 로컬 헬퍼 — 재발사가 신선한 마감을 만들 때 필요해 추출)
 */

export function formatDueLabel(iso: string, now: number = Date.now()): string {
  if (!iso) return '내일 22:00';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '내일 22:00';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  /*
    **D-day 와 같은 경계를 쓴다.** 종전에는 여기만 경과 시간으로 세어서, 오늘 22시 마감이
    아침에 「내일 22:00」(라벨)인데 D-day 는 「오늘」로 갈렸다. 라벨과 D-day 는 같은 화면에
    나란히 찍히므로 둘이 다른 날을 말하면 그 자리에서 틀린 것이 보인다.
  */
  const dDay = computeDDay(iso, now);
  if (dDay === '오늘') return `오늘 ${hh}:${mm}`;
  if (dDay === 'D-1') return `내일 ${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/**
 * 마감 시각에서 D-day — **날짜 경계로 자른다. 시·분은 안 본다.**
 *
 * 규칙이 여기 하나뿐이어야 한다. 종전에는 두 벌이었다:
 *   · 클라이언트는 경과 시간(`Math.ceil(diff / 24h)`) — 오늘 22시 마감을 아침에 보면 `D-1`,
 *   · 서버(`POST /api/teacher/assignments`)는 날짜 경계 — 같은 마감을 `'오늘'`.
 * 한 컬럼(`d_day`)에 두 규칙이 앉으니 **같은 과제가 교사 화면과 학생 화면에서 다르게** 읽혔다.
 * 사람이 마감을 세는 방식은 날짜 경계다(「오늘까지」·「내일까지」), 그래서 그쪽으로 모은다.
 *
 * @param iso - 마감 시각. 비었거나 못 읽으면 `'오늘'`(모를 때 더 급한 쪽)
 * @param now - 기준 시각(테스트 주입용)
 */
export function computeDDay(iso: string, now: number = Date.now()): string {
  if (!iso) return '오늘';
  const due = new Date(iso);
  if (!Number.isFinite(due.getTime())) return '오늘';
  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(due) - startOfDay(new Date(now))) / 86_400_000);
  return diffDays <= 0 ? '오늘' : `D-${diffDays}`;
}
