'use client';

/**
 * 자기주도 슬라이스의 **서버 쪽만** 담는 얇은 층 — 이 파일은 스토어를 import 하지 않는다.
 *
 * ## 왜 갈라져 있나
 *
 * 같은 판정(`useHasServerIdentity`)과 같은 조회(`GET /api/me/study-days`)를 두 곳이 쓰는데,
 * 그중 하나가 **스토어 파일**이다:
 *
 *  - `hooks/api/self-bots.ts` — 화면이 읽는 유일한 입구(계약 §3).
 *  - `lib/store/self-learning.ts` 의 `useStreak()` — 셸 헤더의 연속일수 뱃지
 *    (`components/shell/app-header.tsx`)가 **이미 부르고 있는 이름**이라 그 자리에 남아 있다.
 *    P4 에서 연속일수의 출처가 서버로 옮겨 가면서 그쪽도 이 조회가 필요해졌다.
 *
 * 스토어가 `self-bots.ts` 를 직접 import 하면 **순환**이다 — `self-bots.ts` 가 스토어를
 * import 하기 때문이고, 그 순환을 피하려고 `SelfBotRow` 타입을 스토어 쪽에 둔 전례가 이미
 * 있다(스토어 머리주석 「지금 모양이 곧 나중 API 행 모양이다」). 같은 규칙을 여기서도 지킨다:
 * **이 파일은 스토어를 몰라야 한다.** 로컬(데모) 갈래는 스토어를 아는 쪽이 각자 붙인다.
 *
 * 그래서 방향은 한쪽이다 — `self-bots.ts` → 이 파일, 스토어 → 이 파일. 되돌아오는 화살표가
 * 없다. **이 파일에 스토어 import 를 더하는 순간 그 성질이 깨진다.**
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiClientError, apiGet } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUserId } from '@/lib/current-user';
import { useDevIdentityId } from '@/lib/use-dev-identity';
import type { MyStudyDaysResponse } from '@/hooks/api/types';

/** 401 은 다시 물어도 같은 답이다 — 게이트로 넘긴다. 그 밖에는 1회만 다시. */
export function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * 다시 해 볼 만한 실패인가 — 네트워크 단절·5xx·401 만. 그 밖(404·400)은 다시 해도 같은 답이다.
 *
 * 한 번만 도는 이관·백필이 「완료 표시를 남길지」를 이 값으로 정한다. 담은 봇(P3)과
 * 공부한 날(P4)이 **같은 판정**을 써야 해서 여기 있다 — 한쪽만 고치면 두 이관이 서로 다른
 * 조건으로 재시도한다.
 * @param error - 던져진 값(네트워크 예외까지 그대로)
 * @returns 다음 로드에서 다시 해 볼 만하면 true
 */
export function isRetriableUploadError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true; // 네트워크가 끊긴 경우 등
  return error.status >= 500 || error.status === 401;
}

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
 * 판정 조건을 그대로 다시 적는다 — **JWT 세션이거나, 유효한 개발 신원 쿠키이거나.**
 *
 * `useDevIdentityId()` 는 prod 호스트에서 **항상 빈 문자열**이다(`resolveDevIdentity` 가
 * 호스트로 먼저 거른다). 그래서 prod 에 낡은 쿠키가 남아 있어도 데모로 떨어진다 —
 * 서버가 그 쿠키를 무시하는 것과 같은 판정이다.
 *
 * SSR 스냅샷도 빈 문자열이라 첫 페인트는 데모 쪽이고 하이드레이션 직후 갈린다.
 *
 * (P3 가 `hooks/api/self-bots.ts` 안에 두었던 함수를 **글자 그대로** 옮겨 온 것이다.
 * 옮긴 이유는 위 머리주석 — 스토어도 같은 판정이 필요해졌는데 그 파일을 import 할 수 없어서다.
 * 더 나아가 `lib/current-user.ts` 로 올리는 것은 공유 파일이라 별건 승인 사항이라 하지 않았다.)
 * @returns 서버에 물어봐도 되는 신원이면 true
 */
export function useHasServerIdentity(): boolean {
  const { user } = useAuth();
  const devIdentityId = useDevIdentityId();
  return Boolean(user) || Boolean(devIdentityId);
}

/**
 * 공부한 날 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 담은 봇(`selfBotKeys`)과 같은 규칙으로 신원 id 가 **꼬리**에 붙는다.
 */
export const selfStudyDayKeys = {
  mine: ['self-study-days'] as const,
};

/** 서버가 아는 공부한 날 — 로컬 갈래는 부르는 쪽이 붙인다. */
export interface ServerStudyDays {
  /** `'YYYY-MM-DD'` 오름차순. 아직 안 왔거나 신원이 없으면 `undefined`. */
  days: string[] | undefined;
  /** 서버에 물어볼 수 있는 신원인가 — `days` 가 `undefined` 인 두 뜻을 가른다. */
  hasServerIdentity: boolean;
}

/**
 * 공부한 날을 **서버에서만** 읽는다 — `GET /api/me/study-days`.
 *
 * 신원이 없으면 요청을 아예 내보내지 않는다(`enabled`). prod 는 로그인 없이 열리는 공개
 * 데모라 서버가 401 로 답하는데, 그걸 화면에서 처리하는 게 아니라 **묻지 않는 것**이 규약이다
 * — 근거는 `hooks/api/self-bots.ts` 머리주석의 ⛔ 블록.
 *
 * 같은 키를 여러 곳에서 읽어도 요청은 하나다(react-query 가 키로 합친다). 그래서 셸 뱃지와
 * 화면이 동시에 이 훅을 불러도 왕복이 늘지 않는다.
 * @returns 서버 날짜와 신원 판정
 */
export function useServerStudyDays(): ServerStudyDays {
  const userId = useCurrentUserId();
  const hasServerIdentity = useHasServerIdentity();

  const query = useQuery<MyStudyDaysResponse, ApiClientError>({
    queryKey: [...selfStudyDayKeys.mine, userId],
    queryFn: () => apiGet<MyStudyDaysResponse>('/api/me/study-days'),
    enabled: hasServerIdentity,
    retry: retryUnlessGuarded,
  });

  const days = query.data?.days;
  return useMemo(
    // 신원이 없으면 캐시에 남아 있던 값이라도 주지 않는다 — 그 상태의 정본은 로컬이다.
    () => ({ days: hasServerIdentity ? days : undefined, hasServerIdentity }),
    [days, hasServerIdentity],
  );
}
