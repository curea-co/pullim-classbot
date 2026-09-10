'use client';

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ 개발 전용 — `lib/dev-identity.ts` 의 client 훅 조각. 정식 오픈 전 함께 제거.
 *
 * 왜 `lib/current-user.ts` 안에 두지 않고 파일을 갈랐나:
 *   `current-user.ts` 는 **서버 route handler 가 import 하는 모듈**이다
 *   (`getCurrentUserIdFromRequest`). 거기서 `react` 의 `useSyncExternalStore` 를
 *   직접 import 하면 Next 16 이 RSC 경계 위반으로 **모듈 전체를 거절**해
 *   `/api/*` 가 전부 500 이 된다:
 *     "You're importing a module that depends on `useSyncExternalStore`
 *      into a React Server Component module."
 *   tsc·eslint·jest 는 이 경계를 보지 않아 셋 다 통과한 채로 런타임에서만 터진다.
 *   훅을 `'use client'` 모듈로 떼어 두면 서버 모듈이 이 파일을 import 해도
 *   client reference 로 취급돼 안전하다 — `lib/auth/auth-context.tsx` 와 같은 형태.
 * ═════════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from 'react';

import { resolveDevIdentity } from '@/lib/dev-identity';

/** 호스트도 쿠키도 이 훅이 구독할 수 있는 store 가 아니다 — unsubscribe 만 돌려준다. */
const neverChanges = () => () => {};

/**
 * 개발용 신원 쿠키의 사용자 id 를 **하이드레이션 안전하게** 읽는다.
 *
 * `document.cookie` 는 클라이언트에서만 알 수 있다 → 서버 스냅샷은 항상 ''(없음)으로 두고
 * 하이드레이션 직후 클라이언트 스냅샷으로 갈린다(SSR 마크업 불일치 방지).
 * 스냅샷을 **id 문자열**로 좁혀 렌더마다 새 객체가 나오지 않게 한다(무한 렌더 방지).
 * — 같은 형태: `components/shell/dev-role-switch.tsx`
 * @returns allowlist 를 통과한 데모 사용자 id, 없으면 빈 문자열
 */
export function useDevIdentityId(): string {
  return useSyncExternalStore(
    neverChanges,
    () => resolveDevIdentity(document.cookie, window.location.host)?.id ?? '',
    () => '',
  );
}
