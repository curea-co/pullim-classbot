import { Shield } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { scopeMeta } from '@/lib/mock';
import { botSignature } from '@/lib/tokens/bot-signature';
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
          <div
            className={cn(
              'ring-pullim-blue-300/50 flex items-center justify-center rounded-2xl text-2xl ring-2 ring-offset-2 ring-offset-pullim-slate-900',
              collapsed ? 'h-10 w-10 text-lg' : 'h-14 w-14',
              bot.isLive && 'pullim-anim-bot-breath',
            )}
            style={{ backgroundColor: sig.hex }}
          >
            {bot.avatarEmoji}
          </div>
          {bot.isLive && (
            <span className="bg-pullim-danger absolute -right-1 -bottom-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase">
              <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
              LIVE
            </span>
          )}
        </div>

        {/* 정체성 컬럼 */}
        <div className="min-w-0 flex-1">
          {/* org eyebrow — collapsed 시 숨김 */}
          {!collapsed && (
            <div className="text-pullim-blue-200 text-[10px] font-semibold tracking-wider uppercase">
              클래스봇 · {bot.organization}
            </div>
          )}

          {/* 봇 이름 */}
          <NameTag className="block text-lg font-bold tracking-tight">{bot.name}</NameTag>

          {/* 선생님 디지털 분신 suffix */}
          {!collapsed && (
            <p className="text-pullim-blue-100/80 text-xs">
              {bot.teacherName}의 디지털 분신
            </p>
          )}

          {/* scope 배지 */}
          {!collapsed && (
            <div className="bg-white/10 backdrop-blur mt-2 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs">
              <Shield className="text-pullim-lemon h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">{scope.label}</span>
              <span className="font-mono text-[9px] text-white/55">({scope.short})</span>
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
            <span className="bg-white/10 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {bot.subject}
            </span>
            <span className="bg-white/10 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {bot.grade}
            </span>
            <span className="bg-white/10 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {bot.tone}
            </span>
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
