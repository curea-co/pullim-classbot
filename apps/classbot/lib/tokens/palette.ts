/**
 * 풀림 클래스봇 단일 토큰 소스 (Pullim DS hex).
 * 권위: Pullim Design System — hex-authored canonical values.
 * globals.css @theme 는 이 값을 1:1 미러링한다 (palette.test.ts 가 canonical 잠금).
 * 인라인/차트 등 JS 소비자는 여기서 import — hex 직접 작성 금지.
 */
export const palette = {
  primary: {
    50:  '#EEF3FF',
    100: '#DCE6FF',
    200: '#B8CDFF',
    300: '#8BAEFF',
    400: '#5A8BFF',
    500: '#3B6FF6',
    600: '#2854D8',
    700: '#1D3FA8',
    800: '#142C73',
    900: '#070F2C',
    950: '#050A1E',
  },
  gray: {
    0:   '#FFFFFF',
    25:  '#FAFBFD',
    50:  '#F5F7FB',
    100: '#EDF0F5',
    200: '#DDE2EC',
    300: '#B7BDCD',
    400: '#97A0B4',
    500: '#6B7489',
    600: '#4A536A',
    700: '#2B3245',
    800: '#1E2435',
    900: '#121627',
    950: '#0B0E1A',
  },
  success: { 50: '#E6F8EF', 500: '#12B26B', 600: '#0E8C56', 900: '#0A5235' },
  warning: { 50: '#FFF7E6', 500: '#F2C879', 600: '#D97706', 900: '#7A4A12' },
  danger:  { 50: '#FDECEC', 500: '#E5484D', 600: '#C03B3F', 900: '#7A2528' },
  info:    { 50: '#EEF3FF', 500: '#3B6FF6', 600: '#2854D8', 900: '#070F2C' },
  lemon: { base: '#E6FF4C', soft: '#F4FFB8', ink: '#5C6B0A' },
  botSig: {
    math:    { hex: 'oklch(0.967 0.197 116)', inkLight: 'oklch(0.520 0.110 116)' },
    english: { hex: 'oklch(0.720 0.170 28)',  inkLight: 'oklch(0.520 0.150 28)' },
    science: { hex: 'oklch(0.760 0.130 178)', inkLight: 'oklch(0.520 0.090 178)' },
    korean:  { hex: 'oklch(0.620 0.220 286)', inkLight: 'oklch(0.470 0.170 286)' },
    social:  { hex: 'oklch(0.680 0.160 55)',  inkLight: 'oklch(0.500 0.120 55)' },
  },
  radius: { sm: 8, md: 14, lg: 20, pill: 9999 },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  text: { caption: 12, body: 14, bodyLg: 16, title3: 18, title2: 20, title1: 24, display2: 28, display1: 32 },
  motion: { fast: 120, base: 200, slow: 320, easeStandard: 'cubic-bezier(0.4,0,0.2,1)', easeEmphasized: 'cubic-bezier(0.2,0.8,0.2,1)' },
} as const;

export type Palette = typeof palette;
