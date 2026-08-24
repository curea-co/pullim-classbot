'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { currentPersona } from '@/lib/mock';
import type { Assignment } from '@/lib/mock';
import { Chip } from '@/components/ui/chip';

function pickNextAction(incomplete: Assignment[]): { title: string; dDay: string; href: string } | null {
  if (incomplete.length === 0) return null;
  // Priority: '오늘' > 'D-1' > first
  const today = incomplete.find(a => a.dDay === '오늘');
  if (today) return { title: today.title, dDay: today.dDay, href: today.solveHref ?? '/classbot/assignment' };
  const d1 = incomplete.find(a => a.dDay === 'D-1');
  if (d1) return { title: d1.title, dDay: d1.dDay, href: d1.solveHref ?? '/classbot/assignment' };
  const first = incomplete[0];
  return { title: first.title, dDay: first.dDay, href: first.solveHref ?? '/classbot/assignment' };
}

export function LearningHero({ incompleteAssignments }: { incompleteAssignments: Assignment[] }) {
  const { name, streakDays } = currentPersona;
  const nextAction = pickNextAction(incompleteAssignments);

  return (
    <section
      className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-5 shadow-pullim-sm"
    >
      {/* lemon glow depth treatment — matches existing KpiHeader */}
      <div
        aria-hidden
        className="glow-lemon absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
      />

      <div className="relative space-y-4">
        {/* Greeting row */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight text-white">
            {name}님, 오늘도 화이팅
          </h1>
          {/* Streak pill — lemon on navy */}
          <Chip tone="lemon" className="bg-pullim-lemon text-pullim-lemon-ink">
            <Flame className="h-3 w-3" aria-hidden />
            {streakDays}일째
          </Chip>
        </div>

        {/* 이어서 하기 CTA */}
        {nextAction ? (
          <Link
            href={nextAction.href}
            className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex min-h-11 items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-pullim-blue-100 mb-0.5 text-xs font-semibold uppercase tracking-wider">
                이어서 하기
              </div>
              <div className="line-clamp-1 text-sm font-bold text-white">
                {nextAction.title}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Chip tone="lemon" className="bg-pullim-lemon text-pullim-lemon-ink">
                {nextAction.dDay}
              </Chip>
              <ArrowRight className="h-4 w-4 text-white/60" aria-hidden />
            </div>
          </Link>
        ) : (
          <Link
            href="/classbot/chat"
            aria-label="봇과 대화하기"
            className="bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex min-h-11 items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
          >
            <div>
              <div className="text-pullim-blue-100 mb-0.5 text-xs font-semibold uppercase tracking-wider">
                이어서 하기
              </div>
              <div className="text-sm font-bold text-white">대화</div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/60 shrink-0" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
