/**
 * 현재 사용자 해석기 — 도메인 신원의 단일 진입점.
 *
 * 신원 단일화 원칙:
 *  - 도메인 코드는 "현재 사용자"를 mock `currentPersona`(student_001)로 하드코딩하지 않고
 *    이 해석기를 통해 얻는다.
 *  - **client** 는 `useCurrentUser()`/`useCurrentUserId()` — 풀림 OS SSO 세션
 *    (`auth-context` → pullim-api `/me` 쿠키)에서 온다.
 *  - **서버(route handler)** 는 `getCurrentUserIdFromRequest(req)` — **개발용 신원 쿠키**
 *    (`lib/dev-identity.ts`)를 보고, 없으면 `student_001`(서연, student) 로 폴백한다.
 *    데모 화면이 로그인 없이도 깨지지 않게 하기 위한 의도된 폴백이다.
 *
 * ⚠️ 두 쪽의 신원 출처가 다르다. 서버 쪽에 **production 신원이 없는** 이유는
 * `getCurrentUserIdFromRequest` 주석에 적어 뒀다.
 */

import type { UserRole } from '@pullim-classbot/types';

import { useAuth } from '@/lib/auth/auth-context';
import { findDevIdentity, resolveDevIdentity } from '@/lib/dev-identity';
import { useDevIdentityId } from '@/lib/use-dev-identity';
import { classRoster, type ClassroomStudent } from '@/lib/mock/classbot';
import { currentPersona } from '@/lib/mock/persona';

/** 데모/비로그인 폴백 사용자 id — 도메인 seed 의 서연(student_001). */
export const DEMO_FALLBACK_USER_ID = currentPersona.id;

/**
 * 이 앱 안에서만 쓰는 역할 union — `UserRole` 에 'parent' 를 더한 것.
 *
 * `packages/types` 의 `UserRole` 은 'student' | 'teacher' | 'admin' 이라 학부모가 없다.
 * 학부모 화면은 **이 앱에만** 있고 공유 claim union 에도 'parent' 가 없으므로,
 * BE 와 공유하는 계약(`packages/*`)을 이 앱 사정으로 넓히지 않는다 —
 * 대신 여기서 넓힌 별칭을 두고 앱 경계 안에서만 쓴다.
 * ('parent' 는 개발용 신원 쿠키에서만 온다.)
 */
export type AppUserRole = UserRole | 'parent';

/** 도메인 "현재 사용자" 모델 — 세션 또는 데모 폴백. */
export interface CurrentUser {
  /** 도메인 users.id (= auth_users.id). 세션 없으면 student_001. */
  id: string;
  /** student/teacher/admin/parent. 폴백은 student. */
  role: AppUserRole;
  /** 표시 이름. 세션 사용자는 가입 이름, 폴백은 서연. */
  name: string;
  /** 실제 로그인 세션이면 true, 데모 폴백이면 false. */
  isAuthenticated: boolean;
}

/** 데모 폴백 사용자(서연). 세션이 없을 때 반환. */
const DEMO_FALLBACK_USER: CurrentUser = {
  id: currentPersona.id,
  role: 'student',
  name: currentPersona.name,
  isAuthenticated: false,
};

/**
 * 현재 사용자(세션 우선, 개발용 신원 쿠키, 그다음 데모 폴백)를 반환하는 client 훅.
 *
 * 세션 사용자에는 가입 이름이 없을 수 있어(JWT claim 은 id/email/role 만 보유),
 * 이름은 email 로컬파트로 임시 표기한다. (도메인 users.name 조회 API 신설 시 대체)
 *
 * ⚠️ 쿠키 폴백은 **`isAuthenticated: false` 를 유지한다.** 이 플래그는 RoleGuard·
 * `packages/auth` 가 「실제 로그인 세션인가」를 판정하는 값이라, 개발용 쿠키가 여기로
 * 새면 데모 통과 경로가 인증으로 둔갑한다. 쿠키가 바꾸는 건 **누구로 보이는가**(id·role·name)
 * 까지고 **인증 여부는 아니다.**
 * @returns 현재 사용자
 */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  const devIdentityId = useDevIdentityId();
  if (user) {
    return {
      id: user.id,
      role: user.role,
      name: displayNameFromEmail(user.email),
      isAuthenticated: true,
    };
  }
  const dev = findDevIdentity(devIdentityId);
  if (dev) {
    return { id: dev.id, role: dev.role, name: dev.name, isAuthenticated: false };
  }
  return DEMO_FALLBACK_USER;
}

/**
 * 현재 사용자 id 만 반환하는 client 훅(쓰기 명의로 사용).
 * @returns 도메인 users.id (세션 또는 student_001)
 */
export function useCurrentUserId(): string {
  return useCurrentUser().id;
}

/**
 * 요청에서 현재 사용자 id 를 해석한다(서버 route handler 용).
 *
 * **개발 전용 신원 쿠키**(`lib/dev-identity.ts`)를 보고, 없으면 데모 폴백으로 본다.
 * 쿠키는 prod 호스트가 아니고 allowlist 안의 id 일 때만 인정된다.
 *
 * ── 이 경로에는 production 신원이 없다 ──────────────────────────────────────
 * 인증·인가는 **pullim-os·pullim-api 가 소유한다.** OS 세션은 `Domain=.pullim.ai` HttpOnly
 * access 쿠키이고 **pullim-api 가** 그것을 검증한다(ES256 · `JwtVerifyGuard`) — 클래스봇
 * route handler 는 그 서명을 풀 열쇠가 없다. 개발 신원 쿠키는 prod 에서 항상 닫히므로,
 * **prod 의 `/api/*` 는 익명이고 쓰기 가드는 401 을 준다.**
 *
 * prod 신원이 필요한 표면은 route handler 가 아니라 **정본 `api.pullim.ai/classbot/*`**
 * (`lib/api/domain-fetch.ts`)다 — 서버가 쿠키에서 `sub` 를 파생한다.
 *
 * *(종전에는 `Authorization: Bearer` 토큰을 **서명까지 검증**(HS256, classbot BE 와 공유하는
 * `JWT_SECRET`)해 claim 을 믿는 경로가 먼저 있었다. 그 토큰을 발급하던 주체가 클래스봇
 * 자체 인증 BE 뿐이었고, 그것이 걷히며 검증 경로도 함께 걷혔다 — `05 § 11.1`.)*
 *
 * ── 플래그가 둘인 이유 ────────────────────────────────────────────────────
 * 라우트가 실제로 물어야 하는 건 「인증됐나」가 아니라 **「이 요청을 그 사용자 명의로
 * 처리해도 되나」**다. 그 판정은 `isIdentified` 가 진다 — 가드가 보는 값도 그쪽이다
 * (`app/api/_lib/guards.ts`). 데모 폴백은 false 이므로 가드가 401 을 준다.
 *
 * `isAuthenticated` 는 **실제 로그인 세션**만 가리키고 지금은 **늘 false** 다 — 위에서
 * 적은 대로 이 경로가 세울 수 있는 세션이 없다. 이름을 남겨 둔 이유는 client 훅
 * (`useCurrentUser`)이 같은 이름을 **OS 세션** 기준으로 쓰기 때문이다 — 서버만 이름을
 * 바꾸면 같은 질문을 두 층이 다른 말로 부르게 된다. 이 값으로 분기하지 마라.
 *
 * @param req - Next.js Request
 * @returns { id, role, isAuthenticated, isIdentified }
 */
export function getCurrentUserIdFromRequest(req: Request): {
  id: string;
  role: AppUserRole;
  /** 실제 로그인 세션인가 — **늘 false**(위 주석). 이 값으로 분기하지 마라. */
  isAuthenticated: boolean;
  /** 그 사용자 명의로 처리해도 되는가 — 개발용 신원. 가드는 이 값을 본다. */
  isIdentified: boolean;
} {
  // 개발 전용 — prod 호스트에서는 resolveDevIdentity 가 항상 null 이다.
  const dev = resolveDevIdentity(req.headers.get('cookie'), req.headers.get('host'));
  if (dev) {
    // 개발 신원은 **인증이 아니다** — 명의로 쓸 수 있을 뿐이다(위 주석).
    return { id: dev.id, role: dev.role, isAuthenticated: false, isIdentified: true };
  }
  return { id: DEMO_FALLBACK_USER_ID, role: 'student', isAuthenticated: false, isIdentified: false };
}

/** email 로컬파트를 표시 이름으로(세션 사용자 이름 임시 표기). */
function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local || email;
}

/** 데모 roster 의 "나"(서연) 행 — seed 의 s1 == student_001. */
const DEMO_ROSTER_ME: ClassroomStudent =
  classRoster.find((s) => s.name === currentPersona.name) ?? classRoster[0];

/**
 * 현재 사용자에 해당하는 **도메인 roster 행**을 해석한다.
 *
 * 도메인 화면 다수가 per-student 데이터를 mock `classRoster`(id `s1`..`s18`,
 * seed 에서 s1→student_001)로 키잉한다. 그 읽기 경로를 깨지 않으면서 신원만
 * 세션 기반으로 전환하기 위한 브리지:
 *  - 세션/폴백 사용자 id 가 roster 에 있으면 그 행을(예: student_001 → 서연 s1),
 *  - 없으면(신규 가입 uuid 등) 데모 "나"(서연) 행을 표시 데이터로 사용한다.
 *
 * 반환 행의 `id` 는 mock roster id 라서 도메인 mock 조회 키로만 쓴다.
 * **쓰기 명의**(저장될 user_id)는 항상 `useCurrentUserId()`(세션 uuid)를 쓴다.
 * @returns 현재 사용자의 roster 표시 행
 */
export function useRosterMe(): ClassroomStudent {
  const { id } = useCurrentUser();
  return resolveRosterMe(id);
}

/** id(세션 uuid 또는 student_001/sN)로 roster 행 해석 — 미스 시 데모(서연). */
export function resolveRosterMe(userId: string): ClassroomStudent {
  // seed 매핑: student_001 ↔ roster s1(서연). 그 외 uuid/sN 은 직접 매칭 시도.
  if (userId === currentPersona.id) return DEMO_ROSTER_ME;
  return classRoster.find((s) => s.id === userId) ?? DEMO_ROSTER_ME;
}
