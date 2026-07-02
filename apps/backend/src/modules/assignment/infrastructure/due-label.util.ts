/**
 * 과제 마감 라벨/D-day 계산 — FE `apps/classbot/lib/assignment-due.ts` 의
 * 서버 포트. assignments 테이블은 due 시각을 라벨(due_label/d_day)로만 저장
 * 하므로(스키마 §2 #17), 발사 시점에 dueIso 를 라벨로 변환해 넣는다.
 *
 * FE 는 브라우저 로컬(KST)로 포맷하지만 서버 TZ 는 보장이 없으므로 **KST 로
 * 고정**해 계산한다. datetime-local 유래의 TZ 없는 dueIso("2026-07-04T22:00")
 * 도 KST 로 해석한다(+09:00 부여).
 */

/** KST(UTC+9) 고정 오프셋 — 한국은 DST 없음. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** TZ 정보(Z 또는 ±hh:mm)가 없는 ISO 문자열에 KST 오프셋을 부여해 파싱한다. */
export function parseDueIsoAsKst(iso: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasZone ? iso : `${iso}+09:00`);
}

/** KST 벽시계 부품(월/일/시/분)으로 변환한다. */
function kstParts(date: Date): {
  month: number;
  day: number;
  hh: string;
  mm: string;
} {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hh: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
  };
}

/** FE formatDueLabel 과 동일한 일수 차 — 라벨 분기의 공통 입력. */
function diffDays(due: Date, now: Date): number {
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

/** "오늘 22:00" / "내일 22:00" / "7/4 22:00" — FE formatDueLabel 포트. */
export function formatDueLabel(due: Date, now: Date = new Date()): string {
  const days = diffDays(due, now);
  const { month, day, hh, mm } = kstParts(due);
  if (days <= 0) return `오늘 ${hh}:${mm}`;
  if (days === 1) return `내일 ${hh}:${mm}`;
  return `${month}/${day} ${hh}:${mm}`;
}

/** "오늘" / "D-1" / "D-n" — FE computeDDay 포트. */
export function computeDDay(due: Date, now: Date = new Date()): string {
  const days = diffDays(due, now);
  if (days <= 0) return "오늘";
  if (days === 1) return "D-1";
  return `D-${days}`;
}
