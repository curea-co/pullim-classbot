/**
 * `/api/*` 가 공유하는 신원·역할 가드.
 *
 * 가드는 **두 질문을 순서대로** 묻는다.
 *  1. **누구인지 아는가** (`isIdentified`) — JWT 세션이거나, prod 가 아닌 곳의 allowlist
 *     개발 신원(`lib/dev-identity.ts`). 모르면 401.
 *  2. **그 역할이 이 표면을 쓸 수 있는가** — 아니면 403.
 *
 * 둘을 갈라 두는 이유: 개발용 신원이 생기면서 서버가 돌려주는 role 이 셋(학생·교사·학부모)이
 * 됐다. 1번만 물으면 **학부모 명의로 학생 본인 표면**(`/api/assignments` · `/api/grades` ·
 * `/api/wellness` …)에 들어와 200 이나 빈 목록을 받는다. 「데이터가 없어서 비어 있다」와
 * 「그 역할은 볼 수 없다」는 전혀 다른 계약이라, 후자는 403 으로 말해야 한다.
 * 학부모의 자녀 열람은 별도 표면(`/parent/*`)에서 자녀 매칭·동의를 거쳐 온다
 * (`proc/spec/05 § 11.2` · `§ 11.4`).
 */

import { NextResponse } from 'next/server';

import type { AppUserRole } from '@/lib/current-user';

/** `getCurrentUserIdFromRequest(req)` 가 돌려주는 요청 주체. */
export interface Actor {
  id: string;
  role: AppUserRole;
  /** 실제 로그인 세션(JWT)인가 — 개발용 쿠키는 여기 들어오지 않는다. */
  isAuthenticated: boolean;
  /** 그 사용자 명의로 처리해도 되는가 — 가드가 먼저 보는 값. */
  isIdentified: boolean;
}

/**
 * 신원과 역할을 함께 판정한다.
 * @param actor - 요청 주체
 * @param allowed - 통과시킬 역할
 * @param forbiddenMessage - 403 본문에 담을 안내
 * @returns 막아야 하면 응답, 통과면 null
 */
export function denyUnlessRole(
  actor: Actor,
  allowed: readonly AppUserRole[],
  forbiddenMessage: string,
): NextResponse | null {
  if (!actor.isIdentified) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }
  if (!allowed.includes(actor.role)) {
    return NextResponse.json(
      { message: forbiddenMessage, code: 'FORBIDDEN_ROLE' },
      { status: 403 },
    );
  }
  return null;
}

/** 학생 본인 표면 — 교사·학부모·admin 은 여기로 들어오지 않는다. */
export function denyUnlessStudent(actor: Actor): NextResponse | null {
  return denyUnlessRole(actor, ['student'], '학생만 쓸 수 있는 기능입니다.');
}
