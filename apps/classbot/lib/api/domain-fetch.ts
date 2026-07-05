/**
 * 도메인 fetch — pullim-api classbot **정본 라우트**(`api.pullim.ai/classbot/*`)를 친다.
 *
 * 코어 스토어 전환(`USE_REAL_CORE_BE`)용 얇은 헬퍼. `lib/api/read-fetch.ts` 는 같은 오리진 Next
 * route handler(`/api/*`) 전용이라 별도 헬퍼가 필요하다 — 이쪽은 **OS API 호스트**(`NEXT_PUBLIC_OS_API_URL`,
 * `lib/auth/os-sso.ts` `API_BASE`)의 `/classbot/*` 서비스 경계 프리픽스로 간다(글로벌 `/api` 프리픽스 없음).
 *
 * 신원 계약 (정본 — 표준화된 OS 쿠키 세션):
 *  - **OS access 쿠키 세션이 신원이다.** OS 로그인이 set 한 access 쿠키(`Domain=.pullim.ai`, HttpOnly)가
 *    `credentials:'include'` 로 OS API 호스트에 cross-origin 자동 첨부되고, 서버가 그 쿠키에서 `sub` 를
 *    파생한다(`JwtVerifyGuard` + `EntitlementGuard('classbot')`). **FE 는 x-user-id·Bearer 를 보내지 않는다.**
 *  - **CSRF(쓰기)**: pullim-api `CsrfGuard` 는 write(POST·PATCH·PUT·DELETE)에 double-submit `X-CSRF-Token`
 *    헤더 + CSRF 쿠키를 요구한다. `fetchOsCsrfToken`(로그아웃과 공용) 으로 토큰을 받아 헤더로 실는다.
 *    read(GET)는 CSRF 불필요.
 *  - 서버가 신원을 소유하므로 FE 는 사용자 id 를 **로컬 필터·재동기화 캐시 키**(인박스/목록을 인증
 *    사용자로 스코프)용으로만 보유한다 — auth-context 가 publish 한 OS 세션 스냅샷에서 읽는다.
 *
 * ⚠️ 구(舊) standalone NestJS(:4032) 모델(x-user-id + me/sync 프로비저닝 + seed roster 브리지)은
 *   전량 폐기됐다 — 정본 서버는 사용자 프로비저닝이 없고 OS 세션 쿠키의 `sub` 로 신원을 파생한다.
 */

import { useSyncExternalStore } from 'react';

import { ApiError } from '@pullim-classbot/api-client';

import {
  peekDomainIdentitySnapshot,
  subscribeDomainIdentity,
} from '@/lib/api/identity-snapshot';
import { API_BASE, fetchOsCsrfToken } from '@/lib/auth/os-sso';
import { USE_REAL_CORE_BE } from '@/lib/features';

// 스냅샷 publish/타입은 leaf(identity-snapshot)가 소유 — 호출부 편의로 재수출한다.
// (auth-context 는 순환 방지를 위해 leaf 를 직접 import 한다.)
export { setDomainIdentitySnapshot, type SsoIdentityUser } from '@/lib/api/identity-snapshot';

/** classbot 정본 표면 base — OS API 호스트의 서비스 경계 프리픽스(`/classbot/*`). */
const CLASSBOT_API_BASE = `${API_BASE}/classbot`;

/** CsrfGuard 가 double-submit 토큰을 요구하는 쓰기 메서드. */
const CSRF_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * 현재 OS 세션 사용자 id (비훅) — 인박스/목록 로컬 필터·재동기화 캐시 키. 미인증 null.
 * 서버가 신원을 소유하므로 요청 명의로는 쓰지 않는다(쿠키가 명의). auth-context 가 OS `/me` 세션을
 * `setDomainIdentitySnapshot` 으로 publish 한 값.
 * @returns 세션 사용자 raw sub(uuid) 또는 null
 */
export function currentSessionUserId(): string | null {
  return peekDomainIdentitySnapshot()?.id ?? null;
}

interface DomainFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** 도메인 라우트 에러 봉투 — pullim-api 는 NestJS 기본형({statusCode,message,error}). spec 봉투도 방어. */
interface DomainErrorBody {
  error?: { code?: string; message?: string };
  /** NestJS 기본형. */
  message?: string | string[];
}

/**
 * classbot 정본 라우트를 OS 쿠키 세션으로 호출한다.
 *
 * @param path - `/enrollments` 같은 `/classbot` 상대 경로 (base 는 `${API_BASE}/classbot`)
 * @param options - method/body. 쓰기면 CSRF 토큰을 자동 첨부한다.
 * @returns 파싱된 JSON 본문
 * @throws {ApiError} 비정상 응답 (status + 도메인 봉투 message/code)
 */
export async function domainFetch<T>(path: string, options: DomainFetchOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // 쓰기(CsrfGuard): GET /auth/csrf 로 받은 토큰을 X-CSRF-Token 으로 재전송(double-submit). read 는 불필요.
  if (CSRF_METHODS.has(method)) {
    const csrf = await fetchOsCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const res = await fetch(`${CLASSBOT_API_BASE}${path}`, {
    method,
    // OS access 쿠키(Domain=.pullim.ai, HttpOnly)를 cross-origin 자동 첨부 — 서버가 sub 를 파생.
    credentials: 'include',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  // 본문이 비었거나 JSON 이 아닐 수 있으므로 방어적으로 파싱.
  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as DomainErrorBody;
    const message =
      err.error?.message ??
      (Array.isArray(err.message) ? err.message.join(', ') : err.message) ??
      `HTTP ${res.status}`;
    throw new ApiError(message, res.status, err.error?.code);
  }

  return json as T;
}

/**
 * 코어 스토어 sync 훅용 reactive 세션 사용자 id — 신원 변경(OS 세션 확립/로그아웃)에 반응해
 * **같은 마운트에서도** effect 재실행(재동기화)을 트리거하고, 단일 비행 캐시 키가 된다.
 * 플래그 OFF 면 상수('') — 신원 해석·재렌더 비용 0. 플래그 ON·미인증은 'anon'.
 * @returns 세션 사용자 id (인증: raw sub, 미인증: 'anon', 플래그 OFF: '')
 */
export function useSyncUserId(): string {
  return useSyncExternalStore(
    subscribeDomainIdentity,
    () => (USE_REAL_CORE_BE ? (currentSessionUserId() ?? 'anon') : ''),
    () => '',
  );
}
