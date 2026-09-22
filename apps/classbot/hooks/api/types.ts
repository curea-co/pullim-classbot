/**
 * 같은 오리진 `/api/*` 응답 타입 — 화면이 읽는 입구.
 *
 * *(`[계획 PR 8 정정]` 과제 발사·참여·내 수업방 라우트가 걷히면서 그 재수출
 * (`EnrollmentRow` · `JoinByCode*` · `MyClassroomsResponse` · `TeacherAssignmentsResponse` ·
 * `ClassroomRow` · `ClassBotRow`)도 소비자가 0 이 되어 걷었다. `AssignmentRow` ·
 * `StudentClassroomItem` 은 남는다 — 라우트가 아니라 화면·학부모 읽기가 아직 읽는다. 계약 자체가 남은 것은 `contract-types.ts` 에서 직접 읽는다.)*
 *
 * 정의 자체는 `app/api/_lib/contract-types.ts`(서버가 계약을 소유) 한 곳에 있고,
 * 여기서는 그대로 다시 내보낸다. 타입만 있는 모듈이라 `import type` 으로 사라진다 —
 * 이걸 import 한다고 서버 모듈이 클라이언트 번들로 딸려 오지 않는다.
 */

export type {
  AddSelfBotInput,
  AddSelfBotResponse,
  AssignmentRow,
  BackfillStudyDaysInput,
  BackfillStudyDaysResponse,
  MarketplaceBotItem,
  MarketplaceBotResponse,
  MarketplaceBotsResponse,
  MySelfBotsResponse,
  MyStudyDaysResponse,
  ParentAssignmentItem,
  ParentChildItem,
  ParentChildrenResponse,
  ParentSelfStudyBot,
  ParentSelfStudyChild,
  ParentSelfStudyResponse,
  ParentSelfStudyStreak,
  PublishBotInput,
  PublishBotResponse,
  RecordStudyDayInput,
  RecordStudyDayResponse,
  RemoveSelfBotResponse,
  StudentClassroomItem,
  TeacherClassroomItem,
  TeacherClassroomsResponse,
} from '@/app/api/_lib/contract-types';
