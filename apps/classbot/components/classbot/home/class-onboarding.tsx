'use client';

const steps: { num: number; label: string; desc: string }[] = [
  // 세 단계 모두 설명을 둔다 — 일부만 두면 목록이 어긋나 보인다.
  // hero 안내문과 겹치지 않게, 각 단계에서 "그다음 무엇이 열리는지"를 적는다.
  {
    num: 1,
    label: '참여 코드 등록하기',
    desc: '코드를 넣으면 그 반의 봇과 과제가 열려요.',
  },
  {
    num: 2,
    label: '배정 과제 확인하기',
    desc: '마감이 가까운 과제가 위에 놓여요.',
  },
  {
    num: 3,
    label: '봇과 이야기하며 풀기',
    desc: '과제를 열면 봇과 주고받으며 풀고, 그 과정이 선생님께 전달돼요.',
  },
];

/**
 * 교사 수업 진행 방식 안내 — 정적 가이드.
 * 클래스 참여(코드 등록) 전 화면이므로 완료 상태를 추적하지 않는다.
 * 참여·배정·풀이 흐름이 실제로 연결되기 전까지는 "무엇을 하게 되는지"만 보여준다.
 */
export function ClassOnboarding() {
  return (
    <section className="rounded-2xl border border-pullim-slate-200 bg-white p-4 shadow-pullim-xs">
      <p className="mb-3 text-sm font-bold text-pullim-slate-900">교사 수업은 이렇게 진행돼요</p>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.num} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pullim-blue-600 text-xs font-bold text-white">
              {step.num}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-pullim-slate-800">{step.label}</p>
              <p className="mt-0.5 text-xs text-pullim-slate-500">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
