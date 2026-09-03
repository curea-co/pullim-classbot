/**
 * 라우트 가드 공용부 — 신원 해석과 오류 봉투를 한 곳에 모은다 (계약 §4).
 *
 * 가드 순서는 정본(`app/api/teacher/bots/route.ts`)을 그대로 따른다:
 *  미인증 401 `AUTH_REQUIRED` → 역할 불일치 403 `FORBIDDEN_ROLE` → 입력 오류 400 `INVALID_INPUT`
 *  → 없음 404 `NOT_FOUND` → 충돌 409 `CONFLICT`.
 *
 * ⚠️ **403 은 역할 불일치에만 쓴다.** "남의 반" 은 403 이 아니라 **404** 다 —
 * 403 은 "그 id 는 있는데 네 것이 아니다" 를 알려 줘서 남의 반이 존재한다는 사실이 새 나간다.
 * 소유권은 조회 조건에 넣어(`and(eq(id), eq(teacherId, 나))`) 0행이면 404 로 답한다.
 * `app/api/assignments/[id]/route.ts` 가 학생 쪽에서 쓰는 것과 같은 규약이다.
 *
 * 역할을 왜 도메인 `users.role` 로 다시 확인하나:
 *  - 공유 `UserRole` 타입에는 아직 `parent` 가 없다(student/teacher/admin). 그래서 JWT claim
 *    만으로는 학부모를 식별할 수 없고, 학부모 라우트가 영영 열리지 않는다.
 *  - `users` 는 이 앱 도메인의 역할 권위다. 행이 있으면 그 값을 쓰고, 없으면(가입 직후 등)
 *    토큰 claim 으로 떨어진다. 토큰이 teacher 라 해도 도메인 행이 student 면 막힌다 —
 *    느슨해지는 방향이 아니라 조여지는 방향이라 안전하다.
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 Next.js App Router 의 라우트 세그먼트에서 제외된다
 * (private folder). 여기 파일은 URL 을 만들지 않는다.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';

/** 도메인 역할 — `users.role`(student/teacher/parent) + 토큰 claim 의 admin. */
export type ActorRole = 'student' | 'teacher' | 'parent' | 'admin';

/** 요청을 보낸 사람. */
export interface Actor {
  /** 도메인 users.id — 쓰기 명의는 항상 이 값이다(요청 본문 id 를 절대 믿지 않는다). */
  id: string;
  role: ActorRole;
  /**
   * 그 사용자 **명의로** 처리해도 되는가 — JWT 세션이거나, prod 가 아닌 곳의 allowlist
   * 개발 신원(`lib/dev-identity.ts`). 「인증됐나」(`isAuthenticated`)와 이름을 가른 이유는
   * `lib/current-user.ts` 머리주석에 있다 — 개발 쿠키는 인증이 아니라 명의다.
   */
  isIdentified: boolean;
}

/**
 * 요청에서 행위자를 해석한다 — 신원은 토큰/dev 쿠키, 역할은 도메인 `users` 가 권위.
 *
 * @param req - Next.js Request
 * @returns 행위자(신원이 없으면 `isIdentified:false`)
 */
export async function resolveActor(req: Request): Promise<Actor> {
  const { id, role, isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return { id, role, isIdentified: false };

  const [row] = await getDb()
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return { id, role: row?.role ?? role, isIdentified: true };
}

/** 401 — 로그인이 필요하다. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
    { status: 401 },
  );
}

/**
 * 403 — **역할**이 안 맞는다(학생이 교사 기능을 치는 등).
 * 남의 리소스는 여기가 아니라 `notFound()` 로 답한다(존재 노출 차단).
 */
export function forbidden(message: string): NextResponse {
  return NextResponse.json({ message, code: 'FORBIDDEN_ROLE' }, { status: 403 });
}

/** 400 — 본문이 계약과 다르다. */
export function invalidInput(message: string): NextResponse {
  return NextResponse.json({ message, code: 'INVALID_INPUT' }, { status: 400 });
}

/** 404 — 그런 건 없다(남의 것 존재 노출도 이걸로 덮는다). */
export function notFound(message: string): NextResponse {
  return NextResponse.json({ message, code: 'NOT_FOUND' }, { status: 404 });
}

/** 409 — 지금 상태로는 할 수 없다(코드 포화 · 짝 없는 반 등). */
export function conflict(message: string): NextResponse {
  return NextResponse.json({ message, code: 'CONFLICT' }, { status: 409 });
}

/**
 * 요청 본문을 JSON 으로 읽는다 — 못 읽으면 null(호출부가 400 으로 옮긴다).
 * @param req - Next.js Request
 * @returns 파싱된 객체 또는 null
 */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 문자열 필드를 다듬어 꺼낸다 — 문자열이 아니면 빈 문자열. */
export function readTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
