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
  /** 키 라벨 (디버그/주석용) */
  kind: 'math' | 'english' | 'science' | 'korean' | 'social';
};

const BY_SUBJECT: Record<string, BotSignature> = {
  '수학':       { cssVar: '--color-bot-math',    hex: '#E6FF4C', kind: 'math' },
  '수학Ⅱ':      { cssVar: '--color-bot-math',    hex: '#E6FF4C', kind: 'math' },
  '미적분':     { cssVar: '--color-bot-math',    hex: '#E6FF4C', kind: 'math' },
  '영어':       { cssVar: '--color-bot-english', hex: '#FF7A6B', kind: 'english' },
  '과학':       { cssVar: '--color-bot-science', hex: '#22C5A8', kind: 'science' },
  '통합과학':   { cssVar: '--color-bot-science', hex: '#22C5A8', kind: 'science' },
  '물리':       { cssVar: '--color-bot-science', hex: '#22C5A8', kind: 'science' },
  '화학':       { cssVar: '--color-bot-science', hex: '#22C5A8', kind: 'science' },
  '국어':       { cssVar: '--color-bot-korean',  hex: '#7B5CFF', kind: 'korean' },
  '문학':       { cssVar: '--color-bot-korean',  hex: '#7B5CFF', kind: 'korean' },
  '사회':       { cssVar: '--color-bot-social',  hex: '#D97706', kind: 'social' },
  '한국사':     { cssVar: '--color-bot-social',  hex: '#D97706', kind: 'social' },
};

const BY_ID: Record<string, BotSignature> = {
  cb_001: BY_SUBJECT['수학Ⅱ'],
  cb_002: BY_SUBJECT['영어'],
  cb_003: BY_SUBJECT['통합과학'],
  cb_004: BY_SUBJECT['국어'],
  cb_005: BY_SUBJECT['사회'],
};

const FALLBACK: BotSignature = { cssVar: '--color-bot-math', hex: '#2854D8', kind: 'math' };

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
