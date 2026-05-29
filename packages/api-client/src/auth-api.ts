// ============================================================================
// /api/auth/* 엔드포인트 함수 — classbot BE auth.controller 와 1:1 대응.
// 함수명은 BE UseCase/Controller 메서드와 맞춘다.
// ============================================================================

import { authRequest, publicRequest } from "./auth-fetch";
import type {
  CheckEmailResponse,
  LoginRequest,
  LogoutRequest,
  SignupRequest,
  SignupResponse,
  TokenResponse,
} from "@pullim-classbot/types";

/**
 * 이메일 회원가입. BE `POST /auth/signup`.
 * @param data - 이름/이메일/비밀번호/비밀번호 확인/역할
 * @returns 사용자 id·email·role + 토큰 쌍
 */
export async function signup(data: SignupRequest): Promise<SignupResponse> {
  return publicRequest<SignupResponse>("/auth/signup", {
    method: "POST",
    body: data,
  });
}

/**
 * 이메일 로그인. BE `POST /auth/login`.
 * @param data - 이메일/비밀번호
 * @returns 토큰 쌍
 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  return publicRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: data,
  });
}

/**
 * 로그아웃. BE `POST /auth/logout` (refresh 토큰을 블랙리스트 등록).
 * @param data - 무효화할 refresh 토큰
 */
export async function logout(data: LogoutRequest): Promise<void> {
  return authRequest<void>("/auth/logout", {
    method: "POST",
    body: data,
  });
}

/**
 * 이메일 중복 확인. BE `GET /auth/check-email`.
 * @param email - 확인할 이메일
 * @returns 사용 가능 여부
 */
export async function checkEmail(email: string): Promise<CheckEmailResponse> {
  return publicRequest<CheckEmailResponse>(
    `/auth/check-email?email=${encodeURIComponent(email)}`,
  );
}
