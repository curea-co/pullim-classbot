/**
 * 3-Tier AI 파이프라인 표시용 유틸 (SKILL.md 4.3)
 * 각 AI 호출 지점에서 어떤 Tier를 쓰는지 UI에 일관되게 표기.
 */

export type AiTier = 'T1' | 'T2' | 'T3';

export const aiTierMeta: Record<AiTier, {
  label: string;
  description: string;
  color: string;       // 텍스트
  bg: string;          // 배경
  expectedLatency: string;
  needsStreamingUi: boolean;
}> = {
  T1: {
    label: 'Edge',
    description: '룰엔진 / 임베딩 — 즉시 응답',
    color: '#5A8BFF',  // blue-400 — 색 스펙트럼 축소 2026-05-12 (was success #12B26B)
    bg: '#EEF3FF',     // blue-50
    expectedLatency: '~0ms',
    needsStreamingUi: false,
  },
  T2: {
    label: 'Fast',
    description: 'Haiku / GPT-4o-mini — 단순 생성',
    color: '#2854D8',  // blue-600
    bg: '#DCE6FF',     // blue-100
    expectedLatency: '1~3s',
    needsStreamingUi: false,
  },
  T3: {
    label: 'Deep',
    description: 'Sonnet / GPT-4o — 복잡 생성·분석',
    color: '#1D3FA8',  // blue-700
    bg: '#EEF3FF',     // blue-50
    expectedLatency: '5s+',
    needsStreamingUi: true,
  },
};
