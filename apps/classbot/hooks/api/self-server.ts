'use client';

/**
 * 자기주도 슬라이스의 **서버 쪽만** 담는 얇은 층 — 이 파일은 스토어를 import 하지 않는다.
 *
 * ## 왜 갈라져 있나
 *
 * 자기주도 담기와 개인정보 동의 훅이 공유하는 신원 판정만 둔다. 공부한 날은 정본 API가
 * 정리될 때까지 `self-bots.ts`와 `self-learning.ts`의 로컬 임시 소스로 분리되어 여기서 조회하지 않는다.
 *
 * 스토어가 `self-bots.ts` 를 직접 import 하면 **순환**이다 — `self-bots.ts` 가 스토어를
 * import 하기 때문이고, 그 순환을 피하려고 `SelfBotRow` 타입을 스토어 쪽에 둔 전례가 이미
 * 있다(스토어 머리주석 「지금 모양이 곧 나중 API 행 모양이다」). 같은 규칙을 여기서도 지킨다:
 * **이 파일은 스토어를 몰라야 한다.** 로컬(데모) 갈래는 스토어를 아는 쪽이 각자 붙인다.
 *
 * 그래서 방향은 한쪽이다 — `self-bots.ts` → 이 파일, 스토어 → 이 파일. 되돌아오는 화살표가
 * 없다. **이 파일에 스토어 import 를 더하는 순간 그 성질이 깨진다.**
 */

import { ApiClientError } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useDevIdentityId } from '@/lib/use-dev-identity';

/** 401 은 다시 물어도 같은 답이다 — 게이트로 넘긴다. 그 밖에는 1회만 다시. */
export function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/** 지금 신원이 어느 갈래인가 — 「아직 모른다」가 독립된 값이다(아래 ⛔). */
export type ServerIdentityState = 'pending' | 'server' | 'demo';

/**
 * 서버가 **내 명의를 인정해 주는 상태인가** — 서버로 갈지 데모로 갈지 가르는 값.
 *
 * ⚠️ `useCurrentUser().isAuthenticated` 를 쓰면 **안 된다.** 이름과 달리 이 질문의 답이
 * 아니다. 그 플래그는 「진짜 로그인 세션인가」라서 **개발용 신원 쿠키에 일부러 false** 를
 * 준다(`lib/current-user.ts` 의 ⚠️ 주석 — RoleGuard 가 데모 통과 경로를 인증으로 세는 것을
 * 막는 값이다). 서버도 같은 뜻으로 쓴다 — 서버가 dev 쿠키에 주는 것은 `isAuthenticated`
 * 가 아니라 **`isIdentified: true`**(명의)이고, 라우트 가드는 그쪽을 본다. 즉 이 훅이
 * 다시 적는 조건은 **서버의 `isIdentified` 와 같은 조건**이다.
 *
 * 그 플래그로 갈랐다면 개발 쿠키를 쓴 로컬·dev preview 전체가 데모로 떨어져 **서버에 한 번도
 * 안 가고**, 그러면서 prod 만 서버를 부르는 정반대 동작이 된다. 그래서 여기서는 서버의
 * 판정 조건을 그대로 다시 적는다 — **유효한 개발 신원 쿠키인가.**
 *
 * `useDevIdentityId()` 는 prod 호스트에서 **항상 빈 문자열**이다(`resolveDevIdentity` 가
 * 호스트로 먼저 거른다). 그래서 prod 에 낡은 쿠키가 남아 있어도 데모로 떨어진다 —
 * 서버가 그 쿠키를 무시하는 것과 같은 판정이다.
 *
 * ## ⛔ 답이 **셋**인 이유 — 「아직 모른다」를 「비로그인」으로 세면 안 된다
 * `AuthProvider` 는 마운트 뒤 `provider.getSession()` 이 끝나야 `isReady` 를 세운다
 * (`lib/auth/auth-context.tsx`). 그동안 `user` 는 `null` 이다 — **로그인한 사람도** 그렇다.
 * OS SSO 경로에서는 그 복원이 네트워크 왕복이라 한 페인트가 아니라 수백 ms 일 수 있다.
 *
 * 이 구간을 `false`(데모)로 접으면 읽기 훅들이 로컬을 정본으로 삼는데, 그때
 * `useCurrentUserId()` 는 데모 폴백 `student_001` 이다(`lib/current-user.ts`). 결과는
 * **로그인 사용자가 남의 담은 봇·공부한 날·연속일수를 잠깐 보는 것**이다. 쓰기 쪽은
 * 같은 함정을 이미 따로 막고 있었고(`useRecordSelfStudyDay` 의 ⛔ ②), 읽기 쪽에는
 * 그 방어가 없었다. 그래서 판정을 boolean 이 아니라 **셋**으로 돌려준다:
 *
 *  - `'server'` — 서버에 물어봐도 되는 명의다(개발 신원 쿠키).
 *  - `'demo'`   — 정말 아무도 아니다(복원이 끝났는데 세션이 없다). 정본은 localStorage.
 *  - `'pending'`— **아직 모른다.** 어느 쪽 데이터도 보여 주지 않는다(로딩으로 그린다).
 *
 * 개발 신원 쿠키는 `isReady` 를 기다리지 않는다 — 그건 세션이 아니라 문서 쿠키라
 * 하이드레이션 직후 그 자리에서 확정된다. SSR 스냅샷에서는 빈 문자열이지만, 그 순간은
 * `isReady` 도 아직 false 라 `'pending'` 으로 덮인다.
 *
 * (P3 가 `hooks/api/self-bots.ts` 안에 두었던 함수를 옮겨 온 것이다. 옮긴 이유는 위
 * 머리주석 — 스토어도 같은 판정이 필요해졌는데 그 파일을 import 할 수 없어서다.
 * 더 나아가 `lib/current-user.ts` 로 올리는 것은 공유 파일이라 별건 승인 사항이라 하지 않았다.)
 * @returns 서버·데모·판정 대기 셋 중 하나
 */
export function useServerIdentityState(): ServerIdentityState {
  const { user, isReady } = useAuth();
  const devIdentityId = useDevIdentityId();
  // 개발 신원 쿠키는 세션 복원과 무관하게 그 자리에서 확정된다.
  if (devIdentityId) return 'server';
  if (user) return 'server';
  // 복원이 끝났는데도 없으면 그때서야 「아무도 아니다」로 굳힌다.
  return isReady ? 'demo' : 'pending';
}

/**
 * pullim-api classbot **도메인 transport**가 인증할 수 있는 신원인가.
 *
 * `useServerIdentityState()`는 same-origin route handler가 해석하는 개발 신원 쿠키까지
 * `'server'`로 본다. 하지만 `classbotRead`/`classbotWrite`는 OS API 호스트로 직접 가며 그 쿠키를
 * 인증하지 않는다. 따라서 도메인 호출은 복원된 `useAuth().user`만 서버 신원으로 인정한다.
 */
export function useClassbotDomainIdentityState(): ServerIdentityState {
  const { user, isReady } = useAuth();
  if (user) return 'server';
  return isReady ? 'demo' : 'pending';
}
