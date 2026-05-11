// 풀림 디자인 토큰 — 공통 정의
const pullimTokens = {
  // Brand — 푸른 계열 (풀림 블루)
  blue: {
    50:  '#EEF3FF',
    100: '#DCE6FF',
    200: '#B8CDFF',
    300: '#8BAEFF',
    400: '#5A8BFF',
    500: '#3B6FF6', // primary
    600: '#2854D8',
    700: '#1D3FA8',
    800: '#152E7A',
    900: '#0E1F54',
    950: '#070F2C',
  },
  // Neutrals — 약간 쿨한 슬레이트
  slate: {
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
  },
  // Semantic
  success: '#12B26B',
  successBg: '#E6F7EE',
  warn:    '#F59E0B',
  warnBg:  '#FEF3DB',
  danger:  '#E5484D',
  dangerBg:'#FCE9EA',
  // IRT / 학습 상태 전용
  lvl1: '#E5EEFF', // 매우쉬움
  lvl2: '#A9C4FF',
  lvl3: '#5A8BFF',
  lvl4: '#2854D8',
  lvl5: '#152E7A', // 매우어려움
  // Heatmap
  heat0: '#F0F3F9',
  heat1: '#D9E5FB',
  heat2: '#A9C4FF',
  heat3: '#5A8BFF',
  heat4: '#2854D8',
  heat5: '#0E1F54',
};

const radius = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
const shadow = {
  xs: '0 1px 2px rgba(18, 22, 39, 0.04)',
  sm: '0 1px 3px rgba(18, 22, 39, 0.06), 0 1px 2px rgba(18, 22, 39, 0.04)',
  md: '0 4px 12px rgba(18, 22, 39, 0.06), 0 2px 4px rgba(18, 22, 39, 0.04)',
  lg: '0 12px 24px rgba(18, 22, 39, 0.08), 0 4px 8px rgba(18, 22, 39, 0.04)',
  glow: '0 0 0 4px rgba(59, 111, 246, 0.15)',
};

Object.assign(window, { pullimTokens, radius, shadow });
