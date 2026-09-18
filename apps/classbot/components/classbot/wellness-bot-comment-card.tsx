'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { useClassBots } from '@/lib/store/mode-bots';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { useSelfLearningStore } from '@/lib/store/self-learning';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { botSignature } from '@/lib/tokens/bot-signature';

/**
 * 웰빙 허브 담당 봇 코멘트 카드 ([13 § 3.3.3·9.3]).
 *
 * enrollment 권위(class-enrollment 스토어)를 구독해 봇을 결정한다. 그 스토어는 localStorage
 * 복원을 기다리므로 카드가 **자기 하이드레이션을 스스로 문다** — 복원 전에는 이 카드만
 * 안 그리고 웰빙 허브의 나머지 칸은 그대로 선다. 참여 코드로 들어온 학생도 join·나가기에
 * reactive 하게 spec 필수 카드를 받는다. 봇이 없으면(미참여) 렌더하지 않는다.
 *
 * *(`[2026-09-18 정정]` 종전 주석은 분리 이유를 「웰빙 페이지가 **서버 컴포넌트라** client
 * localStorage 의 enrollment 를 읽을 수 없어서」라고 적었다. 그 페이지는 데모 「서연」 대신
 * 실 신원을 보려고 client 로 내려갔다 — 분리의 이유는 이제 서버/클라이언트 경계가 아니라
 * 위의 하이드레이션 경계다.)*
 */
export function WellnessBotCommentCard({ studentId }: { studentId: string }) {
  // hydration 전에는 모드/봇이 빈 상태 → 잘못된/누락 코멘트 대신 미렌더(자연스러운 등장).
  // 하이드레이션만 본다 — 종전엔 `useStudentMode().hydrated` 를 썼는데, 그 훅은 폐기된 학습
  // 모드 스토어를 함께 기다린다(2026-09-09 개정 박스 §⑤ — §4 의 `student-mode` 스토어 폐기).
  // 여기 필요한 것은 **`useClassBots()` 가 읽는 두 스토어**의 복원 여부다.
  const hydrated = useStoresHydrated(useClassEnrollmentStore, useSelfLearningStore);
  const enrolledBots = useClassBots();
  const botComment = hydrated ? getWellnessBotComment(studentId, enrolledBots) : null;
  if (!botComment) return null;

  const sig = botSignature(botComment.bot);
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-2 flex items-center gap-2">
        <BotAvatar subject={botComment.bot.subject} name={botComment.bot.name} size="sm" />
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
        className="hover:bg-pullim-slate-50 mt-3 inline-flex items-center gap-1 rounded-full border-[1.5px] bg-transparent px-3 py-1.5 text-2xs font-bold transition-colors"
        // [13 § 456] 봇 코멘트 카드 CTA 는 봇 시그니처 ghost — 어느 봇이 말을 건 것인지가 행동까지 이어진다
        style={{ borderColor: sig.inkLight, color: sig.inkLight }}
      >
        {botComment.ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
