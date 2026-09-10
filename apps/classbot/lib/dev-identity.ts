/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ 개발 전용 신원 · 정식 오픈 전 제거 ⚠️
 *
 * **이것은 인증이 아니다.** 서명도 만료도 없는 평문 쿠키 한 줄일 뿐이라,
 * 값을 손으로 바꾸면 아래 allowlist 안의 다른 데모 사용자로 그냥 바뀐다.
 * 정식 인증(JWT · 풀림 통합 계정)을 **대체하지 않으며, 그보다 항상 뒤에 온다.**
 *
 * 왜 두는가: classbot 로컬에는 `JWT_SECRET` 이 없고 로그인은 실행되지 않는
 * NestJS(:4032)로 간다 → 로컬에서 모든 `/api/*` 가 401 이라 데모가 아예 안 돈다.
 * 그래서 **아는 개발 호스트에서만** 이 쿠키를 신원으로 인정한다.
 *
 * 안전 장치 셋:
 *  1. **호스트 허용 목록 + fail-closed** — 로컬·preview 같이 **아는 이름에서만** 인정하고,
 *     production 배포면 어떤 주소로 닿든 무력이다(`isDevIdentityHost`). Host 를 모르면
 *     막는다 — 신원을 세우는 판정이라 「모른다」를 「괜찮다」로 읽지 않는다.
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
 * 개발용 신원을 인정하는 **호스트 허용 목록**.
 *
 * 종전에는 `classbot.pullim.ai` 하나만 막는 **거부 목록**이었다. 그게 구멍이었다 —
 * prod 데이터를 쓰는 배포는 그 이름으로만 닿는 게 아니다. Vercel 은 production 배포에도
 * `*.vercel.app` URL 을 주므로, 그 주소로 들어가 쿠키만 심으면 `parent_001` · `teacher_001`
 * 명의가 그대로 섰다. 그래서 **아는 이름만 연다**(모르는 이름은 전부 닫힌다).
 */
const DEV_IDENTITY_HOSTNAMES: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '::1',
  /** dev preview 고정 도메인 — 외부 차단된 미리보기다. */
  'dev-classbot.pullim.ai',
];

/**
 * PR 별 Vercel preview 도메인 접미사.
 *
 * **이 접미사만으로는 안전하지 않다** — production 배포도 같은 접미사를 받는다. 그래서
 * 아래 판정은 이 접미사를 「배포 환경이 preview 라고 확인됐을 때만」 연다. 접미사를 여는
 * 이유는 PR 미리보기에서 역할 전환이 죽으면 개발 흐름이 상하기 때문이다.
 */
const PREVIEW_HOSTNAME_SUFFIX = '.vercel.app';

/**
 * `Host` 헤더에서 호스트명만 뗀다.
 * @param host - `localhost:3032` · `[::1]:3032` 처럼 포트가 붙어 올 수 있다
 * @returns 소문자 호스트명. 형태가 깨졌으면 빈 문자열
 */
function hostnameOf(host: string): string {
  const trimmed = host.trim().toLowerCase();
  // IPv6 는 `[::1]:3032` 로 온다 — `:` 로 자르면 `[` 만 남는다.
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return end < 0 ? '' : trimmed.slice(1, end);
  }
  return trimmed.split(':')[0] ?? '';
}

/**
 * 배포 환경 — `production` · `preview` · `development` 중 하나이거나, 모르면 undefined.
 *
 * **서버 전용 `VERCEL_ENV` 가 먼저다.** 이 판정은 서버(`lib/current-user.ts`)에서 신원을
 * 세우는 데 쓰이므로, 권한 판정의 근거는 **빌드 때 치환되지 않고 런타임에 서버가 직접 읽는**
 * 값이어야 한다. 클라이언트 번들에는 이 이름이 남아도 값이 없어 undefined 로 접힌다.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` 는 **클라이언트 쪽 출처**다. 브라우저에는 서버 전용 값이
 * 없어서인데, 그 값은 Vercel 프로젝트 설정에 기대지 않는다 — `next.config.ts` 가 빌드 때
 * `VERCEL_ENV` 를 이 이름으로 실어 보낸다(그 파일 주석 참고). 그래서 **두 층이 같은
 * 출처를 읽는다.**
 *
 * 그래도 값이 비어 올 수 있다(로컬 개발 · Vercel 밖 배포). 그때 아래 판정은
 * **닫히는 쪽**으로 접힌다 — 열리는 쪽으로 접히면 이 파일이 막으려던 구멍이 되살아난다.
 */
function deploymentEnv(): string | undefined {
  return process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;
}

/**
 * 이 호스트에서 개발용 신원을 인정해도 되는가.
 *
 * **모르면 닫는다(fail-closed).** 종전에는 `Host` 를 모를 때 통과였는데, 이 장치에서
 * fail-open 은 그 자체로 사고다 — 신원을 세우는 판정이라 「모른다」는 「괜찮다」가 아니다.
 * 같은 이유로 **배포 환경을 모를 때도 닫는다.** 환경변수가 없을 때 열리는 설계였다면
 * 그 변수가 빠지는 순간 이 파일이 막으려던 구멍이 조용히 되살아난다.
 *
 * `NODE_ENV` 로 가르지 않은 이유는 그대로다 — Vercel 은 preview 빌드도
 * `NODE_ENV='production'` 으로 돌려서, 그 기준이면 정작 이 장치가 필요한 preview 에서
 * 신원이 사라져 전체가 401 이 된다. 대신 **배포 환경**(`deploymentEnv()`)을 본다.
 *
 * @param host - 요청 `Host` 헤더(포트 포함 가능) 또는 `window.location.host`
 * @returns 허용 목록 안이고 production 배포가 아니면 true, 그 밖은 전부 false
 */
export function isDevIdentityHost(host: string | null | undefined): boolean {
  const env = deploymentEnv();
  // 이름에 기대지 않는 방어선 — production 배포면 어떤 주소로 닿든, `Host` 를 무엇으로
  // 위조하든 무력이다.
  if (env === 'production') return false;
  if (!host) return false;
  const hostname = hostnameOf(host);
  if (!hostname) return false;
  // `*.vercel.app` 은 **preview 라고 확인됐을 때만** 연다.
  //
  // 이 접미사는 production 배포도 받는다 — 그래서 「이름을 열어 두고 production 검사로
  // 거른다」는 순서면 환경변수가 없을 때 production 기본 URL 이 그대로 통과한다.
  // 순서를 뒤집어 **positive 확인**으로 둔다: 모르면(undefined) 닫힌다.
  // `.` 까지 포함해 비교하므로 `notvercel.app` · `vercel.app.attacker.com` 은 안 걸린다.
  if (hostname.endsWith(PREVIEW_HOSTNAME_SUFFIX)) return env === 'preview';
  return DEV_IDENTITY_HOSTNAMES.includes(hostname);
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
 * **허용 목록 밖 호스트·production 배포면 쿠키를 아예 읽지 않고 null** 이다. 목록 밖 id 도 null 이라
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
 * 허용 목록 밖 호스트·production 배포에서도 쓰지 않는다(서버가 어차피 무시하지만, 흔적조차 남기지 않는다).
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
