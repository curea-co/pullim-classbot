// ============================================================================
// 인증 추상화 — IAuthProvider 계약 (본체 pullim packages/auth 패턴).
// 구현체를 교체해도 앱 코드(AuthProvider 컨텍스트, 로그인 폼)는 바뀌지 않는다.
// ============================================================================

import type { UserRole } from "@pullim-classbot/types";

/** 인증된 사용자 정보 (FE 세션 모델). */
export interface AuthUser {
  id: string;
  email: string;
  /** student/teacher/admin. 역할별 라우팅·메뉴 분기에 사용. */
  role: UserRole;
  /**
   * **본인의 표시 이름** — 로그인한 그 사람 자신을 화면이 부를 때 쓰는 값이다.
   *
   * **무엇을 위한 칸인가 — 값을 나르기 위한 칸이 아니다.** 구현체가 세우는 세션 객체는 계약에
   * 칸이 없어도 이 값을 실어 보낼 수 있다. TypeScript 인터페이스는 런타임에서 아무것도 깎지
   * 않고, 컨텍스트는 그 객체를 참조 그대로 넘긴다. 칸이 필요한 쪽은 **읽는 쪽**이다 —
   * `AuthUser` 로 받은 세션에서 `user.name` 을 읽으려면 계약에 칸이 있어야 컴파일된다.
   *
   * ⛔ **본인-조회 한정 PII 다 — 넷을 지킨다.** 이 앱의 구현이 이 칸을 채우는 값은 pullim-api
   * `GET /me` 의 `name` 이고, 그 응답 DTO 가 「KCB 실명(users.name — AES-256-GCM 복호화 PII).
   * **본인-조회 한정 · 로그/토큰 금지.**」라고 못박아 두었다. 그러니 이 칸은
   *  ① **로그에 남기지 않는다** — `console.*` 도, 에러 메시지에 끼워 넣는 것도 금지.
   *  ② **서버로 되보내지 않는다** — 요청 명의는 세션 쿠키가 진다. 토큰에도 싣지 않는다.
   *  ③ **저장하지 않는다** — localStorage·sessionStorage·쿠키 어디에도.
   *  ④ **본인 화면 전용이다.**
   *
   * **남의 이름은 이 칸에서 오지 않는다.** 다른 사람의 이름은 auth 프로필 투영
   * (`ProfileProjection` 5필드, ADR-005)의 `displayName` 으로 온다 — 예컨대 반 명단 DTO 의
   * `displayName`(`apps/classbot/lib/api/classbot-dto.ts` 의 `ClassMemberDto`, `string | null` ·
   * 「auth 프로필 투영이라 비어 있을 수 있다(탈퇴·부재)」). **이 칸과 다른 값이다** —
   * 둘을 같은 것으로 읽지 마라.
   *
   * **왜 optional 인가.** 이름은 신원의 필수 부분이 아니다:
   *  - 이 계약은 구현체에게 이름을 **요구하지 않는다.** `getSession()`·`signInWithEmail()` 이
   *    id·email·role 만으로 세션을 세워도 계약은 지켜진 것이다.
   *  - 값을 대는 응답은 런타임 JSON 이라 타입 검사를 지나지 않는다 — 이 앱의 구현이
   *    `as MeResponse` 로 받으므로 칸이 아예 없는 응답도 타입이 막아 주지 않는다.
   *
   * **칸이 차 있어도 그것이 사람 이름이라는 보장은 없다 — 폴백이 필요한 진짜 이유가 이쪽이다.**
   * 이 앱의 구현은 `/me` 의 `name`(KCB 실명) → 비면 같은 응답의 `displayName` 순서로 채우는데,
   * 그 둘의 실제 값이 이렇다:
   *  - **KCB 를 지나지 않은 자가가입 회원**은 `users.name` 이 비어 서버가 `displayName` 으로
   *    떨어뜨리고, 그 `displayName` 은 가입 때 **email local-part 에서 파생**된 값이다 —
   *    `psh@…` 는 `psh` 로 선다.
   *  - **dev 시드 계정**은 복호된 이름이 글자 그대로 **`DevSeed`** 다(KCB 우회 더미 신원).
   *    QA 화면에 그렇게 보이는 것은 결함이 아니다.
   *
   * **그래서 읽는 쪽은 폴백을 가져야 한다.** 빈 문자열(`''`)도 「없음」과 같이 다뤄라 —
   * 화면에서 둘은 똑같은 빈칸이다. 이 앱에서 그 폴백이 설 자리는
   * `apps/classbot/lib/current-user.ts` 의 `useCurrentUser()` 다 — 그 읽기와 순서
   * (**이름 → 없으면 email 로컬파트**)는 이 칸에 기대는 FE 쪽이 세우고 테스트로 고정한다.
   * (이 칸만으로는 아직 아무 화면도 이름을 부르지 않는다 — 칸이 먼저 서는 것이 순서다.)
   */
  name?: string;
}

/**
 * Auth Provider 계약.
 *
 * 구현체는 이 패키지에 없다 — 현재 유일한 구현은 `apps/classbot` 의
 * `OsSsoAuthProvider` 이고, 세션 사용자는 pullim-api `/me`(OS 쿠키)에서 파생한다.
 *
 * *(종전 구현체 `ApiAuthProvider`(classbot 자체 BE 이메일/비번 + JWT claim 파생)는
 * 자체 인증과 함께 걷혔다.)*
 */
export interface IAuthProvider {
  /** 이메일/비밀번호 로그인. 실패 시 AuthError throw. */
  signInWithEmail(email: string, password: string): Promise<AuthUser>;
  /** 로그아웃. */
  signOut(): Promise<void>;
  /** 현재 세션 사용자 조회. 미로그인 시 null. */
  getSession(): Promise<AuthUser | null>;
  /**
   * 인증 상태 변경 구독.
   * @param callback - user 또는 null 을 받는 콜백 (구독 즉시 1회 호출)
   * @returns 구독 해제 함수
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

/** 인증 에러. code 로 원인을 구분한다. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
