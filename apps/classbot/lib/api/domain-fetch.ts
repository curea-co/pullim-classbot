/**
 * 도메인 fetch — pullim-api classbot **정본 라우트**(`api.pullim.ai/classbot/*`)를 친다.
 *
 * `lib/api/read-fetch.ts`·`lib/api/client-fetch.ts` 는 같은 오리진 Next route handler(`/api/*`) 전용이라
 * 별도 헬퍼가 필요하다 — 이쪽은 **OS API 호스트**(`NEXT_PUBLIC_OS_API_URL`, `lib/auth/os-sso.ts`
 * `API_BASE`)의 `/classbot/*` 서비스 경계 프리픽스로 간다(글로벌 `/api` 프리픽스 없음).
 *
 * *(종전에는 `USE_REAL_CORE_BE` 플래그가 이 경로를 켰다. 2026-09-16 계획 PR 4 에서 그 플래그를
 * 걷었다 — 정본은 이 하나이고 켜고 끄는 것이 아니다. 화면 훅은 `lib/api/classbot-client.ts` 를
 * 지나 이 함수를 부른다(401 로그인 유도·재시도 규칙은 그쪽 소유).
 * `output/2026-09-16_classbot-completion-plan.html` §07 데이터층 · §09 PR 4.)*
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

import { ApiError } from '@pullim-classbot/api-client';

import { peekDomainIdentitySnapshot } from '@/lib/api/identity-snapshot';
import { API_BASE } from '@/lib/auth/os-sso';
import { fetchWithOsCsrfRecovery } from '@/lib/api/csrf-fetch';

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
  code?: string;
  error?: { code?: string; message?: string };
  /** NestJS 기본형. */
  message?: string | string[];
}

/**
 * classbot 정본 라우트를 OS 쿠키 세션으로 호출하고 **상태 코드와 본문을 함께** 돌려준다.
 *
 * 상태 코드가 뜻을 갖는 문이 있어서다 — 참여(`POST /enrollments`)와 제출(`POST /assignments/:id/submit`)은
 * 같은 본문을 새로 만들었으면 201, 이미 있었으면 200 으로 준다(pullim-api 컨트롤러 `created` 분기).
 *
 * @param path - `/enrollments` 같은 `/classbot` 상대 경로 (base 는 `${API_BASE}/classbot`)
 * @param options - method/body. 쓰기면 CSRF 토큰을 자동 첨부한다.
 * @returns `{ status, body }` — body 는 파싱된 JSON(비어 있으면 null)
 * @throws {ApiError} 비정상 응답 (status + 도메인 봉투 message/code)
 */
export async function domainFetchWithStatus<T>(
  path: string,
  options: DomainFetchOptions = {},
): Promise<{ status: number; body: T }> {
  const { method = 'GET', body } = options;

  const init: RequestInit = {
    method,
    // OS access 쿠키(Domain=.pullim.ai, HttpOnly)를 cross-origin 자동 첨부 — 서버가 sub 를 파생.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  };
  const url = `${CLASSBOT_API_BASE}${path}`;
  const res = CSRF_METHODS.has(method)
    ? await fetchWithOsCsrfRecovery(url, init)
    : await fetch(url, init);

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
    throw new ApiError(message, res.status, err.code ?? err.error?.code);
  }

  return { status: res.status, body: json as T };
}

/**
 * classbot 정본 라우트를 OS 쿠키 세션으로 호출한다(본문만).
 *
 * @param path - `/enrollments` 같은 `/classbot` 상대 경로 (base 는 `${API_BASE}/classbot`)
 * @param options - method/body. 쓰기면 CSRF 토큰을 자동 첨부한다.
 * @returns 파싱된 JSON 본문
 * @throws {ApiError} 비정상 응답 (status + 도메인 봉투 message/code)
 */
export async function domainFetch<T>(path: string, options: DomainFetchOptions = {}): Promise<T> {
  const { body } = await domainFetchWithStatus<T>(path, options);
  return body;
}
