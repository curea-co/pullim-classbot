/**
 * 과제 카드 상태별 컬러/라이너 매핑.
 * 권위: [08-design-system § 15.6](proc/spec/08-design-system.md).
 *
 * SPEC 매트릭스:
 *   진행 중      → brand.600 progress · 회색 D-N · brand.50 라이너
 *   마감 임박    → warning.cta-bg · warning chip "내일" · warning 라이너
 *   지연         → danger.fg · danger chip "지난 N일" · danger 라이너
 *   완료         → success.fg + 100% · "완료" · success 라이너 + 체크
 *   오답정복     → lime · lime chip · lime 라이너
 *   시험         → navy solid · navy chip "시험" · navy 강조 라이너
 *
 * 우선순위: mode(exam/wrong-conquest) > state(overdue/submitted) > dDay(D-1/오늘) > 진행 중
 */

import type { Assignment } from '@/lib/mock';

export type AssignmentVisualState =
  | 'in-progress'
  | 'urgent'        // D-1/오늘
  | 'overdue'       // 지난 N일
  | 'complete'      // submitted + completed = total
  | 'wrong-conquest' // mode = wrong-conquest
  | 'exam';         // mode = exam

export type AssignmentVisual = {
  state: AssignmentVisualState;
  /** progress bar 색 (Tailwind class) */
  progressClass: string;
  /** 카드 좌측 라이너 hex */
  linerHex: string;
  /** D-day chip 색 (Tailwind class — bg / text 모두) */
  dDayChipClass: string;
  /** D-day 라벨 (예: "내일", "지난 2일", "완료", "오답정복", "시험") */
  dDayLabel: string;
  /** 의미적 라벨 */
  semanticLabel: '진행 중' | '마감 임박' | '지연' | '완료' | '오답정복' | '시험';
};

/** "D-1" / "D-9" 등에서 일수 추출. "오늘"·"내일"은 1, "지난 N일"은 음수 처리. */
function parseDDay(dDay: string): { value: number; isOverdue: boolean } {
  if (dDay === '오늘') return { value: 0, isOverdue: false };
  if (dDay === '내일') return { value: 1, isOverdue: false };
  const overdueMatch = dDay.match(/지난\s*(\d+)/);
  if (overdueMatch) return { value: -Number(overdueMatch[1]), isOverdue: true };
  const dDayMatch = dDay.match(/D-(\d+)/);
  if (dDayMatch) return { value: Number(dDayMatch[1]), isOverdue: false };
  return { value: 999, isOverdue: false };
}

export function getAssignmentVisual(a: Assignment): AssignmentVisual {
  // 1) 모드 기반 (시험 > 오답정복)
  if (a.mode === 'exam') {
    return {
      state: 'exam',
      progressClass: 'bg-pullim-slate-900',
      linerHex: '#0F1A3A',
      dDayChipClass: 'bg-pullim-slate-900 text-pullim-lemon',
      dDayLabel: a.dDay,
      semanticLabel: '시험',
    };
  }
  if (a.mode === 'wrong-conquest') {
    return {
      state: 'wrong-conquest',
      progressClass: 'bg-pullim-lemon',
      linerHex: '#E6FF4C',
      dDayChipClass: 'bg-pullim-lemon text-pullim-lemon-ink',
      dDayLabel: a.dDay,
      semanticLabel: '오답정복',
    };
  }

  // 2) 완료 (state == submitted 또는 completedCount == questionCount)
  const isComplete = a.state === 'submitted' || a.completedCount >= a.questionCount;
  if (isComplete) {
    return {
      state: 'complete',
      progressClass: 'bg-pullim-success',
      linerHex: '#0E8C56',
      dDayChipClass: 'bg-pullim-success-bg text-pullim-success',
      dDayLabel: '완료',
      semanticLabel: '완료',
    };
  }

  // 3) state == overdue
  if (a.state === 'overdue') {
    return {
      state: 'overdue',
      progressClass: 'bg-pullim-danger',
      linerHex: '#C03B3F',
      dDayChipClass: 'bg-pullim-danger-bg text-pullim-danger',
      dDayLabel: a.dDay,
      semanticLabel: '지연',
    };
  }

  // 4) D-day 임박 (오늘·내일·D-1)
  const parsed = parseDDay(a.dDay);
  if (parsed.isOverdue) {
    return {
      state: 'overdue',
      progressClass: 'bg-pullim-danger',
      linerHex: '#C03B3F',
      dDayChipClass: 'bg-pullim-danger-bg text-pullim-danger',
      dDayLabel: a.dDay,
      semanticLabel: '지연',
    };
  }
  if (parsed.value <= 1) {
    return {
      state: 'urgent',
      progressClass: 'bg-pullim-warn',
      linerHex: '#D97706',
      dDayChipClass: 'bg-pullim-warn-bg text-pullim-warn',
      dDayLabel: parsed.value === 0 ? '오늘' : '내일',
      semanticLabel: '마감 임박',
    };
  }

  // 5) 진행 중 (기본)
  return {
    state: 'in-progress',
    progressClass: 'bg-pullim-blue-600',
    linerHex: '#EEF3FF',
    dDayChipClass: 'bg-pullim-slate-100 text-pullim-slate-600',
    dDayLabel: a.dDay,
    semanticLabel: '진행 중',
  };
}
