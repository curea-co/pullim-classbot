/**
 * 마켓 화면이 함께 쓰는 표기 규칙 — 카드와 상세가 같은 글자를 써야 같은 값으로 읽힌다.
 */

/**
 * 날짜 한 칸. 서버는 ISO timestamptz 를 주는데 화면에 시각까지 필요한 자리가 없다 —
 * 「언제」만 답하면 되므로 날짜에서 끊는다.
 * @param value - ISO 문자열
 * @returns `2026년 9월 2일` 꼴. 값이 없거나 못 읽으면 null(그 줄을 아예 안 그린다).
 */
function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getFullYear()}년 ${at.getMonth() + 1}월 ${at.getDate()}일`;
}

/**
 * 게시일 표기 — 「언제부터 올라와 있나」.
 * @param value - ISO 문자열. 아직 게시 전이면 null 이 온다.
 * @returns `2026년 9월 2일` 꼴, 못 읽으면 null
 */
export function formatPublishedAt(value: string | null | undefined): string | null {
  return formatDay(value);
}

/**
 * 담은 날 표기 — 「언제 담았나」. 게시일과 **같은 눈금**을 쓴다.
 * 마켓 카드에서 「9월 2일에 올림」을 본 학생이 담은 목록에서 「9/2 담음」을 보면
 * 같은 종류의 값인지 한 번 더 읽어야 한다.
 * @param value - `SelfBotRow.addedAt` (ISO 8601)
 * @returns `2026년 9월 3일` 꼴, 못 읽으면 null
 */
export function formatAddedAt(value: string | null | undefined): string | null {
  return formatDay(value);
}
