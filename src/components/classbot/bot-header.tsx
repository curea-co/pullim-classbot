import { Sparkles, Shield, GraduationCap } from 'lucide-react';
import { myClassBot, scopeMeta } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 학생 뷰 — 봇 정체성 헤더 (디지털 분신 강조).
 * 핸드오프 7.1 (봇 정체성).
 *
 * `headingLevel` — 봇 이름을 어떤 시맨틱으로 렌더링할지.
 * 페이지 1차 헤더로 쓰일 땐 'h1', 다른 헤더가 있거나 온보딩 데모처럼
 * 미리보기 안에서 쓰일 땐 'h2'/'span'로 강등.
 */
export function BotHeader({
  compact,
  headingLevel = 'h1',
}: {
  compact?: boolean;
  headingLevel?: 'h1' | 'h2' | 'span';
}) {
  const bot = myClassBot;
  const scope = scopeMeta[bot.scope];
  const NameTag = headingLevel;

  return (
    <section
      className={cn(
        'rounded-2xl border bg-gradient-to-br from-pullim-slate-900 to-pullim-blue-900 p-4 text-white shadow-lg',
        compact ? '' : 'p-5',
      )}
    >
      <div className="flex items-start gap-3">
        {/* 봇 아바타 — 교사의 디지털 분신을 의미 */}
        <div className="relative shrink-0">
          <div className="bg-pullim-blue-500 ring-pullim-blue-300/50 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ring-2 ring-offset-2 ring-offset-pullim-slate-900">
            🧑‍🏫
          </div>
          {bot.isLive && (
            <span className="bg-pullim-danger absolute -right-1 -bottom-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase">
              <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
              LIVE
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-pullim-blue-200 text-[10px] font-semibold tracking-wider uppercase">
            클래스봇 · {bot.organization}
          </div>
          <NameTag className="block text-lg font-bold tracking-tight">{bot.name}</NameTag>
          <p className="text-pullim-blue-100/80 text-xs">
            <GraduationCap className="-mt-0.5 mr-0.5 inline h-3 w-3" />
            {bot.teacherName}의 디지털 분신 · {bot.subject} · {bot.grade}
          </p>
        </div>
      </div>

      {/* 봇 범위 배지 — 학생은 변경 불가, 한글 라벨 우선 + 코드 괄호 ([07 § 5.3]) */}
      <div className="bg-white/10 backdrop-blur mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
        <Shield className="text-pullim-lemon h-3.5 w-3.5" />
        <span className="font-semibold">{scope.label}</span>
        <span className="font-mono text-[9px] text-white/55">({scope.short})</span>
        <span className="text-white/60 ml-auto text-[10px]">
          선생님이 설정 · {scope.allow}
        </span>
      </div>

      {/* 라이브 수업 진행 상태 */}
      {bot.isLive && bot.currentLesson && (
        <div className="border-t border-white/10 mt-3 flex items-center gap-2 pt-3 text-xs">
          <Sparkles className="text-pullim-lemon h-3.5 w-3.5" />
          <span className="text-white/80">지금</span>
          <span className="font-semibold">{bot.currentLesson.title}</span>
          <span className="text-white/60 ml-auto font-mono">
            {bot.currentLesson.startedAt}~ · {bot.currentLesson.studentCount}명 참여
          </span>
        </div>
      )}
    </section>
  );
}
