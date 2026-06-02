/**
 * 에러 메시지 상수 (중앙 관리, 하드코딩 금지).
 * 키 형식: {DOMAIN}_{설명} (UPPER_SNAKE_CASE), code는 키와 동일.
 * 본체 pullim `error-messages.constant.ts` 패턴 차용.
 */
export const ErrorMessages = {
  // COMMON
  COMMON_BAD_REQUEST: {
    code: "COMMON_BAD_REQUEST",
    message: "잘못된 요청입니다.",
  },
  COMMON_NOT_IMPLEMENTED: {
    code: "COMMON_NOT_IMPLEMENTED",
    message: "아직 구현되지 않은 기능입니다.",
  },

  // AUTH
  AUTH_LOGIN_FAILED: {
    code: "AUTH_LOGIN_FAILED",
    message: "이메일 또는 비밀번호가 올바르지 않습니다.",
  },
  AUTH_ACCOUNT_LOCKED: {
    code: "AUTH_ACCOUNT_LOCKED",
    message: "로그인 시도 횟수를 초과하여 계정이 잠겼습니다.",
  },
  AUTH_UNAUTHORIZED: {
    code: "AUTH_UNAUTHORIZED",
    message: "인증이 필요합니다.",
  },
  AUTH_INVALID_TOKEN: {
    code: "AUTH_INVALID_TOKEN",
    message: "유효하지 않은 토큰입니다.",
  },
  AUTH_TOKEN_BLACKLISTED: {
    code: "AUTH_TOKEN_BLACKLISTED",
    message: "이미 사용되었거나 만료된 토큰입니다.",
  },
  AUTH_PASSWORD_MISMATCH: {
    code: "AUTH_PASSWORD_MISMATCH",
    message: "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
  },
  AUTH_ROLE_NOT_ALLOWED: {
    code: "AUTH_ROLE_NOT_ALLOWED",
    message: "선택할 수 없는 역할입니다.",
  },

  // USER
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다.",
  },
  USER_EMAIL_DUPLICATED: {
    code: "USER_EMAIL_DUPLICATED",
    message: "이미 존재하는 이메일입니다.",
  },
} as const;
