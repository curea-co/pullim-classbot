import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * spec §3 에러 봉투 — `{ error: { code, message } }` + HTTP status.
 * 도메인 라우트의 모든 에러는 이 헬퍼로 만들어 응답 형태를 통일한다.
 */
export function domainError(
  status: HttpStatus,
  code: string,
  message: string,
): HttpException {
  return new HttpException({ error: { code, message } }, status);
}

/** 404 NOT_FOUND 봉투. */
export const notFound = (message: string): HttpException =>
  domainError(HttpStatus.NOT_FOUND, "NOT_FOUND", message);

/** 403 FORBIDDEN 봉투. */
export const forbidden = (message: string): HttpException =>
  domainError(HttpStatus.FORBIDDEN, "FORBIDDEN", message);

/** 401 UNAUTHORIZED 봉투 — 신원(JWT/x-user-id) 부재. */
export const unauthorized = (message: string): HttpException =>
  domainError(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);

/** 400 VALIDATION 봉투. */
export const validationError = (message: string): HttpException =>
  domainError(HttpStatus.BAD_REQUEST, "VALIDATION", message);

/** 409 CONFLICT 봉투 — 참여 코드 중복 등. */
export const conflict = (message: string): HttpException =>
  domainError(HttpStatus.CONFLICT, "CONFLICT", message);
