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
