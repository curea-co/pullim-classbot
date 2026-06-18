/**
 * 풀림 클래스봇 단일 토큰 소스 (CUDS pullim × variant-B).
 * 권위: curea-design-system packages/tokens/themes/{_base,variant-b, brands/pullim}.
 * globals.css @theme 는 이 값을 1:1 미러링한다 (palette.test.ts 가 canonical 잠금).
 * 인라인/차트 등 JS 소비자는 여기서 import — hex 직접 작성 금지.
 */
export const palette = {
  primary: {
    50: 'oklch(0.972 0.024 258)', 100: 'oklch(0.940 0.039 258)', 200: 'oklch(0.890 0.069 258)',
    300: 'oklch(0.820 0.108 258)', 400: 'oklch(0.730 0.154 258)', 500: 'oklch(0.640 0.189 258)',
    600: 'oklch(0.524 0.197 258)', 700: 'oklch(0.474 0.181 258)', 800: 'oklch(0.414 0.154 258)',
    900: 'oklch(0.364 0.118 258)', 950: 'oklch(0.264 0.083 258)',
  },
  gray: {
    0: 'oklch(1 0 0)', 25: 'oklch(0.991 0.001 286)', 50: 'oklch(0.985 0 0)', 100: 'oklch(0.967 0.001 286)',
    200: 'oklch(0.920 0.003 286)', 300: 'oklch(0.871 0.006 286)', 400: 'oklch(0.705 0.010 286)',
    500: 'oklch(0.552 0.013 286)', 600: 'oklch(0.442 0.015 286)', 700: 'oklch(0.370 0.014 286)',
    800: 'oklch(0.274 0.012 286)', 900: 'oklch(0.213 0.010 286)', 950: 'oklch(0.141 0.008 286)',
  },
  success: { 50: 'oklch(0.965 0.024 158)', 500: 'oklch(0.696 0.170 162)', 600: 'oklch(0.596 0.145 163)', 900: 'oklch(0.332 0.077 168)' },
  warning: { 50: 'oklch(0.987 0.026 102)', 500: 'oklch(0.795 0.184 86)', 600: 'oklch(0.681 0.162 76)', 900: 'oklch(0.421 0.095 58)' },
  danger:  { 50: 'oklch(0.971 0.013 17)',  500: 'oklch(0.637 0.237 25)', 600: 'oklch(0.577 0.245 27)', 900: 'oklch(0.396 0.141 25)' },
  info:    { 50: 'oklch(0.977 0.014 234)', 500: 'oklch(0.685 0.169 237)', 600: 'oklch(0.588 0.158 241)', 900: 'oklch(0.379 0.146 265)' },
  lemon: { base: 'oklch(0.967 0.197 116)', soft: 'oklch(0.985 0.090 116)', ink: 'oklch(0.520 0.110 116)' },
  botSig: {
    math:    { hex: 'oklch(0.967 0.197 116)', inkLight: 'oklch(0.520 0.110 116)' },
    english: { hex: 'oklch(0.720 0.170 28)',  inkLight: 'oklch(0.520 0.150 28)' },
    science: { hex: 'oklch(0.760 0.130 178)', inkLight: 'oklch(0.520 0.090 178)' },
    korean:  { hex: 'oklch(0.620 0.220 286)', inkLight: 'oklch(0.470 0.170 286)' },
    social:  { hex: 'oklch(0.680 0.160 55)',  inkLight: 'oklch(0.500 0.120 55)' },
  },
  radius: { xs: 6, sm: 8, md: 16, lg: 16, xl: 20, '2xl': 28, full: 9999 },
  space: { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 12, 6: 16, 7: 20, 8: 24, 9: 32, 10: 40, 11: 48, 12: 64 },
  text: { '2xs': 11, xs: 12, sm: 13, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 },
  motion: { instant: 100, fast: 200, normal: 400, slow: 500, easeStandard: 'cubic-bezier(0.2,0,0,1)', easeEmphasized: 'cubic-bezier(0.3,0,0,1)' },
} as const;

export type Palette = typeof palette;
