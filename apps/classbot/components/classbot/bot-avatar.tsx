import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 봇 배지 — **브랜드 블루 한 색 + 과목 이니셜**. 이모지를 쓰지 않는다.
 *
 * ## 왜 시그니처 5색이 아닌가
 *
 * 봇마다 다른 hue 를 주던 시그니처 5색(라임·코럴·민트·바이올렛·앰버)은 브랜드와 어긋난다.
 * [08 § 1.3] 이 「색 hue 를 정보 위계에 쓰지 않고 **단일 hue 안의 명도**로 표현한다」고 적고
 * [08 § 14.1] 이 한 화면의 강조색을 블루+레몬+위험 셋으로 묶는데, 시그니처는 그 위에 hue 를
 * 다섯 더 푼다. coral·mint·amber 는 같은 명세가 폐기한 warn/success 톤 그 자체이기도 하다.
 * 색 검사(`tests/e2e/color-palette.spec.ts`)가 시그니처 토큰을 **면제**해 주기 때문에
 * 금지 hue 로 잡히지 않았을 뿐이다.
 *
 * 그리고 **색이 나르는 정보가 애초에 없다.** 봇 배지는 언제나 같은 카드 안에 봇 이름을
 * 글자로 달고 있다(전수 확인). 「어느 봇인가」는 이미 글자가 말하고 있어서, 색은 그 말을
 * 한 번 더 하는 대신 화면의 hue 예산만 쓴다.
 *
 * ## 왜 원형이 아닌가
 *
 * 원형은 **사람** 아바타의 관습이다. 이 배지는 「사람이 아니라 봇」을 형태로도 말해야 하므로
 * 둥근 사각을 쓴다. 같은 챗 줄에서 학생 아바타만 `rounded-full` 로 남는 것은 의도다.
 *
 * ## 왜 매핑 표가 없는가
 *
 * 이니셜은 과목 문자열의 **첫 글자**를 뗀다 — 「통합과학」→「통」, 「공통수학1」→「공」,
 * 「한국사」→「한」, 「체육」→「체」. 표를 두면 표에 없는 과목이 곧바로 실패 케이스가 되는데,
 * 첫 글자는 어떤 과목 이름에도 실패하지 않는다. 과목이 없으면 봇 이름의 첫 글자로 내려가고
 * (「수학봇」→「수」), 둘 다 없을 때만 중립 면 + 봇 글리프다.
 *
 * ## 왜 늘 `aria-hidden` 인가
 *
 * 봇 이름이 늘 옆에 글자로 있으므로 이 배지는 **장식**이다. 읽히면 「수 수학봇」처럼 같은
 * 글자를 두 번 듣게 된다. 그래서 루트에 `aria-hidden` 을 고정한다 — 호출부가 끄지 못한다.
 */

export type BotAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * 크기별 규격 — 28 / 36 / 44 / 56.
 *
 * radius 는 앱 스케일(`rounded-sm` 8 · `rounded-md` 14 · `rounded-lg` 20)에서 고른다.
 * 이 앱의 `rounded-lg`·`rounded-xl`·`rounded-2xl` 은 **셋 다 20px** 이라, 28px 배지에
 * `rounded-xl` 을 얹으면 반지름이 변의 절반을 넘어 **완전한 원**이 된다 — 위 「왜 원형이
 * 아닌가」가 막으려는 바로 그 모양이다. 그래서 크기마다 변 대비 0.3 안팎이 되는 단을 쓴다.
 */
const SIZE: Record<BotAvatarSize, { box: string; radius: string; text: string; icon: string }> = {
  sm: { box: 'h-7 w-7',   radius: 'rounded-sm', text: 'text-xs',  icon: 'h-3.5 w-3.5' }, //  28 / 8
  md: { box: 'h-9 w-9',   radius: 'rounded-md', text: 'text-sm',  icon: 'h-4 w-4' },     //  36 / 14
  lg: { box: 'h-11 w-11', radius: 'rounded-md', text: 'text-lg',  icon: 'h-5 w-5' },     //  44 / 14
  xl: { box: 'h-14 w-14', radius: 'rounded-lg', text: 'text-2xl', icon: 'h-6 w-6' },     //  56 / 20
};

/** 과목 → 봇 이름 순으로 첫 글자 하나. 서러게이트 쌍을 쪼개지 않으려고 `Array.from` 을 쓴다. */
function botInitial(subject?: string | null, name?: string | null): string | null {
  return Array.from(subject?.trim() ?? '')[0] ?? Array.from(name?.trim() ?? '')[0] ?? null;
}

export interface BotAvatarProps {
  /** 과목 — 이니셜의 1순위 출처. 「통합과학」처럼 긴 이름도 그대로 넘긴다. */
  subject?: string | null;
  /** 봇 이름 — 과목이 없을 때의 2순위 출처. */
  name?: string | null;
  size?: BotAvatarSize;
  /** 지금 보고 있는 봇 — 면을 blue-700 으로 채우고 글자를 흰색으로 뒤집는다. */
  active?: boolean;
  className?: string;
}

export function BotAvatar({ subject, name, size = 'md', active = false, className }: BotAvatarProps) {
  const spec = SIZE[size];
  const initial = botInitial(subject, name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-bold',
        spec.box,
        spec.radius,
        initial === null
          ? 'bg-pullim-slate-100 text-pullim-slate-400'
          : active
            ? 'bg-pullim-blue-700 text-white'
            : 'bg-pullim-blue-50 text-pullim-blue-700',
        initial !== null && spec.text,
        className,
      )}
    >
      {initial ?? <Bot className={spec.icon} />}
    </span>
  );
}
