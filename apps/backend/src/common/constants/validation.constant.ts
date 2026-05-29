/** 비밀번호 최소 길이. */
export const MIN_PASSWORD_LENGTH = 8;

/** 비밀번호 최대 길이. */
export const MAX_PASSWORD_LENGTH = 64;

/** 비밀번호 패턴: 영문/숫자/특수문자 각 1개 이상. */
export const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
