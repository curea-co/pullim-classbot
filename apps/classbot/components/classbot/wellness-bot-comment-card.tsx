'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { useModeBots } from '@/lib/store/mode-bots';
import { useStudentMode } from '@/lib/store/student-mode';
import { botSignature } from '@/lib/tokens/bot-signature';

/**
 * 웰빙 허브 담당 봇 코멘트 카드 ([13 § 3.3.3·9.3]).
 *
 * enrollment 권위(class-enrollment 스토어)를 구독해 봇을 결정한다. 웰빙 페이지는 서버
 * 컴포넌트라 client localStorage의 enrollment를 읽을 수 없으므로, 이 카드만 클라이언트로
 * 분리해 참여 코드로 들어온 학생도 spec 필수 카드를 보장한다(join/나가기에 reactive).
 * 봇이 없으면(미참여) 렌더하지 않는다.
 */
export function WellnessBotCommentCard({ studentId }: { studentId: string }) {
  // hydration 전에는 모드/봇이 빈 상태 → 잘못된/누락 코멘트 대신 미렌더(자연스러운 등장).
  const { hydrated } = useStudentMode();
  const modeBots = useModeBots();
  const botComment = hydrated ? getWellnessBotComment(studentId, modeBots) : null;
  if (!botComment) return null;

  const sig = botSignature(botComment.bot);
  return (
    <section
      className="bg-card rounded-2xl border border-l-[4px] p-4"
      style={{ borderLeftColor: sig.hex }}
    >
      <header className="mb-2 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: sig.hex }}
        >
          {botComment.bot.avatarEmoji}
        </span>
        <div className="min-w-0 flex-1">
          {/* [13 § 9.3] 메타 토큰 — 12px(`text-xs`) text.tertiary(`text-pullim-slate-400`) */}
          <div className="inline-flex items-center gap-1.5 text-xs">
            <span className="text-pullim-slate-900 font-bold">{botComment.bot.name}</span>
            <span className="text-pullim-slate-400 font-normal">· {botComment.generatedAt}</span>
          </div>
          {/* [13 § 8.3] 학생 가시 영역 — "낮아요"/"부족" 금지, "신경 쓸 부분"으로 완화 */}
          <p className="text-pullim-slate-500 text-2xs">{botComment.weakArea}이 이번 주 신경 쓸 부분이에요</p>
        </div>
        <Sparkles className="text-pullim-slate-300 h-3 w-3" />
      </header>
      <p className="text-pullim-slate-700 mt-1 text-sm leading-relaxed">
        &ldquo;{botComment.text}&rdquo;
      </p>
      <Link
        href={botComment.ctaHref}
        className="mt-3 inline-flex items-center gap-1 rounded-full border-[1.5px] bg-transparent px-3 py-1.5 text-2xs font-bold transition-colors hover:bg-pullim-slate-50"
        style={{ borderColor: sig.inkLight, color: sig.inkLight }}
      >
        {botComment.ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
