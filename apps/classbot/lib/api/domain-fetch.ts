/**
 * 도메인 fetch — classbot BE(:4032, `NEXT_PUBLIC_API_URL`) 도메인 라우트를 친다.
 *
 * Ph7 코어 스토어 전환(`USE_REAL_CORE_BE`)용 얇은 헬퍼. `lib/api/read-fetch.ts` 는
 * **같은 오리진 Next route handler**(`/api/*`) 전용이라 별도 헬퍼가 필요하다 —
 * 이쪽은 `@pullim-classbot/api-client` 의 `BASE_URL`(NestJS BE) 로 간다.
 *
 * 신원 규약 (M2 개정 §3 — JWT 우선 + `x-user-id` 폴백, 무신원 401):
 *  - **인증 사용자**(토큰 보유): `authRequest`(Bearer 자동 첨부 + 401 refresh) 경로.
 *  - **미인증 데모**: `x-user-id` 헤더로 도메인 사용자 키를 전송.
 *    학생 키는 개입 수신자 규약(`resolveRosterMe`)과 동일한 roster 브리지를 거친 뒤
 *    **DB seed 변환**(scripts/seed.ts: roster `s1`(서연) ↔ 도메인 `student_001`)을
 *    적용한다 — seed 는 s1 만 student_001 로 치환해 적재하므로, raw roster 키(s1)를
 *    보내면 BE `findUserById` 가 실패(401 알 수 없는 사용자)한다. 매핑은 s1 1건뿐이라
 *    s2~s18 은 그대로 통과 — 제출/enrollment 조인 정합이 유지된다.
 */

import { ApiError, BASE_URL, authRequest, tokenManager } from '@pullim-classbot/api-client';

import { DEMO_FALLBACK_USER_ID, resolveRosterMe } from '@/lib/current-user';

/** 데모 교사 표면의 도메인 id — mock `currentTeacher`(김수학) 의 seed id. */
export const DEMO_TEACHER_ID = 'teacher_001';

/**
 * 데모 "나"(서연) 의 roster id — seed 에서 유일하게 도메인 id 로 치환되는 키.
 * 모듈 로드 시점이 아니라 호출 시점에 해석한다 — `@/lib/current-user` 를 부분 mock
 * 하는 기존 테스트(예: replay-detail)가 이 모듈을 간접 import 해도 깨지지 않도록.
 */
function demoRosterId(): string {
  return resolveRosterMe(DEMO_FALLBACK_USER_ID).id;
}

/**
 * FE roster 학생 키 → BE 도메인 user id (seed 변환: s1 → student_001).
 * @param rosterOrUserId - roster id(s1..s18) 또는 도메인 user id
 * @returns BE users 테이블과 조인 가능한 도메인 id
 */
export function toDomainUserId(rosterOrUserId: string): string {
  return rosterOrUserId === demoRosterId() ? DEMO_FALLBACK_USER_ID : rosterOrUserId;
}

/**
 * BE 도메인 user id → FE roster 학생 키 (역변환: student_001 → s1).
 * BE 응답을 roster 키로 조인하는 기존 FE 읽기 경로(벨 인박스·제출 시트)와 정합.
 * @param domainId - BE 도메인 user id
 * @returns FE roster 키
 */
export function fromDomainUserId(domainId: string): string {
  return domainId === DEMO_FALLBACK_USER_ID ? demoRosterId() : domainId;
}

/**
 * 미인증 데모 학생의 `x-user-id` 명의 — 개입 수신자 규약(resolveRosterMe)으로
 * roster 행을 해석한 뒤 seed 변환을 적용한다.
 * @param currentUserId - 현재 사용자 id (기본: 데모 폴백 student_001)
 * @returns BE 도메인 user id
 */
export function demoStudentDomainId(currentUserId: string = DEMO_FALLBACK_USER_ID): string {
  return toDomainUserId(resolveRosterMe(currentUserId).id);
}

interface DomainFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** 미인증(토큰 없음) 요청의 `x-user-id` 명의. 인증 요청에서는 무시된다. */
  demoUserId: string;
}

/** 도메인 라우트 에러 봉투 — spec §3 `{ error: { code, message } }`. */
interface DomainErrorBody {
  error?: { code?: string; message?: string };
  /** NestJS 기본형 폴백. */
  message?: string | string[];
}

/**
 * classbot BE 도메인 라우트를 호출한다.
 *
 * @param path - `/enrollments` 같은 BASE_URL 상대 경로 (BASE_URL 이 `/api` 포함)
 * @param options - method/body + 데모 명의
 * @returns 파싱된 JSON 본문
 * @throws {ApiError} 비정상 응답 (status + 도메인 봉투 message/code)
 */
export async function domainFetch<T>(path: string, options: DomainFetchOptions): Promise<T> {
  const { method = 'GET', body, demoUserId } = options;

  // 인증 사용자 — Bearer 자동 첨부 + 401 refresh (api-client 경로).
  if (tokenManager.getAccessToken()) {
    return authRequest<T>(path, { method, body });
  }

  // 미인증 데모 — x-user-id 폴백 (Ph7 과도기 규약).
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': demoUserId,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  // 본문이 비었거나 JSON 이 아닐 수 있으므로 방어적으로 파싱 (auth-fetch 계약).
  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as DomainErrorBody;
    const message =
      err.error?.message ??
      (Array.isArray(err.message) ? err.message.join(', ') : err.message) ??
      `HTTP ${res.status}`;
    throw new ApiError(message, res.status, err.error?.code);
  }

  return json as T;
}
