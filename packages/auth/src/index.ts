// ============================================================================
// @pullim-classbot/auth — 인증 추상화 + classbot BE 연동 Provider.
// 본체 pullim packages/auth 패턴: IAuthProvider / authService / ApiAuthProvider.
// ============================================================================

export type { AuthUser, IAuthProvider } from "./types";
export { AuthError } from "./types";
export { authService } from "./service";
export { ApiAuthProvider } from "./providers/api";
export { homePathForRole, STUDENT_HOME, TEACHER_HOME } from "./routes";
