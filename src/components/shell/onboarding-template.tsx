import Link from 'next/link';
import { ArrowRight, Clock, Star, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OnboardingStep = {
  Icon: LucideIcon;
  title: string;
  description: string;
  /** 선택적 bullet 포인트 */
  bullets?: string[];
  /** 선택적 단계 CTA */
  cta?: { label: string; href: string };
  /** 시그니처 단계 — 강조 */
  signature?: boolean;
  /** 화면 미리보기 (실제 컴포넌트 또는 간이 mockup) */
  screenshot?: React.ReactNode;
  /** 스크린샷 캡션 (선택) */
  screenshotCaption?: string;
};

type Props = {
  /** 기능 이름 */
  featureName: string;
  /** 헤더용 아이콘 */
  Icon: LucideIcon;
  /** 1줄 한 문장 정체성 */
  identity: string;
  /** 예상 소요 시간 (분) */
  estimatedMin: number;
  /** 단계들 */
  steps: OnboardingStep[];
  /** 가이드 끝의 최종 CTA */
  finalCta: { label: string; href: string };
};

/**
 * 기능별 "소개하기" 페이지 — 단계별 사용법 가이드.
 * 각 단계에 실제 컴포넌트 또는 mockup 스크린샷을 첨부해 시각적으로 안내.
 */
export function OnboardingTemplate({
  featureName, Icon, identity, estimatedMin, steps, finalCta,
}: Props) {
  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <header className="from-pullim-blue-700 to-pullim-blue-500 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase">
            <span className="bg-white/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <Icon className="h-3 w-3" />
              소개하기
            </span>
            <span className="text-pullim-lemon inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {estimatedMin}분 가이드
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {featureName} 처음이라면
          </h1>
          <p className="text-pullim-blue-100 mt-1.5 text-sm leading-relaxed">{identity}</p>
        </div>
      </header>

      {/* 단계 카드 — 알터네이팅 좌/우 */}
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i}>
            <StepCard step={step} index={i} />
          </li>
        ))}
      </ol>

      {/* 최종 CTA */}
      <section className="from-pullim-blue-600 to-pullim-blue-500 rounded-2xl bg-gradient-to-br p-5 text-center text-white">
        <h2 className="text-lg font-bold tracking-tight">준비됐어요</h2>
        <p className="text-pullim-blue-100 mt-1 text-sm">
          이제 직접 사용해 보세요. 막히면 언제든 이 페이지로 돌아올 수 있어요.
        </p>
        <Link
          href={finalCta.href}
          className="text-pullim-blue-700 mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-sm hover:scale-[1.02] transition-transform"
        >
          {finalCta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function StepCard({ step, index }: { step: OnboardingStep; index: number }) {
  const isOdd = index % 2 === 1; // 짝수(0,2,4) = 텍스트 좌 / 홀수(1,3) = 텍스트 우

  return (
    <article
      className={cn(
        'bg-card relative rounded-2xl border p-4 transition-all',
        step.signature && 'ring-pullim-warn/30 ring-2',
      )}
    >
      <div className={cn(
        'grid grid-cols-1 gap-4',
        step.screenshot && 'lg:grid-cols-[1fr_minmax(0,420px)]',
        step.screenshot && isOdd && 'lg:grid-cols-[minmax(0,420px)_1fr]',
      )}>
        {/* 텍스트 영역 */}
        <div className={cn('flex items-start gap-4', step.screenshot && isOdd && 'lg:order-2')}>
          {/* 단계 번호 + 이모지 */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full font-mono text-sm font-bold',
                step.signature
                  ? 'bg-pullim-warn text-white'
                  : 'bg-pullim-blue-50 text-pullim-blue-700',
              )}
            >
              {index + 1}
            </span>
            <step.Icon aria-hidden className="text-pullim-blue-600 h-6 w-6" />
          </div>

          {/* 본문 */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">
                {step.title}
              </h2>
              {step.signature && (
                <span className="bg-pullim-warn inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <Star className="h-2 w-2 fill-current" aria-hidden />
                  시그니처
                </span>
              )}
            </div>
            <p className="text-pullim-slate-700 mt-1 text-sm leading-relaxed">
              {step.description}
            </p>

            {step.bullets && step.bullets.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {step.bullets.map((b, j) => (
                  <li key={j} className="text-pullim-slate-600 flex items-start gap-1.5 text-xs">
                    <span className="text-pullim-blue-500 mt-0.5 shrink-0">·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {step.cta && (
              <Link
                href={step.cta.href}
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
              >
                {step.cta.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* 스크린샷 영역 */}
        {step.screenshot && (
          <div className={cn('min-w-0', isOdd && 'lg:order-1')}>
            {step.screenshot}
            {step.screenshotCaption && (
              <p className="text-pullim-slate-400 mt-1.5 text-center text-[10px] italic">
                {step.screenshotCaption}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
