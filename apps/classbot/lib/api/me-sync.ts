/**
 * me/sync — OS SSO 세션 사용자를 classbot BE `users` 에 동기화(upsert)한다.
 *
 * OS 세션 사용자는 classbot BE 가 모르는 uuid 라 도메인 라우트 조인이 실패할 수 있다.
 * 세션 확립 시(auth-context 의 getSession 성공 통지) `POST /api/me/sync { name, role }`
 * 를 **사용자당 1회**(모듈 레벨 dedup) 호출해 BE 가 사용자 행을 보장하게 한다.
 *
 * 게이트/실패 규약:
 *  - `USE_REAL_CORE_BE` && `OS_SSO_ENABLED` 둘 다 ON 일 때만 호출 — flag OFF 회귀 0.
 *  - 실패는 console.warn 후 무시(비차단) — 동기화 실패가 FE 세션 흐름을 막지 않는다.
 *    (BE 라우트 미구현/네트워크 오류 기간에도 안전.)
 *
 * NOTE: domainFetch 를 쓰지 않고 직접 fetch 한다 — auth-context → me-sync 가
 * domain-fetch(→ current-user → auth-context)를 물면 import 순환이 생기고, 이 호출은
 * 비차단이라 에러 봉투 파싱·폴백 게이트가 필요 없다. 명의는 SSO 규약 그대로
 * `x-user-id = 세션 사용자 raw sub`(HttpOnly 쿠키라 Bearer 불가).
 */

import { BASE_URL } from '@pullim-classbot/api-client';

import type { SsoIdentityUser } from '@/lib/api/identity-snapshot';
import { OS_SSO_ENABLED } from '@/lib/auth/auth-mode';
import { USE_REAL_CORE_BE } from '@/lib/features';

/** 이미 sync 를 시도한 사용자 id — 사용자당 1회 dedup (재세션·refreshSession 중복 차단). */
const syncedUserIds = new Set<string>();

/**
 * SSO 세션 사용자를 BE 에 1회 동기화한다.
 * @param user - 세션 사용자 (name 없으면 email 로 폴백)
 */
export async function syncMeOnce(user: SsoIdentityUser): Promise<void> {
  if (!USE_REAL_CORE_BE || !OS_SSO_ENABLED) return;
  if (syncedUserIds.has(user.id)) return;
  // await 전에 마킹 — 동시 호출(mount getSession + refreshSession)도 1회로 수렴.
  syncedUserIds.add(user.id);
  try {
    const res = await fetch(`${BASE_URL}/me/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ name: user.name ?? user.email, role: user.role }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[me-sync] 사용자 동기화 실패(비차단): HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn('[me-sync] 사용자 동기화 실패(비차단):', e);
  }
}

/** 테스트 전용 — 모듈 레벨 dedup 상태 초기화. */
export function resetMeSyncForTests(): void {
  syncedUserIds.clear();
}
