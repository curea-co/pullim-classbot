/**
 * 로컬 날짜 키 — 진도·세션목표 스토어의 "오늘" 스코프 키 구성에 쓰인다.
 *
 * 진도/세션목표는 "오늘의 한 가지"·"오늘 목표" 성격이라 매일 자연스럽게 초기화돼야 한다.
 * 키에 이 값을 끼워 넣으면 날이 바뀌면 새 키로 떨어져 fresh 상태로 보이고,
 * 같은 날 새로고침은 같은 키라 진척이 유지된다(UTC 아닌 **로컬** 자정 기준).
 *
 * @returns 로컬 `YYYY-MM-DD` (zero-padded)
 */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
