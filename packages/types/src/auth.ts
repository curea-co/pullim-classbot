// ============================================================================
// 인증 도메인 공유 타입 — classbot apps/backend auth DTO 와 1:1.
// ============================================================================

/**
 * 클래스봇 사용자 역할.
 * BE `entities/enums/user-role.enum.ts` 와 동일한 소문자 value 를 사용한다.
 * (admin 은 운영자 예약값 — FE 회원가입에서는 노출하지 않는다.)
 */
export type UserRole = "student" | "teacher" | "admin";

/** 회원가입에서 사용자가 선택 가능한 역할. */
export type SelectableRole = "student" | "teacher";

// ── 요청 타입 (BE DTO 와 1:1) ──

/** 이메일 로그인 요청. BE `LoginDto`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 이메일 회원가입 요청. BE `SignupDto`. */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  /** 미지정 시 BE 에서 student 로 처리. */
  role?: UserRole;
}

/** 로그아웃 요청. BE `LogoutDto`. */
export interface LogoutRequest {
  refreshToken: string;
}

// ── 응답 타입 (BE DTO 와 1:1) ──

/** 토큰 발급 응답. BE `TokenResponseDto` (login/refresh). */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/** 회원가입 응답. BE `SignupResponseDto`. */
export interface SignupResponse {
  id: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

/** 이메일 중복 확인 응답. BE `CheckEmailResponseDto`. */
export interface CheckEmailResponse {
  /** 미존재(=가입 가능)면 true. */
  available: boolean;
}

/**
 * Access Token 페이로드.
 * BE `passport-token.provider.ts` 가 발급하는 access JWT 의 claim 구조.
 * classbot BE 에는 `/user/me` 가 없으므로 FE 세션 정보는 이 토큰에서 파생한다.
 */
export interface AccessTokenPayload {
  /** 사용자 id (uuid). */
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
  jti: string;
  /** 만료 (epoch seconds). */
  exp?: number;
  /** 발급 (epoch seconds). */
  iat?: number;
}
