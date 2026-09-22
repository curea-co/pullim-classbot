/**
 * 정본 과제 행의 숫자·시각 → 화면 라벨. 학생 목록·교사 목록·운영 화면이 **같은 글자**를 찍게 한 자리.
 *
 * `'use client'` 를 붙이지 않는다 — 순수 함수라 서버 컴포넌트에서도 부를 수 있어야 하고, 종전에는
 * `app/(student)/classbot/assignment/use-assignment-reads.ts`(클라이언트 훅 파일) 안에 있어 교사 쪽이
 * 그 파일을 import 해야 했다. 그 파일은 지금도 이 둘을 다시 내보낸다(호출부 경로 유지).
 */

/**
 * 정수 D-day → 화면 라벨. `lib/tokens/assignment-state.ts` 의 `parseDDay` 가 읽는 네 형태
 * (`오늘`·`내일`·`D-n`·`지난 n일`)만 만든다 — 다른 모양을 내면 그쪽이 999 로 읽어 「진행 중」으로 뭉갠다.
 * @param dDay - 서버 정수(음수 = 마감 지남)
 * @returns 라벨
 */
export function dDayLabel(dDay: number): string {
  if (dDay === 0) return '오늘';
  if (dDay === 1) return '내일';
  if (dDay > 1) return `D-${dDay}`;
  return `지난 ${-dDay}일`;
}

/**
 * ISO 8601 → 「YYYY-MM-DD HH:mm」(브라우저 시간대). 목록 카드가 그대로 찍는 문자열이라
 * mock `Assignment.assignedAt` 과 같은 모양을 낸다. 배포 전(null)·깨진 값은 빈 문자열.
 * @param iso - `dispatchedAt`
 * @returns 표시 문자열
 */
export function dispatchedAtLabel(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * ISO 8601 → 「M/D HH:mm」 — 제출 시각처럼 같은 화면에 여러 줄 찍히는 자리용. 깨진 값은 빈 문자열.
 * @param iso - 제출·채점 시각
 * @returns 표시 문자열
 */
export function shortTimeLabel(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
