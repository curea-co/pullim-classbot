// ============================================================================
// 인증 폼 검증 — BE DTO 규칙과 정렬 (apps/backend validation.constant.ts).
// 비밀번호: 8~64자, 영문·숫자·특수문자 각 1개 이상.
// ============================================================================

/** 비밀번호 최소 길이 (BE MIN_PASSWORD_LENGTH). */
export const MIN_PASSWORD_LENGTH = 8;
/** 비밀번호 최대 길이 (BE MAX_PASSWORD_LENGTH). */
export const MAX_PASSWORD_LENGTH = 64;
/** 비밀번호 패턴 (BE PASSWORD_PATTERN). */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 이메일 형식이 유효한지 검사한다. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** 비밀번호가 BE 규칙을 만족하는지 검사한다. */
export function isValidPassword(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}
