/**
 * 현재 사용자 해석기 — 도메인 신원의 단일 진입점.
 *
 * ⚠️ **은퇴 대상(2026-09-16 계획 §10 결정 ① · PR 8).** 정본 서버는 pullim-api 이고 화면 훅은
 * `useAuth()`(OS 세션)로 신원을 읽는다 — 계획 PR 4 가 과제·참여·내 반·챗을 그쪽으로 옮겼다.
 * 이 파일의 서버 해석기(`getCurrentUserIdFromRequest`)와 개발용 신원 쿠키(`lib/dev-identity.ts`)는
 * **범위 밖으로 남은 같은 오리진 `/api/*` 라우트**(학부모·동의·담은 봇·자기주도·마켓, 그리고
 * 마켓 「내 봇 공유」가 읽는 교사 반 목록)가 쓰므로 남겨 둔다. 참조가 0 이 되는 시점에 걷는다.
 * 새 코드는 이 파일을 신원 출처로 삼지 마라.
 * *(`[계획 PR 8 정정]` 종전 목록의 「과제 내기」는 이제 여기 없다 — `/api/teacher/assignments*` ·
 * `/api/assignments*` · `/api/enrollments` · `/api/chat` · `/api/bots` · `/api/me/classrooms` ·
 * `/api/grades` · `/api/wellness` 는 PR 8 이 걷었다.)*
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

import type { AuthUser } from '@pullim-classbot/auth';

import type { AppUserRole } from '@/lib/auth/app-user-role';
import { useAuth } from '@/lib/auth/auth-context';
import { findDevIdentity, resolveDevIdentity, type DevIdentityRole } from '@/lib/dev-identity';
import { useDevIdentityId } from '@/lib/use-dev-identity';
import { classRoster, type ClassroomStudent } from '@/lib/mock/classbot';
import { currentPersona } from '@/lib/mock/persona';

/** 데모/비로그인 폴백 사용자 id — 도메인 seed 의 서연(student_001). */
export const DEMO_FALLBACK_USER_ID = currentPersona.id;

/**
 * 이 앱 안에서만 쓰는 역할 union — 정의는 leaf `lib/auth/app-user-role.ts` 로 옮겼고 여기서는
 * 재수출한다(호출부 경로 유지). 'parent' 에 'institution' 이 더해졌다 — 둘 다 이제 OS `/me` 에서
 * 그대로 온다(`lib/auth/os-sso-provider.ts` `mapRole`). 종전 「'parent' 는 개발용 신원 쿠키에서만
 * 온다」는 더는 사실이 아니다.
 */
export type { AppUserRole };

/** 도메인 "현재 사용자" 모델 — 세션 또는 데모 폴백. */
export interface CurrentUser {
  /** 도메인 users.id — OS 세션이면 그 sub, 아니면 데모 폴백 student_001. */
  id: string;
  /** student/teacher/admin/parent. 폴백은 student. */
  role: AppUserRole;
  /**
   * 부르는 이름. 세 갈래의 출처가 다르다 — **세션**이면 OS 가 준 사람 이름(비면 email 로컬파트,
   * 그 순서는 `displayNameOf` 가 쥔다), **개발용 신원 쿠키**면 그 신원의 이름,
   * **데모 폴백**이면 서연.
   */
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
 * 세션 사용자의 이름은 **OS 가 준 사람 이름**(`/me` 의 `displayName` → `AuthUser.name`)이고,
 * 그게 비었을 때만 email 로컬파트로 떨어진다 — 순서와 근거는 `displayNameOf` 에 적어 뒀다.
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
      name: displayNameOf(user),
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
  /**
   * 이 경로가 세울 수 있는 역할은 개발용 신원 쿠키의 셋(student·teacher·parent)뿐이다 — OS 의
   * institution 은 여기로 오지 않는다(OS 세션은 이 서버가 풀 수 없다, 위 주석). 그래서 client 훅의
   * `AppUserRole` 이 아니라 쿠키의 union 을 그대로 쓴다. 라우트 가드(`app/api/_lib/guards.ts`)의
   * `ActorRole` 이 그 셋을 받는다.
   */
  role: DevIdentityRole;
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

/**
 * 세션 사용자를 **부를 이름** — 순서는 「사람 이름 → 없으면 email 로컬파트」다.
 *
 * **순서를 뒤집지 마라.** 이름은 진작부터 세션 객체에 실려 있었다 — `lib/auth/os-sso-provider.ts`
 * 가 OS `/me` 의 `displayName` 을 담고, `auth-context` 는 그 객체를 참조 그대로 넘긴다. 그런데도
 * 화면은 오래도록 email 앞부분(`psh`)으로 사람을 불렀다. **값이 없어서가 아니라 이 자리가 그 값을
 * 읽지 않았기 때문이다** — 종전 코드는 세션 갈래에서 곧바로 `displayNameFromEmail(user.email)` 을
 * 썼다. 공유 계약 `AuthUser` 에 칸을 낸 것도 값을 나르려고가 아니라 `user.name` 읽기가
 * **컴파일되게** 하려는 것이다. 칸이 생긴 지금 이 함수가 그 순서를 쥔다.
 *
 * **그래도 폴백은 지우지 마라.** `AuthUser.name` 은 optional 이고(계약이 구현체에게 이름을
 * 요구하지 않는다), 값을 대는 `/me` 의 `displayName` 도 비어 올 수 있다 — 같은 auth 프로필을
 * 투영하는 `ClassMemberDto.displayName` 이 `string | null` 인 것이 그 증거다
 * (`lib/api/classbot-dto.ts`). 이름을 못 받은 사람이 빈칸으로 서면 안 된다.
 *
 * **빈 문자열·공백은 「없음」과 같이 본다** — 화면에서 셋은 똑같은 빈칸이라 갈라 둘 이유가 없다.
 * 반 명단 쪽도 **판정은 같다**(`lib/risk-signals.ts` 의 `memberLabel` 이 `displayName?.trim()` 으로
 * 갈린다). **다만 떨어지는 값은 다르다** — 저쪽은 `학생 <sub 앞 8자>` 로, 이쪽은 email 로컬파트로
 * 떨어진다. 명단은 줄 스무 개가 다 같아지지 않게 사람을 가려야 하고, 여기는 부를 이름 하나를
 * 세우는 자리라서다.
 *
 * @param user - 세션 사용자
 * @returns 화면에 찍을 이름 (빈 문자열이 되는 경우는 email 까지 빈 세션뿐 —
 *          `lib/__tests__/current-user-name.test.tsx` 가 그 한 경우도 고정한다)
 */
function displayNameOf(user: AuthUser): string {
  const given = user.name?.trim();
  return given ? given : displayNameFromEmail(user.email);
}

/** email 로컬파트를 표시 이름으로 — 이름이 없을 때의 폴백(`displayNameOf`). */
function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local || email;
}

/**
 * 학생 화면이 부르는 "나" — **신원과 데모 부가 데이터를 가른 값**이다.
 *
 * 종전의 `useRosterMe()` 는 목 roster 행(`ClassroomStudent`)을 통째로 돌려줬고, 그 행의
 * `name` 이 인사·내 정보에 그대로 찍혔다. roster id 는 `s1`…`s18` 인데 실계정 id 는 OS
 * `sub`(uuid) 라 조인이 **한 번도 맞지 않았다** — 「미스면 데모 행」 폴백이 사실상 상수여서
 * 로그인한 사람도 늘 데모 「서연」으로 불렸다. 같은 화면 우상단 아바타는
 * `useCurrentUser()` 를 보고 있어 한 화면에 두 사람이 섰다.
 *
 * 그래서 두 축을 가른다:
 *  - **신원**(`id`·`name`) — `useCurrentUser()`(OS 세션 · 개발용 신원 쿠키)에서만 온다.
 *    신원이 없으면 **빈 값**이다. 데모 이름으로 채우지 않는다 — 이름 없이 서는 편이 남의
 *    이름으로 부르는 것보다 낫다. 부르는 쪽이 `name` 이 비었을 때를 각자 정한다.
 *  - **데모 부가 데이터**(`demo`) — 목 roster 행. 목 조회 키(`demo.id`)와 목 수치(웰빙·정답률
 *    등)가 들어 있고, 신원이 **데모 사람일 때만** 찬다(개발용 신원 `student_001`·`s2` …).
 *    실계정은 `null` 이다 — 목 roster 에 그 사람의 행이 없기 때문이다.
 *
 * `demo.name`·`demo.id` 는 **신원이 아니다.** 화면에 사람 이름으로 찍지 마라.
 * 목 수치를 읽는 화면(웰빙 게이지·감정 기록·가벼운 모드)은 `demo` 가 `null` 이면 각자의 빈
 * 상태로 선다. 정본이 그 문을 낼 때 `demo` 를 걷는다.
 */
export interface StudentMe {
  /** 신원 id — OS 세션 sub 또는 개발용 신원 id. 신원이 없으면 `''`. */
  id: string;
  /** 부르는 이름 — `useCurrentUser().name`(사람 이름 → 없으면 email 로컬파트). 신원이 없으면 `''`. */
  name: string;
  /** 데모 부가 데이터 행 — 목 조회 키와 목 수치. 실계정·비신원은 `null`. */
  demo: ClassroomStudent | null;
}

/** 데모 roster 의 "나"(서연) 행 — seed 의 s1 == student_001. */
const DEMO_ROSTER_ME: ClassroomStudent =
  classRoster.find((s) => s.name === currentPersona.name) ?? classRoster[0];

/**
 * 신원 id 로 **데모 roster 행**을 찾는다 — 못 찾으면 `null`.
 *
 * 종전 해석기는 미스를 데모 행(서연)으로 메웠다. 그 폴백이 결함의 본체였다 — 실계정 id 는
 * 절대 `s1`…`s18` 과 맞지 않으므로 「폴백」이 아니라 상수였다. 여기서는 메우지 않는다:
 * 목 사람이 아니면 목 부가 데이터도 없다.
 *
 * @param userId - 신원 id(세션 uuid · `student_001` · `sN`)
 * @returns 데모 roster 행 또는 null
 */
function demoRowOf(userId: string): ClassroomStudent | null {
  if (!userId) return null;
  // seed 매핑: student_001 ↔ roster s1(서연).
  if (userId === currentPersona.id) return DEMO_ROSTER_ME;
  return classRoster.find((s) => s.id === userId) ?? null;
}

/**
 * 학생 화면의 "나" — 신원은 세션에서, 목 부가 데이터는 roster 조인에서.
 *
 * `useCurrentUser()` 의 세 갈래 중 **세 번째(데모 폴백 `student_001`)는 신원이 아니다** —
 * 아무도 고르지 않았는데 서 있는 값이라, 그것으로 사람을 부르면 거짓이 된다. 그래서 여기서는
 * OS 세션이거나 개발용 신원 쿠키일 때만 이름·id 를 싣고, 그 밖에는 빈 값으로 둔다.
 * @returns 신원 + 데모 부가 데이터
 */
export function useStudentMe(): StudentMe {
  const user = useCurrentUser();
  const devIdentityId = useDevIdentityId();
  const identified = user.isAuthenticated || findDevIdentity(devIdentityId) !== null;
  if (!identified) return { id: '', name: '', demo: null };
  return { id: user.id, name: user.name, demo: demoRowOf(user.id) };
}
