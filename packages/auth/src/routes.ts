// ============================================================================
// 역할별 라우팅 — 로그인/회원가입 성공 후 진입 홈을 결정한다.
// classbot 라우트 그룹: (student) → /classbot, (teacher) → /teacher.
// ============================================================================

import type { UserRole } from "@pullim-classbot/types";

/** 학생 홈 경로. */
export const STUDENT_HOME = "/classbot";
/** 교사 홈 경로. */
export const TEACHER_HOME = "/teacher";

/**
 * 역할에 따른 초기 진입 경로를 반환한다.
 * @param role - 사용자 역할
 * @returns 역할별 홈 경로 (admin 은 우선 교사 홈으로 — FE 운영 화면 미도입)
 */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "teacher":
      return TEACHER_HOME;
    case "student":
      return STUDENT_HOME;
    case "admin":
      // GATED: 운영자 전용 화면 미도입. 임시로 교사 홈으로 안내.
      return TEACHER_HOME;
    default:
      return STUDENT_HOME;
  }
}
