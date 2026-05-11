/**
 * Scope Guard — AI 응답 권한 5단계 (Q 핸드오프 7.6 + 클래스봇 보안 가디언).
 *
 * 풀림 클래스봇에서 사용. 풀림 튜터의 단독 페이지는 무한풀기 솔브의
 * AI 코치 패널로 통합되어, 이 파일은 ScopeLevel만 남겨 둠.
 */

export type ScopeLevel = 1 | 2 | 3 | 4 | 5;

export const scopeMeta: Record<ScopeLevel, { label: string; short: string; allow: string }> = {
  1: { label: '수업 한정', short: 'L1', allow: '교사가 업로드한 자료·주제 내에서만' },
  2: { label: '주제 제한', short: 'L2', allow: '설정된 과목·단원 범위 내 자유 대화' },
  3: { label: '교과 범위', short: 'L3', allow: '과목 전체 범위 자유 대화 (기본값)' },
  4: { label: '교육 범위', short: 'L4', allow: '모든 교과·학습 관련 주제' },
  5: { label: '완전 개방', short: 'L5', allow: '모든 주제 (유해 콘텐츠 필터는 항상)' },
};
