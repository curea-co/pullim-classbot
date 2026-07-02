/**
 * 도메인 fetch — classbot BE(:4032, `NEXT_PUBLIC_API_URL`) 도메인 라우트를 친다.
 *
 * Ph7 코어 스토어 전환(`USE_REAL_CORE_BE`)용 얇은 헬퍼. `lib/api/read-fetch.ts` 는
 * **같은 오리진 Next route handler**(`/api/*`) 전용이라 별도 헬퍼가 필요하다 —
 * 이쪽은 `@pullim-classbot/api-client` 의 `BASE_URL`(NestJS BE) 로 간다.
 *
 * 신원 규약 (M2 개정 §3 — JWT 우선 + `x-user-id` 폴백, 무신원 401):
 *  - **인증 사용자**(앱 인증 세션 = 디코더블 access token, `getAuthUserSnapshot`):
 *    `authRequest`(Bearer 자동 첨부 + 401 refresh) 경로만. 401 도 데모로 폴백하지 않고
 *    전파한다 — 인증 사용자의 요청이 데모 명의로 오귀속되는 것을 차단(Codex #196 R2 ①).
 *  - **미인증 데모**: `x-user-id` 헤더로 도메인 사용자 키를 전송. 잔여(비-디코더블)
 *    토큰으로 authRequest 가 401 로 끝나면 데모 경로로 1회 폴백한다 — 폴백은
 *    호출부가 `demoUserId` 를 전달한(= 앱 미인증) 경우에만 열린다.
 *    학생 키는 개입 수신자 규약(`resolveRosterMe`)과 동일한 roster 브리지를 거친 뒤
 *    **DB seed 변환**(scripts/seed.ts: roster `s1`(서연) ↔ 도메인 `student_001`)을
 *    적용한다 — seed 는 s1 만 student_001 로 치환해 적재하므로, raw roster 키(s1)를
 *    보내면 BE `findUserById` 가 실패(401 알 수 없는 사용자)한다. 매핑은 s1 1건뿐이라
 *    s2~s18 은 그대로 통과 — 제출/enrollment 조인 정합이 유지된다.
 */

import { useSyncExternalStore } from 'react';

import {
  ApiError,
  BASE_URL,
  authRequest,
  decodeAccessToken,
  tokenManager,
} from '@pullim-classbot/api-client';

import { DEMO_FALLBACK_USER_ID, resolveRosterMe } from '@/lib/current-user';
import { USE_REAL_CORE_BE } from '@/lib/features';

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
 * **미인증 데모** 읽기 경로 전용 — BE 응답을 roster 키로 조인하는 기존 FE 읽기
 * 경로(벨 인박스·제출 시트)와 정합. 인증 사용자 행은 raw user id 를 유지해야
 * 하므로 이 변환을 적용하지 않는다(Codex #196 R2 ②).
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

/**
 * 앱 인증 세션 스냅샷 (비훅) — `ApiAuthProvider.getSession` 과 동일한 파생
 * (**디코더블 access token 의 claim**). 스토어 액션·sync 훅처럼 React 컨텍스트
 * 밖(또는 AuthProvider 부재 테스트)에서 인증 여부를 판정하는 단일 지점이다.
 *
 * NOTE(OS SSO): 쿠키 세션(OS_SSO_ENABLED) 환경은 토큰이 없어 미인증으로 판정된다 —
 * Ph7(M2)은 자체 JWT auth 전제. SSO 통합 시 이 판정을 provider 세션으로 교체한다.
 * @returns 인증이면 { id }(JWT sub), 아니면 null
 */
export function getAuthUserSnapshot(): { id: string } | null {
  const token = tokenManager.getAccessToken();
  if (!token) return null;
  const payload = decodeAccessToken(token);
  return payload ? { id: payload.sub } : null;
}

/** 도메인 요청 명의 — 호출부가 x-user-id 전달 여부와 캐시/필터 키를 파생한다. */
export interface RequestIdentity {
  /** 앱 인증 세션 여부 — true 면 Bearer 전용(데모 폴백 금지). */
  isAuthenticated: boolean;
  /** 요청 사용자 키 — 인증: raw user id(sub), 데모: seed 도메인 키. 캐시 키로도 사용. */
  userId: string;
  /** domainFetch 에 넘길 데모 명의 — **미인증일 때만** 값이 있다 (Codex #196 R2 ①). */
  demoUserId: string | undefined;
}

/**
 * 학생 표면의 요청 신원 — 인증이면 raw user id(Bearer 전용), 미인증이면 데모 학생 키.
 * @returns RequestIdentity
 */
export function studentRequestIdentity(): RequestIdentity {
  const auth = getAuthUserSnapshot();
  if (auth) return { isAuthenticated: true, userId: auth.id, demoUserId: undefined };
  const demoId = demoStudentDomainId();
  return { isAuthenticated: false, userId: demoId, demoUserId: demoId };
}

/**
 * 교사 표면의 요청 신원 — 인증이면 raw user id(Bearer 전용), 미인증이면 데모 교사 키.
 * @returns RequestIdentity
 */
export function teacherRequestIdentity(): RequestIdentity {
  const auth = getAuthUserSnapshot();
  if (auth) return { isAuthenticated: true, userId: auth.id, demoUserId: undefined };
  return { isAuthenticated: false, userId: DEMO_TEACHER_ID, demoUserId: DEMO_TEACHER_ID };
}

/** 토큰 변경(로그인/로그아웃) 구독 — useSyncExternalStore subscribe 어댑터. */
function subscribeToTokenChange(callback: () => void): () => void {
  return tokenManager.onTokenChange(callback);
}

/**
 * Ph7 sync 훅용 resolved 학생 사용자 id (reactive) — 토큰 변경(로그인/로그아웃·
 * 사용자 전환)에 반응해 **같은 마운트에서도** effect 재실행(재동기화)을 트리거한다
 * (Codex #196 R3 ②). 플래그 OFF 면 상수('') — 신원 해석·재렌더 비용 0.
 * @returns resolved user id (인증: raw sub, 데모: seed 도메인 키, 플래그 OFF: '')
 */
export function useStudentSyncUserId(): string {
  return useSyncExternalStore(
    subscribeToTokenChange,
    () => (USE_REAL_CORE_BE ? studentRequestIdentity().userId : ''),
    () => '',
  );
}

interface DomainFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /**
   * 미인증 데모 요청의 `x-user-id` 명의. **앱이 미인증일 때만 전달할 것** —
   * 값이 없으면 인증 실패(401)도 데모로 폴백하지 않고 전파한다(오귀속 차단).
   */
  demoUserId?: string;
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
 * @param options - method/body + 데모 명의(미인증일 때만)
 * @returns 파싱된 JSON 본문
 * @throws {ApiError} 비정상 응답 (status + 도메인 봉투 message/code)
 */
export async function domainFetch<T>(path: string, options: DomainFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, demoUserId } = options;

  // 토큰 보유 — Bearer 자동 첨부 + 401 refresh (api-client 경로).
  if (tokenManager.getAccessToken()) {
    try {
      return await authRequest<T>(path, { method, body });
    } catch (e) {
      // 데모 폴백 게이트: 호출부가 demoUserId 를 전달한(= 앱 미인증) 요청의
      // 잔여 토큰 401 만 데모 x-user-id 경로로 1회 폴백한다. 인증 사용자의 401 과
      // 403/404 등 진짜 도메인 에러는 가리지 않고 전파(Codex #196 R1·R2 ①).
      const canFallback =
        demoUserId !== undefined && e instanceof ApiError && e.status === 401;
      if (!canFallback) {
        throw e;
      }
    }
  }

  // 미인증 데모 — x-user-id 폴백 (Ph7 과도기 규약).
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(demoUserId !== undefined ? { 'x-user-id': demoUserId } : {}),
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
