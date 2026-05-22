import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import {
  currentPersona, classRoster, getCheckInsForStudent, hasTodayCheckIn, moodMeta,
} from '@/lib/mock';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';

export default function WellnessPage() {
  const me = classRoster.find(s => s.name === currentPersona.name) ?? classRoster[0];
  const checkIns = getCheckInsForStudent(me.id);
  const checkedToday = hasTodayCheckIn(me.id);
  // [13 § 3.3.3·9.3] 담당 봇 코멘트 — 가장 낮은 5지표 영역의 봇 자동 매칭
  const botComment = getWellnessBotComment(me.id);

  return (
    <div className="space-y-4">
      <Link
        href="/classbot"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        클래스봇 홈
      </Link>

      <PageHeader
        eyebrow={{ icon: Heart, text: '내 웰빙' }}
        title="오늘 어땠어요?"
        description={checkedToday ? '오늘 체크인 완료 — 내일 또 와주세요.' : '아직 체크인 전이에요.'}
      />

      {/* 오늘 체크인 CTA */}
      <Link
        href="/classbot/wellness/check-in"
        className={cn(
          'flex items-center gap-3 rounded-2xl p-4 transition-colors',
          checkedToday
            ? 'bg-pullim-blue-50 hover:bg-pullim-blue-100 border-pullim-blue-200 border'
            : 'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
        )}
      >
        <span className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
          checkedToday ? 'bg-pullim-blue-100' : 'bg-white/15',
        )}>
          {checkedToday ? '✅' : '💭'}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-bold', checkedToday ? 'text-pullim-blue-700' : 'text-white')}>
            {checkedToday ? '오늘 체크인 완료' : '30초 체크인 시작'}
          </div>
          <div className={cn('text-[11px]', checkedToday ? 'text-pullim-slate-600' : 'text-pullim-blue-100')}>
            {checkedToday ? '다시 작성하고 싶으면 들어와도 돼요' : '하나만 고르면 끝이에요'}
          </div>
        </div>
        <ArrowRight className={cn('h-4 w-4', checkedToday ? 'text-pullim-blue-700' : 'text-white')} />
      </Link>

      <WellbeingGauge studentId={me.id} />

      {/* 담당 봇 코멘트 카드 — [13 § 3.3.3·9.3] 좌측 라이너 4px + 아바타 + 이름 + 시간 + 시그니처 ghost CTA */}
      {botComment && (() => {
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
                <p className="text-pullim-slate-500 text-[11px]">{botComment.weakArea}이 이번 주 가장 낮아요</p>
              </div>
              <Sparkles className="text-pullim-slate-300 h-3 w-3" />
            </header>
            <p className="text-pullim-slate-700 mt-1 text-[13px] leading-relaxed">
              &ldquo;{botComment.text}&rdquo;
            </p>
            <Link
              href={botComment.ctaHref}
              className="mt-3 inline-flex items-center gap-1 rounded-full border-[1.5px] bg-transparent px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-pullim-slate-50"
              style={{ borderColor: sig.inkLight, color: sig.inkLight }}
            >
              {botComment.ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        );
      })()}

      {/* 주간 감정 그래프 */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="주간 기분 기록" description="이번 주의 나" />
        {checkIns.length === 0 ? (
          <p className="text-pullim-slate-400 py-6 text-center text-[11px]">
            아직 기록이 없어요. 오늘부터 시작해봐요.
          </p>
        ) : (
          <ul className="space-y-1">
            {checkIns.map(c => {
              const m = moodMeta[c.mood];
              return (
                <li key={c.id} className="bg-pullim-slate-50/50 flex items-center gap-3 rounded-lg p-2">
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-pullim-slate-900 text-xs font-bold">
                      {c.daysAgo === 0 ? '오늘' : `${c.daysAgo}일 전`} · {m.label}
                    </div>
                    {c.freeText && (
                      <div className="text-pullim-slate-500 mt-0.5 truncate text-[11px]">
                        &ldquo;{c.freeText}&rdquo;
                      </div>
                    )}
                  </div>
                  {c.intensity && (
                    <span className="text-pullim-slate-400 font-mono text-[10px]">
                      강도 {c.intensity}/5
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 곁에 있어 메시지 — 웰빙 60 미만일 때 */}
      {me.wellbeing < 60 && (
        <section className="bg-pullim-slate-900 text-white rounded-2xl p-4">
          <h3 className="text-pullim-lemon inline-flex items-center gap-1 text-sm font-bold">
            <Heart className="h-3.5 w-3.5" />
            선생님이 곁에 있어요
          </h3>
          <p className="text-pullim-slate-300 mt-2 text-[12px] leading-relaxed">
            이번 주 좀 무거웠어요. 혼자 끌어안지 않아도 돼요. 봇이든 선생님이든 언제든 말 걸어주세요.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/classbot/chat"
              className="bg-pullim-lemon text-pullim-lemon-ink inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold"
            >
              <MessageCircle className="h-3 w-3" />
              봇과 대화
            </Link>
          </div>
        </section>
      )}

      {/* 본인 리포트 진입 */}
      <Link
        href="/classbot/me/report"
        className="bg-pullim-slate-50 hover:bg-pullim-slate-100 flex items-center justify-between rounded-2xl p-4 transition-colors"
      >
        <div>
          <div className="text-pullim-slate-900 text-sm font-bold">이번 주의 나</div>
          <div className="text-pullim-slate-500 text-[11px]">내 주간 리포트 보기</div>
        </div>
        <ArrowRight className="text-pullim-slate-500 h-4 w-4" />
      </Link>

      <FlywheelNote>
        매일 30초 체크인이 쌓이면 봇이 더 정확하게 도와줄 수 있어요. 부담 없이 편하게.
      </FlywheelNote>
    </div>
  );
}
