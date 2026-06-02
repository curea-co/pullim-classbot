/**
 * 클래스봇 사용자 역할.
 * 핸드오프 권위(07_풀림_클래스봇_핸드오프.md): P1 교사 중심 / P2 학생.
 * Drizzle `users.role`이 이미 student/teacher/parent 이므로 인증 진입 주체인
 * student/teacher 를 정본으로 채택. parent(보호자)는 인증 진입 주체가 아니라 제외(향후 추가).
 * admin 은 운영자용 예약값(현 FE 미사용).
 * 본체 pullim UserRole(user/admin)과의 union 정렬은 서브도메인 병합 시 수행(plan 참조).
 */
export enum UserRole {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}
