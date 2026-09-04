/**
 * 현재 사용자 해석기 — 도메인 신원의 단일 진입점.
 *
 * 신원 단일화 원칙(plan 2026-06-01):
 *  - `auth_users.id`(uuid) 가 정본. 가입 시 같은 id 로 도메인 `users` 행이 생성된다(BE).
 *  - 도메인 코드는 "현재 사용자"를 더 이상 mock `currentPersona`(student_001)로
 *    하드코딩하지 않고, 이 해석기를 통해 **로그인 세션**에서 가져온다.
 *  - 세션이 없으면 **개발용 신원 쿠키**(`lib/dev-identity.ts`)를 본다. prod 호스트가
 *    아닐 때만 유효하고, allowlist 안의 데모 사용자만 인정한다. 폴백 경로일 뿐
 *    **JWT 를 이기지 못한다.**
 *  - 그것도 없으면 `student_001`(서연, student) 로 폴백한다.
 *    데모 화면이 로그인 없이도 깨지지 않게 하기 위한 의도된 폴백이다.
 *
 * client 컴포넌트는 `useCurrentUser()`/`useCurrentUserId()` 를 쓴다.
 * 서버(route handler)는 `getCurrentUserIdFromRequest(req)` 로 JWT → 개발용 신원 쿠키
 * 순으로 id 를 얻는다.
 */

import { verifyAccessToken } from '@pullim-classbot/api-client/jwt-verify';
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
 * 학부모 화면은 **이 앱에만** 있고 BE 인증(JWT claim)은 여전히 그 셋만 발급하므로,
 * BE 와 공유하는 계약(`packages/*`)을 이 앱 사정으로 넓히지 않는다 —
 * 대신 여기서 넓힌 별칭을 두고 앱 경계 안에서만 쓴다.
 * (JWT 경로가 돌려주는 role 은 지금도 `UserRole` 뿐이다. 'parent' 는 개발용 신원 쿠키에서만 온다.)
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
 * `Authorization: Bearer <access>` 의 토큰을 **서명까지 검증**(HS256, BE 와 공유하는
 * JWT_SECRET)한 뒤에만 claim(sub/role)을 신뢰한다. 디코드만 하면 공격자가 임의의
 * sub/role 을 넣은 self-signed 토큰으로 타인 명의·교사 권한을 위조할 수 있으므로,
 * 신원·역할 판정 경로는 반드시 서명 검증을 통과해야 한다.
 *
 * 토큰이 없거나·서명/만료/형식 검증에 실패하면 **JWT 로는 인증되지 않는다** — 위조 토큰이
 * 신원을 얻는 경로는 여기에 없다.
 *
 * 그다음에야 **개발용 신원 쿠키**(`lib/dev-identity.ts`)를 본다. prod 호스트가 아니고
 * allowlist 안의 id 일 때만 인정하는 별도 경로다. 위조 JWT 를 들고 왔더라도 그 토큰이
 * 신원이 되는 일은 없고, 쿠키가 있으면 **쿠키의** 데모 사용자가 될 뿐이다.
 * 둘 다 없으면 데모 폴백(student_001)으로 본다.
 *
 * ── 플래그가 둘인 이유 ────────────────────────────────────────────────────
 * `isAuthenticated` 는 **실제 세션(JWT)** 하나만 가리킨다. 스펙이 세션을 JWT 로 고정하고
 * 매 요청 서명 검증을 요구하므로(spec 05 §311·be-api-design §255), 개발용 쿠키가 이 이름을
 * 얻으면 계약이 갈라진다 — client 훅(`useCurrentUser`)도 같은 쿠키를 `isAuthenticated: false`
 * 로 보기 때문에 서버만 true 로 두면 **같은 쿠키를 두 층이 반대로 부르는** 상태가 된다.
 *
 * 라우트가 실제로 물어야 하는 건 「인증됐나」가 아니라 **「이 요청을 그 사용자 명의로
 * 처리해도 되나」**다. 그 판정은 `isIdentified` 가 진다 — JWT 세션이거나, prod 가 아닌 곳의
 * allowlist 개발 신원. 데모 폴백은 둘 다 false 이므로 가드가 401 을 준다.
 *
 * @param req - Next.js Request
 * @returns { id, role, isAuthenticated, isIdentified }
 */
export function getCurrentUserIdFromRequest(req: Request): {
  id: string;
  role: AppUserRole;
  /** 실제 로그인 세션(JWT)인가 — 개발용 쿠키는 여기 들어오지 않는다. */
  isAuthenticated: boolean;
  /** 그 사용자 명의로 처리해도 되는가 — JWT 세션이거나 개발용 신원. 가드는 이 값을 본다. */
  isIdentified: boolean;
} {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice('bearer '.length).trim()
    : null;
  if (token) {
    // 서명 secret 미설정 시 검증 불가 → 토큰을 신뢰하지 않는다(폴백).
    const secret = process.env.JWT_SECRET ?? '';
    const payload = verifyAccessToken(token, secret);
    if (payload) {
      return { id: payload.sub, role: payload.role, isAuthenticated: true, isIdentified: true };
    }
  }
  // 개발 전용 폴백 — prod 호스트에서는 resolveDevIdentity 가 항상 null 이다.
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
