'use client';

import { KeyRound, ClipboardList, Rocket } from 'lucide-react';

const steps = [
  {
    num: 1,
    icon: KeyRound,
    label: '참여 코드 등록하기',
    desc: '선생님께 코드를 받아 입력하면 클래스에 연결됩니다.',
  },
  {
    num: 2,
    icon: ClipboardList,
    label: '배정 과제 확인하기',
    desc: '선생님이 과제를 배정하면 받은 과제에 표시됩니다.',
  },
  {
    num: 3,
    icon: Rocket,
    label: '라이브 수업 참여하기',
    desc: '선생님이 라이브를 시작하면 알림과 함께 입장할 수 있습니다.',
  },
];

/**
 * 교사 수업 진행 방식 안내 — 정적 가이드.
 * 클래스 참여(코드 등록) 전 화면이므로 완료 상태를 추적하지 않는다.
 * 참여·배정·라이브 흐름이 실제로 연결되기 전까지는 "무엇을 하게 되는지"만 보여준다.
 */
export function ClassOnboarding() {
  return (
    <section className="rounded-2xl border border-pullim-slate-200 bg-white p-4 shadow-pullim-xs">
      <p className="mb-3 text-sm font-bold text-pullim-slate-900">교사 수업은 이렇게 진행돼요</p>
      <ol className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.num} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pullim-blue-600 text-xs font-bold text-white">
                {step.num}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-pullim-slate-800">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-pullim-slate-400" /> {step.label}
                </p>
                <p className="mt-0.5 text-xs text-pullim-slate-500">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
