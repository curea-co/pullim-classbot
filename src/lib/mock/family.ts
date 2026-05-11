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

/** 학생이 부모와 공유 동의한 데이터 종류 */
export type ConsentType =
  | 'weekly_report'    // 주간 학습 요약
  | 'monthly_report'   // 월간 회고
  | 'weak_nodes'       // 약점 단원 정보
  | 'emotion_share'    // 감정 평균 (민감, 별도 동의)
  | 'realtime_alert';  // 학습 시작·완료 실시간 알림

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
 * 동의 로그 — 빈 배열로 시작.
 * 학생이 ConsentDialog에서 첫 동의 시 push (실제 mutation 없는 데모, in-memory).
 * Phase 2의 학부모 홈에서는 이 배열을 읽어 알림 피드에 노출.
 */
export const consentLog: ConsentLog[] = [];

/** 주 보호자 조회 — primary=true인 첫 부모. 단일 자녀 가정. */
export function getPrimaryParent(studentId: string = 'student_001'): Parent | null {
  const link = childLinks.find(l => l.studentId === studentId && l.primary);
  if (!link) return null;
  // 데모상 currentParent가 유일 — 실제 다수 부모 모델에서는 parents lookup 추가
  return currentParent.id === link.parentId ? currentParent : null;
}
