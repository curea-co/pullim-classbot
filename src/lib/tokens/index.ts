/**
 * 풀림 디자인 토큰 — 런타임 (차트·동적 스타일·이벤트 색상 등)
 * CSS 변수와 같은 값을 export. globals.css와 동기화 유지 필수.
 * 정적 스타일은 Tailwind 클래스(bg-pullim-blue-500 등)를 우선 사용.
 */

export const pullimBlue = {
  50:  '#EEF3FF',
  100: '#DCE6FF',
  200: '#B8CDFF',
  300: '#8BAEFF',
  400: '#5A8BFF',
  500: '#3B6FF6',
  600: '#2854D8',
  700: '#1D3FA8',
  800: '#152E7A',
  900: '#0E1F54',
  950: '#070F2C',
} as const;

export const pullimSlate = {
  0:   '#FFFFFF',
  25:  '#FBFCFE',
  50:  '#F5F7FB',
  100: '#EDF0F5',
  200: '#DDE2EC',
  300: '#C4CBDA',
  400: '#97A0B4',
  500: '#6B7489',
  600: '#4A536A',
  700: '#343B50',
  800: '#20263A',
  900: '#121627',
  950: '#080B18',
} as const;

export const pullimSemantic = {
  success:   '#12B26B',
  successBg: '#E6F7EE',
  warn:      '#F59E0B',
  warnBg:    '#FEF3DB',
  danger:    '#E5484D',
  dangerBg:  '#FCE9EA',
} as const;

/** IRT 난이도 5단계 (1=매우쉬움, 5=매우어려움) */
export const pullimIrtLevel = [
  '#E5EEFF', // 1
  '#A9C4FF', // 2
  '#5A8BFF', // 3
  '#2854D8', // 4
  '#152E7A', // 5
] as const;

/** 학습 히트맵 6단계 (0=미학습, 5=완전정복) */
export const pullimHeat = [
  '#F0F3F9', // 0
  '#D9E5FB', // 1
  '#A9C4FF', // 2
  '#5A8BFF', // 3
  '#2854D8', // 4
  '#0E1F54', // 5
] as const;

export const pullimRadius = {
  xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 9999,
} as const;

export const pullimShadow = {
  xs:   '0 1px 2px rgba(18, 22, 39, 0.04)',
  sm:   '0 1px 3px rgba(18, 22, 39, 0.06), 0 1px 2px rgba(18, 22, 39, 0.04)',
  md:   '0 4px 12px rgba(18, 22, 39, 0.06), 0 2px 4px rgba(18, 22, 39, 0.04)',
  lg:   '0 12px 24px rgba(18, 22, 39, 0.08), 0 4px 8px rgba(18, 22, 39, 0.04)',
  glow: '0 0 0 4px rgba(59, 111, 246, 0.15)',
} as const;

/** 풀림 레몬 — 강조 CTA·스트릭·완료 인증 (플래너 핸드오프 12.1) */
export const pullimLemon = {
  base: '#E6FF4C',
  soft: '#F5FFB8',
  ink:  '#5C6B0A',
} as const;

/** Recharts 기본 팔레트 (브랜드 블루 변주) */
export const pullimChartColors = [
  pullimBlue[500],
  pullimBlue[400],
  pullimBlue[600],
  pullimBlue[300],
  pullimBlue[700],
  pullimBlue[200],
] as const;

/** 과목별 컬러 — 일관성 유지 */
export const pullimSubjectColors = {
  korean:  pullimBlue[600],   // 국어
  math:    pullimBlue[500],   // 수학
  english: pullimBlue[400],   // 영어
  science: '#8B5CF6',          // 과학 — 보조 보라
  social:  '#10B981',          // 사회 — 보조 그린
  history: '#F59E0B',          // 한국사 — 보조 앰버
} as const;

export type PullimIrtLevel = 1 | 2 | 3 | 4 | 5;
export type PullimHeatLevel = 0 | 1 | 2 | 3 | 4 | 5;
