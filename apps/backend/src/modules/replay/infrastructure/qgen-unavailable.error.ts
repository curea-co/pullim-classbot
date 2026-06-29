/**
 * qgen-ai 엔드포인트가 비가용 상태임을 나타내는 도메인 에러.
 * 비-2xx / 응답 검증 실패 / 타임아웃 / 데모 좌표 미설정 시 throw.
 * 호출부(ReplayService)는 이 에러를 잡아 mock 폴백으로 degrade 한다.
 */
export class QgenUnavailableError extends Error {
  constructor(message = "QGen AI unavailable") {
    super(message);
    this.name = "QgenUnavailableError";
  }
}
