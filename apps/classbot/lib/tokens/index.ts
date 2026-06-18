/**
 * 풀림 디자인 토큰 — 런타임 (차트·동적 스타일·이벤트 색상 등)
 * 모든 색은 palette.ts 에서 파생 — hex/literal 중복 복사 금지.
 * 정적 스타일은 Tailwind 클래스(bg-pullim-blue-500 등)를 우선 사용.
 */

import { palette } from './palette';

export const pullimBlue = palette.primary;

export const pullimSlate = palette.gray;

/** 시맨틱 색 (CUDS values — success/warn 복원됨, 2026-05-12 deprecated 해제). */
export const pullimSemantic = {
  success:   palette.success[600],
  successBg: palette.success[50],
  warn:      palette.warning[600],
  warnBg:    palette.warning[50],
  danger:    palette.danger[600],
  dangerBg:  palette.danger[50],
} as const;

/** IRT 난이도 5단계 (1=매우쉬움, 5=매우어려움) */
export const pullimIrtLevel = [
  palette.primary[100], // 1
  palette.primary[300], // 2
  palette.primary[500], // 3
  palette.primary[700], // 4
  palette.primary[900], // 5
] as const;

/** 학습 히트맵 6단계 (0=미학습, 5=완전정복) */
export const pullimHeat = [
  palette.gray[100],    // 0
  palette.primary[100], // 1
  palette.primary[300], // 2
  palette.primary[500], // 3
  palette.primary[700], // 4
  palette.primary[900], // 5
] as const;

export const pullimRadius = palette.radius;

export const pullimShadow = {
  xs:   '0 1px 2px rgba(18, 22, 39, 0.04)',
  sm:   '0 1px 3px rgba(18, 22, 39, 0.06), 0 1px 2px rgba(18, 22, 39, 0.04)',
  md:   '0 4px 12px rgba(18, 22, 39, 0.06), 0 2px 4px rgba(18, 22, 39, 0.04)',
  lg:   '0 12px 24px rgba(18, 22, 39, 0.08), 0 4px 8px rgba(18, 22, 39, 0.04)',
  glow: '0 0 0 4px rgba(59, 111, 246, 0.15)',
} as const;

/** 풀림 레몬 — 강조 CTA·스트릭·완료 인증 (플래너 핸드오프 12.1) */
export const pullimLemon = palette.lemon;

/** Recharts 기본 팔레트 (브랜드 블루 변주) */
export const pullimChartColors = [
  palette.primary[600],
  palette.primary[400],
  palette.primary[700],
  palette.primary[300],
  palette.primary[500],
  palette.primary[200],
] as const;

/** 과목별 컬러 — 블루 명도 변주로 통일. */
export const pullimSubjectColors = {
  korean:  palette.primary[700],
  math:    palette.primary[500],
  english: palette.primary[400],
  science: palette.primary[600],
  social:  palette.primary[300],
  history: palette.primary[800],
} as const;

export type PullimIrtLevel = 1 | 2 | 3 | 4 | 5;
export type PullimHeatLevel = 0 | 1 | 2 | 3 | 4 | 5;
