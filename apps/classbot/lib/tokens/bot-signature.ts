/**
 * 클래스봇 5종 시그니처 컬러 매퍼.
 * 권위: [07-branding § 4.6.2](proc/spec/07-branding.md) · [08-design-system § 15.2.1](proc/spec/08-design-system.md).
 * 토큰 정의: `src/app/globals.css` `--color-bot-*`.
 *
 * 사용 — CSS 변수 또는 hex 직접:
 *   <div style={{ borderLeftColor: botSignature(bot).hex }} />
 *   <div style={{ borderLeftColor: `var(${botSignature(bot).cssVar})` }} />
 */
export type BotSignature = {
  /** Tailwind/CSS 변수 이름 (전역 토큰) */
  cssVar: `--color-bot-${'math' | 'english' | 'science' | 'korean' | 'social'}`;
  /** hex (인라인 style 등에서 직접 쓸 때) */
  hex: string;
  /**
   * 밝은 배경 위에서 텍스트/border로 쓰기 위한 darker variant.
   * 시그니처 hex 자체가 매우 밝은 봇(예: math `#E6FF4C` lime)일 때 ghost CTA 텍스트로 hex를 쓰면 흰 배경에 거의 안 보임 — 본 필드는 그 가시성 보장용.
   * 색상은 hex의 darkened tone (luminance를 낮춰 WCAG AA 4.5:1 충족 수준 목표).
   */
  inkLight: string;
  /** 키 라벨 (디버그/주석용) */
  kind: 'math' | 'english' | 'science' | 'korean' | 'social';
};

const BY_SUBJECT: Record<string, BotSignature> = {
  '수학':       { cssVar: '--color-bot-math',    hex: '#E6FF4C', inkLight: '#4D5D00', kind: 'math' },
  '수학Ⅱ':      { cssVar: '--color-bot-math',    hex: '#E6FF4C', inkLight: '#4D5D00', kind: 'math' },
  '미적분':     { cssVar: '--color-bot-math',    hex: '#E6FF4C', inkLight: '#4D5D00', kind: 'math' },
  '영어':       { cssVar: '--color-bot-english', hex: '#FF7A6B', inkLight: '#B23D2E', kind: 'english' },
  '과학':       { cssVar: '--color-bot-science', hex: '#22C5A8', inkLight: '#0E7C66', kind: 'science' },
  '통합과학':   { cssVar: '--color-bot-science', hex: '#22C5A8', inkLight: '#0E7C66', kind: 'science' },
  '물리':       { cssVar: '--color-bot-science', hex: '#22C5A8', inkLight: '#0E7C66', kind: 'science' },
  '화학':       { cssVar: '--color-bot-science', hex: '#22C5A8', inkLight: '#0E7C66', kind: 'science' },
  '국어':       { cssVar: '--color-bot-korean',  hex: '#7B5CFF', inkLight: '#4D3DA8', kind: 'korean' },
  '문학':       { cssVar: '--color-bot-korean',  hex: '#7B5CFF', inkLight: '#4D3DA8', kind: 'korean' },
  '사회':       { cssVar: '--color-bot-social',  hex: '#D97706', inkLight: '#8C5108', kind: 'social' },
  '한국사':     { cssVar: '--color-bot-social',  hex: '#D97706', inkLight: '#8C5108', kind: 'social' },
};

const BY_ID: Record<string, BotSignature> = {
  cb_001: BY_SUBJECT['수학Ⅱ'],
  cb_002: BY_SUBJECT['영어'],
  cb_003: BY_SUBJECT['통합과학'],
  cb_004: BY_SUBJECT['국어'],
  cb_005: BY_SUBJECT['사회'],
};

const FALLBACK: BotSignature = { cssVar: '--color-bot-math', hex: '#2854D8', inkLight: '#1E40AF', kind: 'math' };

export function botSignature(bot: { id?: string; subject?: string } | undefined | null): BotSignature {
  if (!bot) return FALLBACK;
  if (bot.id && BY_ID[bot.id]) return BY_ID[bot.id];
  if (bot.subject) {
    // exact match first, then substring
    if (BY_SUBJECT[bot.subject]) return BY_SUBJECT[bot.subject];
    for (const key of Object.keys(BY_SUBJECT)) {
      if (bot.subject.includes(key)) return BY_SUBJECT[key];
    }
  }
  return FALLBACK;
}
