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
 * @param iso - 마감 시각. 비었거나 못 읽으면 `'D-1'` — **`formatDueLabel` 의 빈 값 폴백
 *   (`'내일 22:00'`)과 같은 날을 말해야 한다.** 둘이 어긋나면 마감을 비운 폼이
 *   「내일 22:00 (오늘)」을 나란히 찍는다(이 PR 이 없애려는 바로 그 어긋남이다).
 * @param now - 기준 시각(테스트 주입용)
 */
export function computeDDay(iso: string, now: number = Date.now()): string {
  const diffDays = computeDDayNumber(iso, now);
  return diffDays <= 0 ? '오늘' : `D-${diffDays}`;
}

/**
 * 마감 시각 → **정수** D-day. 위 `computeDDay` 와 같은 날짜 경계로 자르고, 그쪽이 문자열로 접기 전의 값이다.
 *
 * 정본 `POST /classes/:id/assignments` 가 `dDay` 를 정수로 받아 그대로 저장하므로(다시 세지 않는다 —
 * `DispatchAssignmentBody.dDay`), 보내는 쪽이 이 함수 하나로 센다. 지난 마감은 음수다(폼은 미래만 통과시킨다).
 * @param iso - 마감 시각. 비었거나 못 읽으면 `1` — `computeDDay` 의 `'D-1'` 폴백과 같은 날.
 * @param now - 기준 시각(테스트 주입용)
 */
export function computeDDayNumber(iso: string, now: number = Date.now()): number {
  if (!iso) return 1;
  const due = new Date(iso);
  if (!Number.isFinite(due.getTime())) return 1;
  return Math.round((startOfDay(due) - startOfDay(new Date(now))) / 86_400_000);
}

/** 로컬 날짜 경계 — 이 파일의 D-day 규칙 전부가 이 하나로 자른다. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * 정본 행의 **낼 때 굳힌** `dDay` → **지금 기준** 남은 날수.
 *
 * 정본 `assignments.d_day` 는 교사가 낼 때 센 정수를 그대로 저장하고 다시 세지 않는다(`due_at` 컬럼이 없다).
 * 그대로 그리면 「D-3 으로 낸 과제」가 닷새 뒤에도 D-3 이고 「마감」은 영영 오지 않는다. 낸 시각(`dispatchedAt`)이
 * 함께 오므로, 그날부터 오늘까지 지난 날수를 빼면 지금의 D-day 가 된다 — 위 `computeDDayNumber` 와 같은 날짜 경계로.
 * 음수는 지난 마감이다. `dispatchedAt` 이 없거나 못 읽으면(배포 전·깨진 값) 굳힌 값을 그대로 돌려준다.
 *
 * 화면 넷(교사 목록·상세·운영 화면·학생 목록)이 전부 이 함수를 지난다 — 서버로 보내는 정수는 그대로 `computeDDayNumber` 다.
 * @param dDay - 정본 행의 `dDay`
 * @param dispatchedAt - 정본 행의 `dispatchedAt`(ISO 8601 · 미배포 null)
 * @param now - 기준 시각(테스트 주입용)
 */
export function remainingDDay(dDay: number, dispatchedAt: string | null, now: number = Date.now()): number {
  if (!dispatchedAt) return dDay;
  const t = Date.parse(dispatchedAt);
  if (Number.isNaN(t)) return dDay;
  const elapsed = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(t))) / 86_400_000);
  return dDay - elapsed;
}
