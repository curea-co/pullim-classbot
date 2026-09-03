/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ 개발 전용 신원 · 정식 오픈 전 제거 ⚠️
 *
 * **이것은 인증이 아니다.** 서명도 만료도 없는 평문 쿠키 한 줄일 뿐이라,
 * 값을 손으로 바꾸면 아래 allowlist 안의 다른 데모 사용자로 그냥 바뀐다.
 * 정식 인증(JWT · 풀림 통합 계정)을 **대체하지 않으며, 그보다 항상 뒤에 온다.**
 *
 * 왜 두는가: classbot 로컬에는 `JWT_SECRET` 이 없고 로그인은 실행되지 않는
 * NestJS(:4032)로 간다 → 로컬에서 모든 `/api/*` 가 401 이라 데모가 아예 안 돈다.
 * 그래서 **prod 호스트가 아닐 때만** 이 쿠키를 신원으로 인정한다.
 *
 * 안전 장치 셋:
 *  1. **prod 무력** — 요청 Host 가 `classbot.pullim.ai` 면 무조건 무시한다
 *     (`isDevIdentityHost`). prod 에서는 이 파일이 있어도 아무 일도 하지 않는다.
 *  2. **allowlist** — 아래 `DEV_IDENTITIES` 의 5명 밖 id 는 전부 무시한다.
 *     임의 id 사칭이 불가능하다.
 *  3. **JWT 우선** — 유효한 JWT 가 있으면 JWT 가 이긴다. 이 쿠키는 폴백일 뿐이다
 *     (`lib/current-user.ts`).
 *
 * ── 제거 방법 ─────────────────────────────────────────────────────────────
 *  1. `lib/current-user.ts` 에서 `resolveDevIdentity` 폴백 블록 두 곳
 *     (`getCurrentUserIdFromRequest` · `useCurrentUser`)과 그 import 를 지운다.
 *  2. `components/shell/dev-role-switch.tsx` 를 제거한다(그 파일 머리주석 참고).
 *  3. 이 파일과 `lib/__tests__/dev-identity.test.ts` 를 지운다.
 *  그 외 어떤 파일도 이 모듈을 참조하지 않는다.
 * ═════════════════════════════════════════════════════════════════════════ */

/** 개발용 신원 쿠키 이름 — 값은 아래 allowlist 의 id 문자열 하나. */
export const DEV_IDENTITY_COOKIE = 'pullim_dev_identity';

/**
 * 데모 역할 union.
 *
 * `packages/types` 의 `UserRole`('student' | 'teacher' | 'admin')과 **다르다** —
 * 그쪽은 BE 와 공유하는 계약이라 이 앱 사정으로 넓히지 않는다. 학부모 화면은
 * 이 앱에만 있으므로 여기서만 'parent' 를 얹는다.
 */
export type DevIdentityRole = 'student' | 'teacher' | 'parent';

export interface DevIdentity {
  /** 도메인 users.id — 라이브 데모 DB 의 실제 행. */
  id: string;
  /** 표시 이름. */
  name: string;
  role: DevIdentityRole;
  /** 드롭다운 등에 그대로 쓰는 사람이 읽는 라벨(예: `학생 · 서연`). */
  label: string;
}

/**
 * 사칭 가능한 데모 사용자 **전부**. 이 목록 밖의 값은 조용히 무시된다.
 * (라이브 데모 데이터 실측 — 계약 §2)
 */
export const DEV_IDENTITIES: readonly DevIdentity[] = [
  { id: 'student_001', name: '서연', role: 'student', label: '학생 · 서연' },
  { id: 's2', name: '민준', role: 'student', label: '학생 · 민준' },
  { id: 'teacher_001', name: '김수학', role: 'teacher', label: '교사 · 김수학' },
  { id: 'teacher_002', name: '박영어', role: 'teacher', label: '교사 · 박영어' },
  { id: 'parent_001', name: '어머니', role: 'parent', label: '학부모 · 어머니' },
] as const;

/**
 * prod 호스트. `components/shell/dev-role-switch.tsx` 의 PROD_HOST 와 **같은 기준**이며,
 * 그쪽 주석의 근거를 그대로 따른다:
 *
 * `process.env.NODE_ENV !== 'production'` 으로 가르지 않은 이유 — Vercel 은 preview
 * 빌드(dev-classbot.pullim.ai)도 **NODE_ENV='production' 으로 돌린다.** NODE_ENV 기준이면
 * 정작 이 장치가 필요한 dev preview 에서 신원이 사라져 preview 전체가 401 이 된다.
 * 빌드·배포 설정을 건드리지 않는 제약이라 **런타임 호스트 검사**로 가른다 —
 * localhost·dev preview 는 인정, prod 는 무력.
 */
const PROD_HOST = 'classbot.pullim.ai';

/**
 * 이 호스트에서 개발용 신원을 인정해도 되는가.
 * @param host - 요청 `Host` 헤더(포트 포함 가능) 또는 `window.location.host`
 * @returns prod 호스트면 false, 그 밖(localhost · dev preview · 미지정)이면 true
 */
export function isDevIdentityHost(host: string | null | undefined): boolean {
  if (!host) return true;
  // `localhost:3032` 처럼 포트가 붙어 온다 — 호스트명만 떼어 비교한다.
  const hostname = host.trim().toLowerCase().split(':')[0] ?? '';
  return hostname !== PROD_HOST;
}

/**
 * allowlist 조회. 목록 밖 id 는 null.
 * @param id - 쿠키에 담긴 사용자 id
 * @returns 해당 데모 사용자 또는 null
 */
export function findDevIdentity(id: string | null | undefined): DevIdentity | null {
  if (!id) return null;
  return DEV_IDENTITIES.find((identity) => identity.id === id) ?? null;
}

/**
 * `Cookie` 헤더에서 이름 하나를 꺼낸다.
 *
 * 의존성을 새로 들이지 않으려고 직접 파싱한다. `a=1; b=2` 형태를 `;` 로 자르고
 * **첫 `=` 기준**으로 이름/값을 가른다(값에 `=` 가 들어 있어도 안전).
 */
function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      // 잘못 인코딩된 값 — 원문 그대로 한 번 더 allowlist 에 대 본다.
      return raw;
    }
  }
  return null;
}

/**
 * 요청에서 개발용 신원을 해석한다(서버·클라이언트 공용).
 *
 * **prod 호스트면 쿠키를 아예 읽지 않고 null** 이다. 목록 밖 id 도 null 이라
 * 호출부는 기존 데모 폴백으로 떨어진다.
 *
 * @param cookieHeader - 요청 `Cookie` 헤더 전문(또는 `document.cookie`)
 * @param host - 요청 `Host` 헤더(또는 `window.location.host`)
 * @returns allowlist 에 있는 데모 사용자 또는 null
 */
export function resolveDevIdentity(
  cookieHeader: string | null | undefined,
  host: string | null | undefined,
): DevIdentity | null {
  if (!isDevIdentityHost(host)) return null;
  return findDevIdentity(readCookieValue(cookieHeader, DEV_IDENTITY_COOKIE));
}

/** 쿠키 수명 — 7일. 데모 세션이 하루를 넘겨도 유지되되 영구는 아니게. */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * 브라우저에서 현재 개발용 신원을 읽는다.
 * SSR(`document` 없음)에서는 항상 null — 하이드레이션 불일치를 만들지 않기 위해서다.
 * @returns 현재 데모 사용자 또는 null
 */
export function readDevIdentityCookie(): DevIdentity | null {
  if (typeof document === 'undefined') return null;
  return resolveDevIdentity(document.cookie, window.location.host);
}

/**
 * 브라우저에서 개발용 신원을 쓴다. allowlist 밖 id 는 **쓰지 않는다.**
 * prod 호스트에서도 쓰지 않는다(서버가 어차피 무시하지만, 흔적조차 남기지 않는다).
 * @param id - allowlist 의 사용자 id
 */
export function writeDevIdentityCookie(id: string): void {
  if (typeof document === 'undefined') return;
  if (!isDevIdentityHost(window.location.host)) return;
  if (!findDevIdentity(id)) return;
  document.cookie = `${DEV_IDENTITY_COOKIE}=${encodeURIComponent(id)}; path=/; SameSite=Lax; max-age=${COOKIE_MAX_AGE_SEC}`;
}

/** 개발용 신원을 지운다(데모 종료·정식 로그인 확인용). */
export function clearDevIdentityCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEV_IDENTITY_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
}
