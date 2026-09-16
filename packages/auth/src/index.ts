// ============================================================================
// @pullim-classbot/auth — 인증 provider 추상화.
//
// 구현체는 이 패키지에 없다. classbot 은 풀림 OS SSO 에 인가를 맡기고, 그 구현은
// `apps/classbot/lib/auth/os-sso-provider.ts` 의 `OsSsoAuthProvider` 가 이 계약
// (`IAuthProvider`)을 채운다. 종전의 `authService`·`ApiAuthProvider`(classbot 자체
// 이메일/비밀번호 + JWT)는 폐기됐다.
// ============================================================================

export type { AuthUser, IAuthProvider } from "./types";
export { AuthError } from "./types";
export { homePathForRole, STUDENT_HOME, TEACHER_HOME } from "./routes";
