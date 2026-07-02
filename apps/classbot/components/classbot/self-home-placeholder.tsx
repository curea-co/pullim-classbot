'use client';

import Link from 'next/link';
import { BookOpen, Compass, Flame } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { useEnrolledTutors, useStreak, useTodayOneThing, useGoals } from '@/lib/store/self-learning';
import { MyTutorCard } from '@/components/classbot/my-tutor-card';
import { WelcomeHero } from '@/components/classbot/home/welcome-hero';
import { OnboardingChecklist } from '@/components/classbot/home/onboarding-checklist';
import { LightDayNudge } from '@/components/classbot/home/light-day-nudge';
import { useLowConditionToday } from '@/lib/mock/classbot-light-day';
import { useLightDayOn, useLightDayActions, useLightDayStore } from '@/lib/store/light-day';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { todayKey } from '@/lib/store/today-key';
import { useCurrentUser } from '@/lib/current-user';
import { Chip } from '@/components/ui/chip';

/**
 * 자기주도 모드 홈 = 출시 신규 사용자 기본 홈.
 * 환영 hero + 시작 가이드(온보딩) + 내 튜터(없으면 봇 마켓 유도).
 */
export function SelfHomePlaceholder() {
  const tutors = useEnrolledTutors();
  const streak = useStreak();
  const goals = useGoals();
  const one = useTodayOneThing();
  const me = useCurrentUser();
  // 가벼운 모드(Light Day) — class 홈과 동일 신호/상태 배선 (spec §6). todayKey 는 같은 날 안정적.
  const lowToday = useLowConditionToday(me.id);
  const lightOn = useLightDayOn(todayKey());
  const { enable: enableLight, disable: disableLight } = useLightDayActions();
  const lightHydrated = useStoresHydrated(useLightDayStore);
  const lightDay = lightHydrated && lightOn;

  return (
    <div className="space-y-5">
      <WelcomeHero name={me.isAuthenticated ? me.name : undefined} hasTutors={tutors.length > 0} />

      {/* 저조 신호 & 아직 opt-in 전 → 넛지 (hydration 후에만, spec §8).
          튜터 없으면 미노출 — 가볍게 할 학습 자체가 없고, 해제 UI(오늘의 한 가지 블록)도 없어
          opt-in 시 같은 날 되돌릴 수 없는 상태에 빠진다 (Codex #182). */}
      {lightHydrated && lowToday && !lightOn && tutors.length > 0 && (
        <LightDayNudge onEnable={() => enableLight(todayKey())} />
      )}

      <OnboardingChecklist
        enrolled={tutors.length > 0}
        hasGoal={goals.length > 0}
        studied={streak.count > 0}
        firstTutorId={tutors[0]?.id}
      />

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

          {/* 라이트 데이 — 오늘의 한 가지는 그대로 1개, 부드러운 카피만 얹는다 (spec §8) */}
          {lightDay && (
            <p className="text-pullim-slate-500 text-xs">오늘은 이것 하나만 해도 충분해요.</p>
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

          {/* 라이트 데이 해제 — 평소대로 복귀 */}
          {lightDay && (
            <button
              type="button"
              onClick={disableLight}
              className="text-pullim-blue-600 hover:text-pullim-blue-700 min-h-11 rounded-lg px-1 text-xs font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
            >
              평소대로 보기
            </button>
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
