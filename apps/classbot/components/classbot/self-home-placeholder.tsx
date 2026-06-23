'use client';

import Link from 'next/link';
import { BookOpen, Compass, Flame, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { useEnrolledTutors, useStreak, useTodayOneThing } from '@/lib/store/self-learning';
import { MyTutorCard } from '@/components/classbot/my-tutor-card';
import { Chip } from '@/components/ui/chip';

/** 자기주도 모드 홈 — PR3: 오늘의 한 가지 + streak 추가. */
export function SelfHomePlaceholder() {
  const tutors = useEnrolledTutors();
  const streak = useStreak();
  const one = useTodayOneThing();

  return (
    <div className="space-y-4">
      <section className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-4 shadow-pullim-sm">
        <div className="text-pullim-blue-100 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> 자기주도 학습
        </div>
        <h2 className="mt-1 text-xl font-bold">내 속도로, 내 목표로</h2>
        <p className="text-white/80 mt-1 text-sm">공식 튜터를 골라 개념부터 점검까지 스스로 학습해요.</p>
      </section>

      {tutors.length > 0 && (
        <div className="space-y-3">
          {/* Streak badge */}
          {streak.count > 0 ? (
            <Chip tone="lemon">
              <Flame className="h-3.5 w-3.5" />
              {streak.count}일째
            </Chip>
          ) : (
            <Chip tone="neutral">
              오늘 시작해요
            </Chip>
          )}

          {/* 오늘의 한 가지 card */}
          {one !== null ? (
            <Link
              href={`/classbot/learn/${one.tutor.id}`}
              className="bg-card flex min-h-11 items-center gap-3 rounded-2xl border border-pullim-blue-100 p-4 shadow-pullim-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 hover:bg-pullim-slate-50 transition-colors"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pullim-blue-50">
                <BookOpen className="h-5 w-5 text-pullim-blue-500" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-semibold uppercase tracking-wider text-pullim-blue-400">오늘의 한 가지</p>
                <p className="truncate text-sm font-bold text-pullim-slate-900">
                  {one.tutor.name} · {one.unit.title}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href={`/classbot/learn/${tutors[0].id}`}
              className="bg-card flex min-h-11 items-center gap-3 rounded-2xl border border-pullim-slate-200 p-4 shadow-pullim-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 hover:bg-pullim-slate-50 transition-colors"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pullim-slate-100">
                <BookOpen className="h-5 w-5 text-pullim-slate-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-semibold uppercase tracking-wider text-pullim-slate-400">오늘의 한 가지</p>
                <p className="text-sm text-pullim-slate-500">튜터의 단원을 목표로 추가해 보세요</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <SectionHeading title="내 튜터" />
      {tutors.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="아직 등록한 튜터가 없어요"
          description="봇 마켓에서 과목 튜터를 골라 학습을 시작해 보세요."
          action={{ href: '/classbot/discover', label: '봇 마켓 둘러보기' }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tutors.map((t) => (
            <MyTutorCard key={t.id} tutor={t} />
          ))}
        </div>
      )}
    </div>
  );
}
