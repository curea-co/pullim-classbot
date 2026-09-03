/**
 * 수업방·참여 코드·과제 API 응답 타입 — 화면이 읽는 입구.
 *
 * 정의 자체는 `app/api/_lib/contract-types.ts`(서버가 계약을 소유) 한 곳에 있고,
 * 여기서는 그대로 다시 내보낸다. 타입만 있는 모듈이라 `import type` 으로 사라진다 —
 * 이걸 import 한다고 서버 모듈이 클라이언트 번들로 딸려 오지 않는다.
 */

export type {
  AssignmentRow,
  ClassBotRow,
  ClassroomRow,
  ClassroomStudentItem,
  ClassroomStudentsResponse,
  CreateClassroomInput,
  CreateClassroomResponse,
  DispatchAssignmentInput,
  DispatchAssignmentResponse,
  EnrollmentRow,
  IssueJoinCodeResponse,
  JoinByCodeInput,
  JoinByCodeResponse,
  MarketplaceBotItem,
  MarketplaceBotResponse,
  MarketplaceBotsResponse,
  MyClassroomsResponse,
  ParentChildItem,
  ParentChildrenResponse,
  PublishBotInput,
  PublishBotResponse,
  StudentClassroomItem,
  TeacherAssignmentsResponse,
  TeacherClassroomItem,
  TeacherClassroomsResponse,
} from '@/app/api/_lib/contract-types';
