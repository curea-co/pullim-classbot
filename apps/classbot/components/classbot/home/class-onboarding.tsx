'use client';

import { KeyRound, ClipboardList, Rocket } from 'lucide-react';

interface ClassOnboardingProps {
  hasCode: boolean;
  hasAssignment: boolean;
  hasLive: boolean;
}

const steps = [
  {
    num: 1,
    icon: KeyRound,
    label: '참여 코드 등록하기',
    desc: '선생님께 코드를 받아 입력하면 클래스에 연결됩니다.',
    ctaHref: undefined,
    ctaLabel: undefined,
    key: 'hasCode' as keyof ClassOnboardingProps,
  },
  {
    num: 2,
    icon: ClipboardList,
    label: '배정 과제 확인하기',
    desc: '선생님이 과제를 배정하면 받은 과제 탭에 표시됩니다.',
    ctaHref: '/classbot/assignment',
    ctaLabel: '과제 보기 →',
    key: 'hasAssignment' as keyof ClassOnboardingProps,
  },
  {
    num: 3,
    icon: Rocket,
    label: '라이브 수업 참여하기',
    desc: '선생님이 라이브를 시작하면 알림과 함께 입장할 수 있습니다.',
    ctaHref: undefined,
    ctaLabel: undefined,
    key: 'hasLive' as keyof ClassOnboardingProps,
  },
];

export function ClassOnboarding({ hasCode, hasAssignment, hasLive }: ClassOnboardingProps) {
  const values = { hasCode, hasAssignment, hasLive };
  const completedCount = steps.filter((s) => values[s.key]).length;

  return (
    <section className="rounded-2xl border border-pullim-slate-200 bg-white p-4 shadow-pullim-xs">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-pullim-slate-900">교사 수업 시작 가이드</p>
        <span className="text-xs font-semibold text-pullim-slate-400">{completedCount}/3 완료</span>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => {
          const done = values[step.key];
          const Icon = step.icon;
          return (
            <li
              key={step.num}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                done ? 'bg-pullim-slate-50 opacity-50' : 'bg-white'
              }`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-pullim-slate-200 text-pullim-slate-400'
                    : 'bg-pullim-blue-600 text-white'
                }`}
              >
                {done ? '✓' : step.num}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${done ? 'text-pullim-slate-400 line-through' : 'text-pullim-slate-800'}`}>
                  {step.label}
                </p>
                {!done && (
                  <p className="mt-0.5 text-xs text-pullim-slate-500">{step.desc}</p>
                )}
              </div>
              {!done && step.ctaHref && (
                <a
                  href={step.ctaHref}
                  className="shrink-0 rounded-lg bg-pullim-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-pullim-blue-700"
                >
                  {step.ctaLabel}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
