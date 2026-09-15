/**
 * 클래스봇 5종 시그니처 컬러 매퍼.
 * 권위: [07-branding § 4.6.2](proc/spec/07-branding.md) · [08-design-system § 15.2.1](proc/spec/08-design-system.md).
 * 토큰 정의: `app/globals.css` `--color-bot-*`.
 *
 * 사용 — CSS 변수 또는 hex 직접:
 *   <div style={{ borderLeftColor: botSignature(bot).hex }} />
 *   <div style={{ borderLeftColor: `var(${botSignature(bot).cssVar})` }} />
 *
 * ⚠️ 쓰는 자리를 좁게 잡는다 — **「어느 봇인지 알아보는 표시」로만.**
 *   쓰면 안 되는 곳: **아바타 면** · 넓은 배경 채우기 · 본문 글자색 · 진척 막대 같은 **데이터 표현**
 *   이유: 5색이 넓게 깔리면 화면 hue 가 [08 § 14.1] 한도(≤ 3종)를 넘어 「다채로움」이 된다.
 *
 * **아바타 면은 이 표를 더 이상 쓰지 않는다.** 봇 배지는 브랜드 블루 한 색 + 과목 이니셜이고
 * (`components/classbot/bot-avatar.tsx` 머리 주석에 까닭이 적혀 있다), 시그니처를 얹으면
 * 그 자리에 hue 가 다섯 다시 풀린다. 새 자리에 이 매퍼를 끌어다 쓰지 마라 — 줄어드는 중이다.
 *
 * ## 「지금 어디에 남았나」는 **여기 적지 않는다 — 호출부가 진실원이다**
 *
 * ```
 * grep -rn botSignature apps/classbot/{app,components,lib} | grep -v __tests__
 * ```
 *
 * 한동안 이 자리에 손으로 센 목록이 있었는데 **코드와 어긋났다** — 넷을 적어 두는 사이
 * 실제로는 여덟 자리가 살아 있었고, 그 목록을 인용하던 주석까지 같이 틀렸다. 자리를 걷어내는
 * 중이라 목록은 계속 움직이므로, **세는 일은 grep 에 맡기고 여기서는 성격만 적는다.**
 *
 * 지금 남은 것은 성격으로 넷이다 — **점**(예: 8px 시그니처 점 · 타이핑 점) · **얇은 라이너**
 * (예: 말풍선 좌측 3px · 봇 카드 하단 2px 바 · 컨텍스트 앵커 좌측 · M9 wave bar) ·
 * **활성 봇 칩 배경** · 그리고 **웰빙 3화면의 `inkLight` 테두리+글자색**.
 *
 * **괄호는 예시이지 목록이 아니다** — 자리를 세는 일은 위 grep 이 한다. 넷으로 가른 **분류**는
 * 전수로 참이고(호출부가 전부 넷 중 하나에 든다), 썩는 것은 분류가 아니라 열거다.
 *
 * ⛔ **마지막 하나는 위 「쓰면 안 되는 곳」의 「본문 글자색」과 정면으로 어긋난다.**
 * `style={{ borderColor: sig.inkLight, color: sig.inkLight }}` 꼴로 웰빙 체크인 · 봇 한 마디
 * 카드 · 웰빙 게이지 셋에 살아 있다. **새 자리에 복제하지 마라** — 걷어내는 것은 별건이다.
 *
 * ## 활성 봇 칩 배경을 걷으려면 **문서 PR 이 먼저다**
 *
 * `04 § 9.4` 가 「활성 봇: 봇 시그니처 컬러 배경 + 흰 글자」를 **아직 명문으로** 들고 있어,
 * 코드만 먼저 걷으면 그 순간 스펙 위반이 된다. 그런데 `07-branding.md` 쪽 시그니처 사용 룰은
 * 칩을 **애초에 목록에 넣지 않아** 스펙끼리도 갈라져 있다. 그러니 선행 문서 PR 은 둘 중
 * 하나만 고치면 안 되고 **같은 변경에서 둘을 맞춰야** 한다.
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
  '공통수학':   sig('math'),
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
  cb_001: BY_SUBJECT['수학'],
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
