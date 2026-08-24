/**
 * 과제 카드 상태별 시각 매핑.
 * 권위: [08-design-system § 15.6](proc/spec/08-design-system.md).
 *
 * ⚠️ 색 규약 ([08 § 1.3] · [§ 1.6] · [§ 14.1])
 *   - 쓰는 색은 **블루 · 슬레이트 · 위험(빨강)** 셋뿐이다. success(초록)·warn(앰버)은 deprecated — 신규 사용 금지.
 *   - 상태 차이는 hue 를 바꿔서가 아니라 **한 hue 안의 명도**로 말한다.
 *   - 레몬은 키 CTA 한정이라 과제 카드(한 화면에 여러 장)에는 쓰지 않는다.
 *   - 색만으로 뜻을 전하지 않는다 — 카드에는 `semanticLabel`(글자)·모드 아이콘이 늘 함께 붙는다.
 *
 * 매트릭스:
 *   진행 중      → blue-600 progress · 회색 D-N 칩 · brand.50 라이너
 *   마감 임박    → blue-800 progress (가장 진한 블루 = 가장 급함) · 진한 블루 칩 "내일" · blue 라이너
 *   지연         → danger progress · danger 칩 "지난 N일" · danger 라이너   ← 유일한 시맨틱 hue
 *   완료         → blue-300 progress (물러남) + 100% · 회색 "완료" 칩 + 체크 · blue-300 라이너
 *   오답정복     → blue-600 progress · 외곽선 칩 · slate 라이너
 *   시험         → navy solid · navy 칩 "시험" · navy 라이너
 *
 * 우선순위: mode(exam/wrong-conquest) > state(overdue/submitted) > dDay(D-1/오늘) > 진행 중
 */

import type { Assignment } from '@/lib/mock';
import { palette } from './palette';

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
  /** 의미적 라벨 — 색을 못 읽어도 이 글자로 상태를 안다 */
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
      linerHex: palette.gray[950],
      // 시험은 「모드가 바뀌었다」는 신호라 반전 면(navy solid)으로 둔다 — [08 § 14.1] 다크 영역 예외
      dDayChipClass: 'bg-pullim-slate-900 text-white',
      dDayLabel: a.dDay,
      semanticLabel: '시험',
    };
  }
  if (a.mode === 'wrong-conquest') {
    return {
      state: 'wrong-conquest',
      progressClass: 'bg-pullim-blue-600',
      linerHex: palette.gray[300],
      // 채우기 대신 외곽선 — 같은 줄의 다른 칩과 모양으로 갈린다
      dDayChipClass: 'text-pullim-slate-700 ring-pullim-slate-300 bg-transparent ring-1 ring-inset',
      dDayLabel: a.dDay,
      semanticLabel: '오답정복',
    };
  }

  // 2) 완료 (state == submitted 또는 completedCount == questionCount)
  const isComplete = a.state === 'submitted' || a.completedCount >= a.questionCount;
  if (isComplete) {
    return {
      state: 'complete',
      // 끝난 일은 더 이상 눈을 끌 필요가 없다 — 가장 옅은 블루로 물러난다
      progressClass: 'bg-pullim-blue-300',
      linerHex: palette.primary[300],
      dDayChipClass: 'bg-pullim-slate-100 text-pullim-slate-600',
      dDayLabel: '완료',
      semanticLabel: '완료',
    };
  }

  // 3) state == overdue
  if (a.state === 'overdue') {
    return {
      state: 'overdue',
      progressClass: 'bg-pullim-danger',
      linerHex: palette.danger[600],
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
      linerHex: palette.danger[600],
      dDayChipClass: 'bg-pullim-danger-bg text-pullim-danger',
      dDayLabel: a.dDay,
      semanticLabel: '지연',
    };
  }
  if (parsed.value <= 1) {
    return {
      state: 'urgent',
      // 급함 = 같은 블루의 가장 진한 단계. hue 를 바꾸지 않는다
      progressClass: 'bg-pullim-blue-800',
      linerHex: palette.primary[800],
      dDayChipClass: 'bg-pullim-blue-800 text-white',
      dDayLabel: parsed.value === 0 ? '오늘' : '내일',
      semanticLabel: '마감 임박',
    };
  }

  // 5) 진행 중 (기본)
  return {
    state: 'in-progress',
    progressClass: 'bg-pullim-blue-600',
    linerHex: palette.primary[50],
    dDayChipClass: 'bg-pullim-slate-100 text-pullim-slate-600',
    dDayLabel: a.dDay,
    semanticLabel: '진행 중',
  };
}
