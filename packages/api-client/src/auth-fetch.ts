// ============================================================================
// fetch 래퍼 — 토큰 첨부 + 401 자동 리프레시 (본체 pullim auth-fetch 패턴).
//
// classbot BE 계약 반영:
//  - 응답 envelope 없음 → 성공 본문(JSON)을 그대로 반환.
//  - 에러 본문은 NestJS 기본형 { statusCode, message, error } → ApiError 로 변환.
//  - refresh 는 POST /auth/refresh + Authorization: Bearer {refreshToken}
//    (BE JwtRefreshGuard 가 Bearer 에서 refresh 토큰을 추출).
// ============================================================================

import { ApiError, BASE_URL } from "./index";
import { tokenManager } from "./token-manager";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: HeadersInit;
}

/** NestJS 기본 에러 응답 형태. */
interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  /** classbot ErrorMessages 의 code 가 있으면 사용. */
  code?: string;
}

// 동시 다발 401 시 리프레시 1회만 수행 (단일 비행 패턴).
let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      tokenManager.clearTokens();
      throw new ApiError("No refresh token", 401);
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!res.ok) {
      tokenManager.clearTokens();
      throw new ApiError("Token refresh failed", 401);
    }

    const tokens = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doFetch(endpoint: string, options: RequestOptions, withAuth: boolean): Promise<Response> {
  const { method = "GET", body, headers } = options;
  const accessToken = withAuth ? tokenManager.getAccessToken() : null;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  return fetch(`${BASE_URL}${endpoint}`, config);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  // 본문이 비었거나 JSON 이 아닐 수 있으므로 방어적으로 파싱.
  let json: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const err = (json ?? {}) as NestErrorBody;
    const message = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message ?? `HTTP ${response.status}`;
    throw new ApiError(message, response.status, err.code ?? err.error);
  }

  return json as T;
}

/**
 * 인증이 필요한 요청. 401 시 토큰 리프레시 후 1회 재시도한다.
 * @param endpoint - `/auth/...` 형태 경로
 * @param options - method/body/headers
 * @returns 응답 본문(JSON)
 */
export async function authRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await doFetch(endpoint, options, true);

  if (response.status === 401) {
    try {
      await refreshTokens();
    } catch {
      throw new ApiError("Authentication required", 401);
    }
    const retry = await doFetch(endpoint, options, true);
    return parseResponse<T>(retry);
  }

  return parseResponse<T>(response);
}

/**
 * 인증이 불필요한 공개 요청.
 * @param endpoint - `/auth/...` 형태 경로
 * @param options - method/body/headers
 * @returns 응답 본문(JSON)
 */
export async function publicRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await doFetch(endpoint, options, false);
  return parseResponse<T>(response);
}
