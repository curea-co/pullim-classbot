'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { getOfficialTutor } from '@/lib/mock/classbot-official';
import { getUnitContent } from '@/lib/mock/classbot-learning-content';
import { useUnitProgress, useSelfLearningStore } from '@/lib/store/self-learning';
import { botSignature } from '@/lib/tokens/bot-signature';
import BackLink from '@/components/classbot/back-link';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/classbot/empty-state';
import { QuizRunner } from '@/components/classbot/quiz-runner';
import { cn } from '@/lib/utils';

type Step = 'concept' | 'practice' | 'check';

const STEPS: { key: Step; label: string }[] = [
  { key: 'concept', label: '개념' },
  { key: 'practice', label: '연습' },
  { key: 'check', label: '점검' },
];

export default function UnitPage({
  params,
}: {
  params: Promise<{ tutorId: string; unitId: string }>;
}) {
  const { tutorId, unitId } = use(params);

  // ── Store hooks (unconditional) ──────────────────────────────────────────
  const progress = useUnitProgress(tutorId, unitId);
  const completeStep = useSelfLearningStore((s) => s.completeStep);

  // ── Derived data (unconditional) ─────────────────────────────────────────
  const tutor = getOfficialTutor(tutorId);
  const unit = tutor?.curriculum.find((u) => u.id === unitId);
  const content = getUnitContent(tutorId, unitId);

  // ── Initial step: first incomplete step ─────────────────────────────────
  const initialStep: Step = !progress.concept
    ? 'concept'
    : !progress.practice
      ? 'practice'
      : 'check';

  // ── Local state (unconditional — must be before early returns) ───────────
  const [activeStep, setActiveStep] = useState<Step>(initialStep);
  const [checkRetry, setCheckRetry] = useState(0);

  // ── Early returns (after all hooks) ─────────────────────────────────────
  if (!tutor || !unit || !content) {
    const backHref = tutor ? `/classbot/learn/${tutorId}` : '/classbot';
    const backLabel = tutor ? '커리큘럼으로' : '홈으로';
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="단원을 찾을 수 없어요"
          description="삭제되었거나 잘못된 경로일 수 있어요."
          action={{ href: backHref, label: backLabel }}
        />
      </div>
    );
  }

  const sig = botSignature(tutor);
  const isDone = progress.check;

  // ── Step content ─────────────────────────────────────────────────────────

  function renderConceptStep() {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          {content!.concept.map((para, i) => (
            <p
              key={i}
              className="text-pullim-slate-700 text-sm leading-relaxed"
            >
              {para}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            completeStep(tutorId, unitId, 'concept');
            setActiveStep('practice');
          }}
          className="ml-auto flex min-h-[44px] items-center rounded-xl bg-pullim-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-pullim-blue-700 outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50"
        >
          이해했어요
        </button>
      </div>
    );
  }

  function renderPracticeStep() {
    return (
      <QuizRunner
        key="practice"
        questions={content!.practice}
        ctaLabel="연습 완료"
        onComplete={() => {
          completeStep(tutorId, unitId, 'practice');
          setActiveStep('check');
        }}
      />
    );
  }

  function renderCheckStep() {
    if (isDone) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-pullim-success/30 bg-pullim-success-bg px-6 py-10 text-center">
          <span className="text-4xl" aria-hidden>🎉</span>
          <p className="text-pullim-slate-900 text-base font-bold">단원 완료!</p>
          <p className="text-pullim-slate-500 text-sm">
            {unit!.title} 단원을 모두 마쳤어요. 수고했어요!
          </p>
          <Link
            href={`/classbot/learn/${tutorId}`}
            className="mt-1 inline-flex min-h-[44px] items-center rounded-xl bg-pullim-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-pullim-blue-700 outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50"
          >
            커리큘럼으로
          </Link>
        </div>
      );
    }

    return (
      <QuizRunner
        key={`check-${checkRetry}`}
        questions={content!.check}
        ctaLabel="점검 완료"
        onComplete={(passed) => {
          if (passed) {
            completeStep(tutorId, unitId, 'check');
            // isDone will flip on next render from store
          } else {
            setCheckRetry((n) => n + 1);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <BackLink href={`/classbot/learn/${tutorId}`}>커리큘럼으로</BackLink>

      <PageHeader
        eyebrow={{ text: tutor.subject }}
        title={unit.title}
        description={tutor.name}
        action={
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: sig.hex }}
            aria-hidden="true"
          />
        }
      />

      {/* Stepper tabs */}
      <nav
        role="tablist"
        aria-label="학습 단계"
        className="flex gap-1 rounded-xl bg-pullim-slate-100 p-1"
      >
        {STEPS.map(({ key, label }) => {
          const isActive = activeStep === key;
          const isDoneStep =
            key === 'concept'
              ? progress.concept
              : key === 'practice'
                ? progress.practice
                : progress.check;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStep(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                isActive
                  ? 'bg-white text-pullim-slate-900 shadow-sm'
                  : 'text-pullim-slate-500 hover:text-pullim-slate-700',
              )}
            >
              {isDoneStep && !isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-pullim-success" aria-hidden />
              )}
              {label}
            </button>
          );
        })}
      </nav>

      {/* Step content */}
      <section role="tabpanel" aria-label={STEPS.find((s) => s.key === activeStep)?.label}>
        {activeStep === 'concept' && renderConceptStep()}
        {activeStep === 'practice' && renderPracticeStep()}
        {activeStep === 'check' && renderCheckStep()}
      </section>
    </div>
  );
}
