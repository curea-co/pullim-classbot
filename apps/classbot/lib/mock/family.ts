/**
 * 학생 ↔ 학부모 매핑 + 데이터 공유 동의 로그.
 *
 * 본 mock은 Phase 1(학생 Reports)에서 ConsentDialog 수신자 정보 표시·기록용으로 신규.
 * Phase 2(학부모 영역)에서 자녀 카드·승인 흐름에 재사용.
 *
 * spec 05 §5 RBAC — Assistant(학부모) 권한:
 *   - 리포트 열람 (자녀 동의 후)
 *   - 수정 요청 보내기 (48h 자동승인 — 본 plan에서는 단순 알림만)
 */

export type ParentRelation = 'mother' | 'father' | 'guardian';

export type Parent = {
  id: string;
  name: string;
  relation: ParentRelation;
  /** 카톡 전송용 (mock — 실제 전송 없음) */
  phone: string;
  /** 카카오 ID — 데모상 알림 채널 */
  kakaoId?: string;
};

export type ChildLink = {
  parentId: string;
  studentId: string;
  /** 주 보호자 여부 — 결제 의사결정자 */
  primary: boolean;
};

/**
 * 학생이 부모와 공유 동의한 데이터 종류.
 *
 * `lib/db/schema.ts` 의 `consent_logs.type` enum 배열과 **같은 값들**이다. 실제 DB 의
 * `type` 은 CHECK 도 PG enum 도 없는 `text` 라, 이 두 곳이 값의 유일한 테두리다 —
 * 한쪽만 고치면 타입은 통과하는데 화면이 `consentTypeMeta` 에서 라벨을 못 찾는다.
 * 항상 같이 고친다.
 */
export type ConsentType =
  | 'weekly_report'    // 주간 학습 요약
  | 'monthly_report'   // 월간 회고
  | 'weak_nodes'       // 약점 단원 정보
  | 'emotion_share'    // 감정 평균 (민감, 별도 동의)
  | 'realtime_alert'      // 학습 시작·완료 실시간 알림
  | 'self_study_summary'  // 스스로 담은 봇·공부한 날 (대화 원문·요약은 포함 안 함)
  | 'class_assignment_summary'; // 참여한 반·받은 과제 현황 (문항·답안·점수는 포함 안 함)

export type ConsentLog = {
  id: string;
  parentId: string;
  studentId: string;
  type: ConsentType;
  grantedAt: string;          // ISO datetime
  /** 만료 — undefined면 학생이 철회할 때까지 유효 */
  expiresAt?: string;
  /** 사람이 읽을 수 있는 범위 라벨 — UI 표시용 */
  scopeLabel: '이번 주만' | '이번 달만' | '계속';
};

export const consentTypeMeta: Record<ConsentType, { label: string; description: string; sensitive: boolean }> = {
  weekly_report:    { label: '주간 요약',     description: '학습 시간·평균 정답률·완료율',         sensitive: false },
  monthly_report:   { label: '월간 회고',     description: '시험까지 진척·약점 정복 진도',          sensitive: false },
  weak_nodes:       { label: '약점 단원',     description: '내가 어려워하는 단원 목록',             sensitive: false },
  emotion_share:    { label: '감정 평균',     description: '블록별 감정 체크인 평균 — 민감',         sensitive: true },
  realtime_alert:   { label: '실시간 알림',   description: '학습 시작·완료·미수행 즉시 카톡',        sensitive: false },
  // 자기주도 학습에는 승인할 교사가 구조적으로 없어(학생이 스스로 고른 봇), 이 하나만은
  // 학생 본인이 승인 주체다. `sensitive: false` — 대화 원문·감정은 애초에 안 들어간다.
  self_study_summary: { label: '스스로 공부', description: '스스로 고른 봇·공부한 날 — 대화 내용은 빼고', sensitive: false },
  // 반·과제도 학생 동의 뒤에 둔다(04:154 「학생 승인 후」). 문항·답안·점수는 안 들어간다.
  class_assignment_summary: { label: '수업방·과제', description: '참여한 반과 받은 과제 현황 — 답안·점수는 빼고', sensitive: false },
};

/* ─── 데모 데이터 ─────────────────────────────────────────── */

export const currentParent: Parent = {
  id: 'parent_001',
  name: '어머니',
  relation: 'mother',
  phone: '010-****-1234',
  kakaoId: 'mom_seo',
};

/** 서연(student_001)과 어머니(parent_001) 매핑 */
export const childLinks: ChildLink[] = [
  { parentId: 'parent_001', studentId: 'student_001', primary: true },
];

/**
 * 동의 로그 — 시드가 그대로 `consent_logs` 로 넣는다(`scripts/seed.ts`).
 *
 * 한 줄뿐인 이유: 학부모 화면(`/parent`)이 **동의 게이트 뒤**에 있어서, 이 줄이 없으면
 * `GET /api/parent/children` 이 자녀 이름만 주고 반·과제는 빈 배열로 준다. 데모에서
 * 그 화면을 열어 보려면 「서연이 어머니에게 반·과제 현황을 공유했다」는 사실이 있어야 한다.
 *
 * 민준(s2)에게는 일부러 주지 않았다 — 민준은 참여한 반이 0곳이라 **동의가 있든 없든
 * 화면이 같다.** 05 § 11.4 규칙 2 가 요구하는 「미동의와 무활동을 구별할 수 없게」가
 * 데모에서 그대로 보이는 자리다.
 *
 * `expiresAt` 을 비워 뒀으므로 학생이 거둘 때까지(`revoked_at`) 살아 있다.
 */
export const consentLog: ConsentLog[] = [
  {
    id: 'consent_class_seoyeon',
    parentId: 'parent_001',
    studentId: 'student_001',
    type: 'class_assignment_summary',
    grantedAt: '2026-03-02T09:00:00+09:00',
    scopeLabel: '계속',
  },
];

/** 주 보호자 조회 — primary=true인 첫 부모. 단일 자녀 가정. */
export function getPrimaryParent(studentId: string = 'student_001'): Parent | null {
  const link = childLinks.find(l => l.studentId === studentId && l.primary);
  if (!link) return null;
  // 데모상 currentParent가 유일 — 실제 다수 부모 모델에서는 parents lookup 추가
  return currentParent.id === link.parentId ? currentParent : null;
}
