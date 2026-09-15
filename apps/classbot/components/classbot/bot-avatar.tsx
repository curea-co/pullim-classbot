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
 * 그리고 **색이 나르는 정보가 애초에 없다.** 「어느 봇인가」는 아래 「같은 화면이 이미 말한다」가
 * 세어 둔 대로 **글자가 이미 말하고 있어서**, 색은 그 말을 한 번 더 하는 대신 hue 예산만 쓴다.
 *
 * 면은 **한 농도**다 — 연한 배경(`blue-50`)에 진한 글자(`blue-700`). [07 § 4.6.2] 가 말하는
 * 「한 색 두 농도」는 **이 한 면 안에서** 이미 성립하므로, 활성 상태로 면을 뒤집는 축은 두지
 * 않는다. 뒤집는 자리가 실제로 생기는 PR 이 그때 넣으면 된다.
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
 * (「수학봇」→「수」), 둘 다 없을 때만 lucide `Bot` 글리프다 — **면은 그대로 두고 글자만 바뀐다**
 * (아래 「폴백도 **같은 면**인 까닭」).
 *
 * ## 같은 화면이 이미 말한다 — 호출부 21곳 전수
 *
 * `grep -rn '<BotAvatar[ />]' apps/classbot/{app,components}` 를 실제로 돌려 **21곳을 하나씩
 * 열어 확인한 결과**다(패턴에 `[ />]` 를 붙이는 것은 이 파일의 `BotAvatarSize` 선언과 바로 이
 * 문단 자신이 섞여 들어오기 때문이다). 세는 기준은 「봇을 가리키는 **글자**가 어디 있나」다.
 *
 *  - **18곳** — 봇 **이름**이 같은 카드 안에 글자로 선다(대개 과목도 함께).
 *  - **1곳** — 이름이 카드 **밖**, 바로 위 페이지 제목에 있다
 *    (`marketplace/marketplace-bot-detail.tsx` — 그 자리 주석이 까닭을 적는다: 한 화면에
 *    같은 글자가 두 번 서면 둘 중 무엇이 제목인지 안 읽힌다).
 *  - **1곳** — 봇 **이름은 없고 과목**이 바로 옆 메타 줄에 선다
 *    (`app/(parent)/parent/page.tsx` — 학부모 홈은 「어느 반인가」를 묻는 목록이라 반 이름이
 *    제목 자리를 가져간다).
 *  - **1곳** — 봇을 가리키는 글자가 **아예 없다**(`components/classbot/home/joined-classes.tsx`).
 *    겹친 배지 스택이고, 그 자리가 말하는 것은 「이 방들이 내 방이다」라는 **덩어리**이지 개별
 *    봇이 아니다. 그래서 호출부가 스택을 통째로 `aria-hidden` 으로 감싸 두었다 — 우연이 아니라
 *    그 자리의 의도다.
 *
 * 그러니 참인 명제는 「이름이 **언제나** 옆에 있다」가 아니라 **「봇 이름 또는 과목이 같은
 * 화면에 글자로 선다 — 봇을 하나씩 가리키는 자리라면」**이다. 새 호출부를 놓을 때 지킬 것도
 * 그 문장이다: **이름도 과목도 없는 자리에 이 배지만 달지 마라.** 배지는 봇을 *알아보게*
 * 돕는 표시이지 봇을 *말하는* 수단이 아니다.
 *
 * ## 왜 늘 `aria-hidden` 인가
 *
 * 배지가 그리는 글자(과목 첫 글자)를 위 전수대로 **화면이 이미 말하고 있다.** 읽히면
 * 「수 수학봇」처럼 같은 글자를 두 번 듣게 된다. 그래서 루트에 `aria-hidden` 을 고정한다 —
 * 호출부가 끄지 못한다. 유일하게 글자가 없는 `joined-classes` 는 개별 봇을 가리키려는 자리가
 * 아니라서(위) 읽힐 것이 애초에 없다.
 *
 * ## 폴백도 **같은 면**인 까닭
 *
 * 과목도 이름도 없는 봇은 실제로 도달한다 — 담은 봇 카드의 「지금은 마켓에 없는 봇」이 그
 * 경로다(`my-bots/my-bot-card.tsx`). 그때 달라지는 것은 **면이 아니라 글리프**다. 이니셜
 * 대신 lucide `Bot` 이 서는 것으로 「모르는 봇」은 이미 말해진다.
 *
 * 한동안 그 자리에 중립 슬레이트 면을 깔았는데 **근거가 되는 조항이 없었다.**
 * [07 § 4.6.2] 는 면을 **브랜드 블루 단색 하나**로 말하고, [08 § 14.1.1] 예외 2 는 폴백에
 * 대해 **글리프만** 지정하지 면을 말하지 않는다. 「한 색」이라 적힌 계약 아래 면을 둘로
 * 늘리려면 세 번째 면을 명문화하는 문서 변경이 **먼저** 있어야 하는데, 여기서 얻는 것이
 * 없다 — [08 § 1.3] 도 위계를 **한 hue 안의 명도**로 표현하라고 적는다.
 *
 * 대비도 통일하는 쪽이 낫다. `blue-700` on `blue-50` = **8.12:1** 로, 종전 슬레이트 면의
 * 최선(slate-600, 6.72:1)보다 높고 나머지 면과 자릿수가 같다.
 * (값은 토큰 이름으로만 적는다 — `scripts/check-design-gates.mjs` 의 gate 2 가 `components/`
 * 안의 6자리 hex 를 **주석인지 코드인지 가리지 않고** 막는다.) (슬레이트를 쓰던 동안 이 자리는
 * slate-400 **2.30:1** 이라 비-텍스트 3:1 에도 못 미쳤고, slate-500 도 **4.10:1** 로 AA 4.5 에
 * 닿지 않았다 — 면을 하나로 합치면서 그 계산이 통째로 필요 없어졌다.)
 */

export type BotAvatarSize = 'sm' | 'base' | 'md' | 'lg' | 'xl';

/**
 * 크기별 규격 — 28 / 32 / 36 / 44 / 56.
 *
 * ⚠️ **`sm`·`md`·`lg` 는 「박스 이름」이고 radius 이름과 1:1 이 아니다.** `size="lg"`(44px)가
 * `rounded-md`(14)를 쓰는 식이라, 두 축을 이름으로 맞춰 읽으면 틀린다 — **radius 는 아래
 * 꼬리 주석의 px 로 읽어라.** 두 축이 어긋난 까닭은 바로 다음 문단에 있다.
 *
 * `base` 32 는 **대화 화면이 요구한 칸**이다. [08 § 15.1.1] 이 봇 연속 발화를 「아바타 생략 +
 * **32px** 들여쓰기」로 못 박아, 첫 발화 아바타도 그 폭이어야 두 줄의 왼쪽 끝이 맞는다.
 * 이름이 `sm`·`md` 사이에 끼는 것은 타입 스케일(`text-sm` 15 · `text-base` 16 · `text-lg` 18)과
 * 같은 자리 감각이다 — 이미 쓰이는 28/36/44/56 을 되이름 붙이지 않으려고 이 축을 골랐다.
 *
 * radius 는 앱 스케일(`rounded-sm` 8 · `rounded-md` 14 · `rounded-lg` 20)에서 고른다.
 * 이 앱의 `rounded-lg`·`rounded-xl`·`rounded-2xl` 은 **셋 다 20px** 이라, 28px 배지에
 * `rounded-xl` 을 얹으면 반지름이 변의 절반을 넘어 **완전한 원**이 된다 — 위 「왜 원형이
 * 아닌가」가 막으려는 바로 그 모양이다. 그래서 크기마다 변 대비 0.3 안팎이 되는 단을 쓴다.
 * 32 에 `rounded-md` 를 얹으면 14/32 = **0.44** 로 이 축에서 가장 둥근 칸이 된다 — 바로 옆
 * 36px 보다 더 둥글어 순서가 뒤집힌다. 그래서 8(0.25)을 쓴다.
 */
const SIZE: Record<BotAvatarSize, { box: string; radius: string; text: string; icon: string }> = {
  sm:   { box: 'h-7 w-7',   radius: 'rounded-sm', text: 'text-xs',  icon: 'h-3.5 w-3.5' }, //  28 / 8
  base: { box: 'h-8 w-8',   radius: 'rounded-sm', text: 'text-xs',  icon: 'h-4 w-4' },     //  32 / 8
  md:   { box: 'h-9 w-9',   radius: 'rounded-md', text: 'text-sm',  icon: 'h-4 w-4' },     //  36 / 14
  lg:   { box: 'h-11 w-11', radius: 'rounded-md', text: 'text-lg',  icon: 'h-5 w-5' },     //  44 / 14
  xl:   { box: 'h-14 w-14', radius: 'rounded-lg', text: 'text-2xl', icon: 'h-6 w-6' },     //  56 / 20
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
  className?: string;
}

export function BotAvatar({ subject, name, size = 'md', className }: BotAvatarProps) {
  const spec = SIZE[size];
  const initial = botInitial(subject, name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-bold',
        spec.box,
        spec.radius,
        // 면은 **하나**다 — 폴백도 같은 면이다(머리주석 「폴백도 같은 면인 까닭」).
        'bg-pullim-blue-50 text-pullim-blue-700',
        // 글자 크기는 이니셜일 때만. 글리프는 `spec.icon` 이 제 크기를 들고 온다.
        initial !== null && spec.text,
        className,
      )}
    >
      {initial ?? <Bot className={spec.icon} />}
    </span>
  );
}
