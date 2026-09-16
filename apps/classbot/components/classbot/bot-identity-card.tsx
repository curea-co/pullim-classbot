import { Shield } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { scopeMeta } from '@/lib/mock';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { botSignature } from '@/lib/tokens/bot-signature';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

export interface BotIdentityCardProps {
  bot: ClassBot;
  density?: 'comfortable' | 'compact';
  headingLevel?: 'h1' | 'h2' | 'span';
  collapsed?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  showSignatureLiner?: boolean;
  className?: string;
}

/**
 * 봇 정체성 패널 (다크 그라디언트).
 * 핸드오프 7.1 — 학생/교사 공유 primitive.
 *
 * density 'comfortable' → p-5 (학생 클래스봇 홈 등).
 * density 'compact'     → p-3 (온보딩 미리보기 등).
 *
 * collapsed=true → 아바타만 + 이름만 표시 (org eyebrow, chips, children 숨김).
 * showSignatureLiner → 하단 signature-color 바 (absolute, pullim-anim-liner-swipe).
 */
export function BotIdentityCard({
  bot,
  density = 'comfortable',
  headingLevel = 'h1',
  collapsed = false,
  leading,
  trailing,
  children,
  showSignatureLiner = false,
  className,
}: BotIdentityCardProps) {
  const sig = botSignature(bot);
  const scope = scopeMeta[bot.scope];
  const NameTag = headingLevel;
  const isCompact = density === 'compact';

  return (
    <section
      className={cn(
        'relative rounded-2xl border bg-gradient-to-br from-pullim-slate-900 to-pullim-blue-900 text-white shadow-pullim-lg',
        isCompact ? 'p-3' : 'p-5',
        className,
      )}
    >
      {/* 상단 행: leading + 아바타 + 정체성 컬럼 + trailing */}
      <div className="flex items-start gap-3">
        {/* leading slot */}
        {leading}

        {/* 봇 아바타 */}
        <div className="relative shrink-0">
          <BotAvatar
            subject={bot.subject}
            name={bot.name}
            size={collapsed ? 'md' : 'xl'}
            className={cn(
              'ring-pullim-blue-300/50 ring-2 ring-offset-2 ring-offset-pullim-slate-900',
              bot.isLive && 'pullim-anim-bot-breath',
            )}
          />
          {bot.isLive && (
            <span className="bg-pullim-danger absolute -right-1 -bottom-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-bold uppercase">
              <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
              LIVE
            </span>
          )}
        </div>

        {/* 정체성 컬럼 */}
        <div className="min-w-0 flex-1">
          {/* org eyebrow — collapsed 시 숨김 */}
          {!collapsed && (
            <div className="text-pullim-blue-200 text-2xs font-semibold tracking-wider uppercase">
              클래스봇 · {bot.organization}
            </div>
          )}

          {/* 봇 이름 */}
          <NameTag className="block text-lg font-bold tracking-tight">{bot.name}</NameTag>

          {/*
            봇이 무엇인지 한 줄.

            교사 봇은 **「…의 디지털 분신」 그대로다.** 그 말은 선생님의 복제라는 뜻이고
            (`07 § 1`), 교사 봇에서는 지금도 참이다 — 틀린 것은 그 말이 아니라 **주인이
            없는 봇에 붙은 것**이었다(spec `03 § 4.13.3`).

            풀림이 낸 봇에는 복제할 사람이 없으니 그 줄을 쓰지 않고, 대신 무엇인지만
            말한다. 「풀림 공식」 배지를 여기 붙이지 않은 까닭은 이 패널이 **어두운 바탕**
            이라서다 — 마켓 카드가 쓰는 `tone="info"`(연한 파랑 바탕)는 여기서 읽히지
            않고, 그렇다고 이 자리에 쓸 새 색조를 만들면 봇 표시가 화면마다 갈린다.
            줄 하나로 말하는 편이 원래 자리(사람을 가리키던 그 줄)에도 맞다.

            `isOfficial` 은 **참일 때만** 갈라 본다(`ClassBot.isOfficial?` 주석) — 마켓
            밖에서 세운 봇은 그 값을 모르고, 모르는 봇의 겉모습을 조용히 바꾸지 않는다.
          */}
          {!collapsed && (
            <p className="text-pullim-blue-100/80 text-xs">
              {bot.isOfficial ? '풀림이 만든 봇' : `${bot.teacherName}의 디지털 분신`}
            </p>
          )}

          {/* scope 배지 */}
          {!collapsed && (
            <div className="bg-white/10 backdrop-blur mt-2 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs">
              <Shield className="h-3.5 w-3.5 shrink-0 text-white" />
              <span className="font-semibold">{scope.label}</span>
              <span className="font-mono text-micro text-white/55">({scope.short})</span>
            </div>
          )}
        </div>

        {/* trailing slot */}
        {trailing}
      </div>

      {/* subject/grade chip + tone chip + children — collapsed 시 모두 숨김 */}
      {!collapsed && (
        <>
          {/* 과목·학년 chip */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="invert">{bot.subject}</Chip>
            <Chip tone="invert">{bot.grade}</Chip>
            <Chip tone="invert">{bot.tone}</Chip>
          </div>

          {/* children */}
          {children}
        </>
      )}

      {/* Signature liner */}
      {showSignatureLiner && (
        <div
          className="pullim-anim-liner-swipe pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl"
          style={{ backgroundColor: sig.hex }}
        />
      )}
    </section>
  );
}
