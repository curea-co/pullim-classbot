'use client';

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  /** 튜터 1개 이상 등록 */
  enrolled: boolean;
  /** 학습 목표 1개 이상 */
  hasGoal: boolean;
  /** 학습(점검) 1회 이상 — streak.count > 0 */
  studied: boolean;
  /** 목표/학습 단계 링크용 (등록된 첫 튜터) */
  firstTutorId?: string;
}

/**
 * 시작 가이드 체크리스트 — 신규 사용자 온보딩 3단계.
 * 완료 상태는 self-learning 스토어의 실제 신호에서 파생(가짜 상태 없음).
 * 모두 완료되면 숨김. 색: 홈 color-palette 스캔 → blue/slate 만(완료 체크도 blue).
 */
export function OnboardingChecklist({ enrolled, hasGoal, studied, firstTutorId }: OnboardingChecklistProps) {
  const learnHref = firstTutorId ? `/classbot/learn/${firstTutorId}` : '/classbot/discover';
  const steps = [
    { label: '튜터 등록하기', done: enrolled, href: '/classbot/discover', cta: '봇 마켓' },
    { label: '학습 목표 정하기', done: hasGoal, href: enrolled ? learnHref : '/classbot/discover', cta: enrolled ? '목표 정하기' : '먼저 등록' },
    { label: '첫 학습 완료하기', done: studied, href: enrolled ? learnHref : '/classbot/discover', cta: enrolled ? '학습 시작' : '먼저 등록' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length) return null; // 온보딩 완료 → 숨김

  const nextIdx = steps.findIndex(s => !s.done);

  return (
    <section className="bg-card border-pullim-blue-100 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-pullim-slate-900 text-sm font-bold">시작 가이드</h2>
        <span className="text-pullim-slate-500 text-xs font-semibold">{doneCount}/{steps.length} 완료</span>
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const isNext = i === nextIdx;
          return (
            <li
              key={s.label}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2.5',
                s.done
                  ? 'border-pullim-blue-200 bg-pullim-blue-50/50'
                  : isNext
                    ? 'border-pullim-blue-300 bg-white'
                    : 'border-pullim-slate-200 bg-white',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  s.done ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-500',
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 text-sm font-semibold',
                  s.done ? 'text-pullim-slate-400 line-through' : 'text-pullim-slate-900',
                )}
              >
                {s.label}
              </span>
              {!s.done && isNext && (
                <Link
                  href={s.href}
                  className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white transition-colors"
                >
                  {s.cta}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
