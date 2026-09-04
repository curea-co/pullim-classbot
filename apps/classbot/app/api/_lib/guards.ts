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

/**
 * 공용 목록 표면의 **시점** — 「누구 것을 달라는 요청인가」.
 *
 * 스펙은 목록 둘을 학생·교사가 **같은 경로에 나눠 쓰도록** 정의했다
 * (`proc/spec/2026-05-18_be-api-design.md` § 4.2 `GET /api/bots?role=…` ·
 * § 4.5 `GET /api/assignments?audience=…`). 그러니 이 두 라우트에서 역할을 학생으로
 * 못박아 버리면 교사 시점이 **구현 여부와 무관하게** 닫혀 계약이 사라진다.
 * 대신 파라미터를 읽고 **부르는 사람이 그 시점의 주인인지**를 본다.
 */
export type Audience = 'student' | 'teacher';

/** 시점 파라미터 이름 — 두 라우트가 서로 다른 이름을 쓴다(스펙 그대로). */
export type AudienceParam = 'role' | 'audience';

/**
 * 시점을 정하고 그 시점의 주인인지 판정한다.
 *
 * 파라미터를 생략하면 **학생 시점**이다 — 지금 이 두 라우트를 부르는 화면이 전부 학생이고
 * 종전 동작이 그것이라, 생략 호출의 뜻을 이 PR 이 바꾸지 않는다.
 *
 * @param req - 요청(쿼리에서 시점을 읽는다)
 * @param param - 시점 파라미터 이름
 * @param actor - 요청 주체
 * @returns 막아야 하면 `{ deny }`, 통과면 `{ deny: null, audience }`
 */
export function gateAudience(
  req: Request,
  param: AudienceParam,
  actor: Actor,
): { deny: NextResponse } | { deny: null; audience: Audience } {
  const raw = new URL(req.url).searchParams.get(param);
  if (raw !== null && raw !== '' && raw !== 'student' && raw !== 'teacher') {
    return {
      deny: NextResponse.json(
        { message: `${param} 은 student 나 teacher 여야 합니다.`, code: 'INVALID_AUDIENCE' },
        { status: 400 },
      ),
    };
  }
  const audience: Audience = raw === 'teacher' ? 'teacher' : 'student';
  // 남의 시점을 달라고 할 수 없다 — 교사가 `student` 를, 학생이 `teacher` 를 부르면 403.
  // 학부모·admin 은 어느 시점의 주인도 아니라 여기서 전부 걸린다.
  const denied = denyUnlessRole(
    actor,
    [audience],
    `${audience === 'teacher' ? '교사' : '학생'}만 쓸 수 있는 기능입니다.`,
  );
  return denied ? { deny: denied } : { deny: null, audience };
}

/**
 * 계약에는 있으나 이 라우트가 **아직 구현하지 않은** 시점.
 *
 * 빈 목록 200 으로 답하지 않는다 — 「네 것이 없다」와 「아직 안 만들었다」는 다른 말이고,
 * 전자로 답하면 교사 화면이 붙는 날까지 그 차이가 숨는다.
 * @param what - 무엇이 아직 없는지(응답 본문에 그대로 실린다)
 */
export function notImplementedAudience(what: string): NextResponse {
  return NextResponse.json(
    { message: `${what}은 아직 준비 중입니다.`, code: 'NOT_IMPLEMENTED' },
    { status: 501 },
  );
}
