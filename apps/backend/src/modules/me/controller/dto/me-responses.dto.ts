/**
 * `POST /api/me/sync` 응답형 — 프로비저닝된 도메인 사용자 (M1 spec §2.1).
 * 신규 201 / 기존(name 갱신) 200 모두 같은 형태를 반환한다.
 *
 * `role` 은 **DB 에 저장된 값**이다 — 재호출 body 의 role 변경 시도는
 * 무시되므로(역할 승격 방지) 요청 role 과 다를 수 있다. 기존 행의 role 은
 * DB enum 상 parent 일 수도 있어 상위집합으로 노출한다.
 */
export interface MeSyncResponseDto {
  /** OS SSO sub(uuid) = 도메인 사용자 id. */
  id: string;
  name: string;
  role: "student" | "teacher" | "parent";
}
