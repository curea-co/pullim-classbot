'use client';

import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { StepIndicator } from '@/components/builder/step-indicator';
import {
  Step1Identity, Step2Voice, Step3Materials, Step4Style,
  Step5Scope, Step6Eval, Step7Safety, Step8Deploy,
} from '@/components/builder/step-content';
import { initialForm, stepConfig, type BuilderForm } from '@/components/builder/builder-types';
import { cn } from '@/lib/utils';

/**
 * 봇 빌더 8단계 위저드 — 교사가 클래스봇을 만드는 단일 진입점.
 * 정체성 → 목소리 → 교안 → 수업방식 → Scope → 평가 → 안전 → 배포.
 */
export default function BotBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<BuilderForm>(initialForm);

  const stepInfo = stepConfig[currentStep - 1];
  const canPrev = currentStep > 1;
  const canNext = currentStep < 8;

  function goPrev() {
    if (canPrev) setCurrentStep(currentStep - 1);
  }
  function goNext() {
    // Step 1 — 이름은 필수
    if (currentStep === 1 && !form.name.trim()) {
      toast.error('봇 이름을 입력해주세요');
      return;
    }
    // Step 6 — 루브릭 합 100% 검증
    if (currentStep === 6) {
      const sum = Object.values(form.rubric).reduce((a, b) => a + b, 0);
      if (sum !== 100) {
        toast.error(`루브릭 합이 ${sum}%예요. 100%로 맞춰주세요`);
        return;
      }
    }
    if (canNext) setCurrentStep(currentStep + 1);
  }
  function jumpTo(n: number) {
    setCurrentStep(n);
  }
  function saveDraft() {
    toast.info('💾 드래프트 저장 (데모)', {
      description: `${form.name || '새 봇'} · ${currentStep}/8단계까지 작성됨`,
    });
  }

  const StepIcon = stepInfo.icon;

  return (
    <div className="space-y-5 py-4 lg:py-6">
      <PageHeader
        eyebrow={{ icon: Bot, text: '봇 빌더' }}
        title="새 클래스봇 만들기"
        description="8단계 마법사 — 학생이 만날 AI 분신을 단계별로 빚어요. 임시저장은 언제든 가능."
        action={
          <button
            type="button"
            onClick={saveDraft}
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
          >
            <Save className="h-4 w-4" />
            임시저장
          </button>
        }
      />

      <StepIndicator
        steps={stepConfig.map(s => ({ num: s.num, label: s.label, icon: s.icon }))}
        current={currentStep}
        onJump={jumpTo}
      />

      <section className="bg-card rounded-2xl border p-5 lg:p-6">
        <header className="mb-4 flex items-start gap-3 border-b pb-4">
          <div className="bg-pullim-blue-50 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
              Step {currentStep} / 8
            </div>
            <h2 className="text-pullim-slate-900 mt-0.5 text-lg font-bold tracking-tight">
              {stepInfo.title}
            </h2>
            <p className="text-pullim-slate-600 mt-1 text-xs leading-relaxed">
              {stepInfo.description}
            </p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto min-h-[40vh]">
          {currentStep === 1 && <Step1Identity form={form} setForm={setForm} />}
          {currentStep === 2 && <Step2Voice form={form} setForm={setForm} />}
          {currentStep === 3 && <Step3Materials form={form} setForm={setForm} />}
          {currentStep === 4 && <Step4Style form={form} setForm={setForm} />}
          {currentStep === 5 && <Step5Scope form={form} setForm={setForm} />}
          {currentStep === 6 && <Step6Eval form={form} setForm={setForm} />}
          {currentStep === 7 && <Step7Safety form={form} setForm={setForm} />}
          {currentStep === 8 && <Step8Deploy form={form} setForm={setForm} />}
        </div>

        {/* 푸터 — 이전/다음 (Step 8은 step 내부 하단 배포하기 CTA) */}
        <footer className="mt-5 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className={cn(
              'inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              canPrev
                ? 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200'
                : 'bg-pullim-slate-50 text-pullim-slate-300 cursor-not-allowed',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          <div className="text-pullim-slate-400 hidden sm:block text-[10px] font-mono">
            {currentStep}/8 — {stepInfo.label}
          </div>

          {canNext ? (
            <button
              type="button"
              onClick={goNext}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-pullim-slate-500 text-[11px] font-semibold">
              ↑ 위 [배포하기] 클릭으로 완료
            </span>
          )}
        </footer>
      </section>

      <FlywheelNote>
        만든 봇은 <strong>풀림 클래스봇</strong>으로 운영되고, 학생 봇 질문은
        익명화되어 다음 봇 빌더의 사고유도 모델 학습에 쓰여요. 처음 만든 봇은
        템플릿으로 동료 교사와 공유 가능.
      </FlywheelNote>
    </div>
  );
}
