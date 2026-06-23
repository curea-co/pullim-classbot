'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { botSignature } from '@/lib/tokens/bot-signature';
import type { WellnessBotComment } from '@/lib/mock/classbot-wellness-bot';

export function WellnessNudge({ comment }: { comment: WellnessBotComment }) {
  const sig = botSignature(comment.bot);

  return (
    <section>
      <div
        className="bg-card rounded-xl border border-pullim-slate-100 border-l-4 p-4 shadow-pullim-xs"
        style={{ borderLeftColor: sig.hex }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: sig.hex }}
          >
            {comment.bot.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-500 mb-1 text-xs font-semibold">
              {comment.bot.name} · 웰빙 한 마디
            </div>
            <p className="text-pullim-slate-900 text-sm leading-snug">{comment.text}</p>
            <Link
              href={comment.ctaHref ?? '/classbot/wellness'}
              className="focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 mt-3 inline-flex min-h-8 items-center gap-1 rounded-full bg-pullim-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-pullim-blue-700"
            >
              {comment.ctaLabel}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
