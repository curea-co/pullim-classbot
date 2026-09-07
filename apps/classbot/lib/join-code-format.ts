/**
 * 참여 코드 표기 규칙 — **서버·클라이언트 공용**. 의존성 없음.
 *
 * 왜 `lib/join-code.ts` 에서 이 둘만 떼어 왔나:
 *   `join-code.ts` 는 코드를 **뽑고 저장하는** 모듈이라 `node:crypto` 와
 *   `@/lib/db/schema`(Drizzle 테이블 정의 전체)를 import 한다. 그 파일을 client
 *   컴포넌트가 표기 함수 하나 때문에 import 하면 **번들에 DB 스키마가 딸려 나간다**
 *   (실측: 교사 수업방 페이지 청크에 `join_codes`·`class_bots`·`interventions`
 *   테이블 정의가 실려 나왔다). 표기 규칙은 순수 문자열 연산이라 갈라 두면 그 유출이 사라진다.
 *
 * 규칙의 주인은 여기다 — `join-code.ts` 도 이 파일을 다시 내보낸다. 사본을 만들지 마라.
 */

/** 코드 길이 — 32^6 ≈ 10.7억 가지. */
export const JOIN_CODE_LENGTH = 6;

/**
 * 입력 코드를 저장 형태로 맞춘다 — 대문자화 + 하이픈/공백 제거.
 *
 * 학생이 `abc-123`·`ABC 123`·`  abc123 ` 중 무엇을 쳐도 같은 `ABC123` 으로 모인다.
 * @param raw - 학생이 입력한 원문
 * @returns 하이픈 없는 대문자 문자열
 */
export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * 코드를 화면에 보여줄 형태로 나눈다 — `ABC123` → `ABC-123`.
 *
 * 저장값은 건드리지 않는다(표시 전용). 6자가 아니면 원문을 대문자로만 돌려준다.
 * @param code - 저장된 코드
 * @returns 가운데 하이픈을 넣은 표시용 문자열
 */
export function formatJoinCode(code: string): string {
  const normalized = normalizeJoinCode(code);
  if (normalized.length !== JOIN_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}
