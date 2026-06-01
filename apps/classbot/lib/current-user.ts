/**
 * 현재 사용자 해석기 — 도메인 신원의 단일 진입점.
 *
 * 신원 단일화 원칙(plan 2026-06-01):
 *  - `auth_users.id`(uuid) 가 정본. 가입 시 같은 id 로 도메인 `users` 행이 생성된다(BE).
 *  - 도메인 코드는 "현재 사용자"를 더 이상 mock `currentPersona`(student_001)로
 *    하드코딩하지 않고, 이 해석기를 통해 **로그인 세션**에서 가져온다.
 *  - 세션이 없으면(데모/비로그인) `student_001`(서연, student) 로 폴백한다.
 *    데모 화면이 로그인 없이도 깨지지 않게 하기 위한 의도된 폴백이다.
 *
 * client 컴포넌트는 `useCurrentUser()`/`useCurrentUserId()` 를 쓴다.
 * 서버(route handler)는 `getCurrentUserIdFromRequest(req)` 로 JWT 에서 id 를 얻는다.
 */

import { decodeAccessToken } from '@pullim-classbot/api-client/jwt';
import type { UserRole } from '@pullim-classbot/types';

import { useAuth } from '@/lib/auth/auth-context';
import { classRoster, type ClassroomStudent } from '@/lib/mock/classbot';
import { currentPersona } from '@/lib/mock/persona';

/** 데모/비로그인 폴백 사용자 id — 도메인 seed 의 서연(student_001). */
export const DEMO_FALLBACK_USER_ID = currentPersona.id;

/** 도메인 "현재 사용자" 모델 — 세션 또는 데모 폴백. */
export interface CurrentUser {
  /** 도메인 users.id (= auth_users.id). 세션 없으면 student_001. */
  id: string;
  /** student/teacher/admin. 폴백은 student. */
  role: UserRole;
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
 * 현재 사용자(세션 우선, 데모 폴백)를 반환하는 client 훅.
 *
 * 세션 사용자에는 가입 이름이 없을 수 있어(JWT claim 은 id/email/role 만 보유),
 * 이름은 email 로컬파트로 임시 표기한다. (도메인 users.name 조회 API 신설 시 대체)
 * @returns 현재 사용자
 */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user) return DEMO_FALLBACK_USER;
  return {
    id: user.id,
    role: user.role,
    name: displayNameFromEmail(user.email),
    isAuthenticated: true,
  };
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
 * `Authorization: Bearer <access>` 의 claim(sub)에서 id 를 얻고,
 * 토큰이 없으면 데모 폴백(student_001)으로 본다.
 * @param req - Next.js Request
 * @returns { id, role, isAuthenticated }
 */
export function getCurrentUserIdFromRequest(req: Request): {
  id: string;
  role: UserRole;
  isAuthenticated: boolean;
} {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice('bearer '.length).trim()
    : null;
  if (token) {
    const payload = decodeAccessToken(token);
    if (payload) {
      return { id: payload.sub, role: payload.role, isAuthenticated: true };
    }
  }
  return { id: DEMO_FALLBACK_USER_ID, role: 'student', isAuthenticated: false };
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
