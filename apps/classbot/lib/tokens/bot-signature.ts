/**
 * 클래스봇 5종 시그니처 컬러 매퍼.
 * 권위: [07-branding § 4.6.2](proc/spec/07-branding.md) · [08-design-system § 15.2.1](proc/spec/08-design-system.md).
 * 토큰 정의: `app/globals.css` `--color-bot-*`.
 *
 * 사용 — CSS 변수 또는 hex 직접:
 *   <div style={{ borderLeftColor: botSignature(bot).hex }} />
 *   <div style={{ borderLeftColor: `var(${botSignature(bot).cssVar})` }} />
 */
import { palette } from './palette';

export type BotSignature = {
  /** Tailwind/CSS 변수 이름 (전역 토큰) */
  cssVar: `--color-bot-${'math' | 'english' | 'science' | 'korean' | 'social'}`;
  /** hex (인라인 style 등에서 직접 쓸 때) */
  hex: string;
  /**
   * 밝은 배경 위에서 텍스트/border로 쓰기 위한 darker variant.
   * 시그니처 hex 자체가 매우 밝은 봇(예: math `oklch(0.967 0.197 116)`)일 때 ghost CTA 텍스트로 hex를 쓰면 흰 배경에 거의 안 보임 — 본 필드는 그 가시성 보장용.
   * 색상은 hex의 darkened tone (luminance를 낮춰 WCAG AA 4.5:1 충족 수준 목표).
   */
  inkLight: string;
  /** 키 라벨 (디버그/주석용) */
  kind: 'math' | 'english' | 'science' | 'korean' | 'social';
};

const sig = (kind: BotSignature['kind']): Omit<BotSignature, 'cssVar'> & { cssVar: BotSignature['cssVar'] } =>
  ({ cssVar: `--color-bot-${kind}`, hex: palette.botSig[kind].hex, inkLight: palette.botSig[kind].inkLight, kind });

const BY_SUBJECT: Record<string, BotSignature> = {
  '수학':       sig('math'),
  '수학Ⅱ':      sig('math'),
  '미적분':     sig('math'),
  '영어':       sig('english'),
  '과학':       sig('science'),
  '통합과학':   sig('science'),
  '물리':       sig('science'),
  '화학':       sig('science'),
  '국어':       sig('korean'),
  '문학':       sig('korean'),
  '사회':       sig('social'),
  '한국사':     sig('social'),
};

const BY_ID: Record<string, BotSignature> = {
  cb_001: BY_SUBJECT['수학Ⅱ'],
  cb_002: BY_SUBJECT['영어'],
  cb_003: BY_SUBJECT['통합과학'],
  cb_004: BY_SUBJECT['국어'],
  cb_005: BY_SUBJECT['사회'],
};

const FALLBACK: BotSignature = sig('math');

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
