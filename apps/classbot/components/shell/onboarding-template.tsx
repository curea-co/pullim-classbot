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
  /** 종결 섹션 헤딩 (기본: "준비됐어요") */
  finalHeading?: string;
  /** 종결 섹션 본문 */
  finalBody?: string;
};

/**
 * 기능별 "소개하기" 페이지 — 단계별 사용법 가이드.
 * 각 단계에 실제 컴포넌트 또는 mockup 스크린샷을 첨부해 시각적으로 안내.
 */
export function OnboardingTemplate({
  featureName, Icon, identity, estimatedMin, steps, finalCta,
  finalHeading = '준비됐어요',
  finalBody = '이제 직접 사용해 보세요. 막히면 언제든 이 페이지로 돌아올 수 있어요.',
}: Props) {
  const total = steps.length;
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="from-pullim-blue-700 to-pullim-blue-500 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl sm:p-8">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-white/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <Icon className="h-3 w-3" />
              소개하기
            </span>
            <span className="text-pullim-lemon inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {estimatedMin}분 가이드
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {featureName} 처음이라면
          </h1>
          <p className="text-pullim-blue-100 mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">{identity}</p>
        </div>
      </header>

      {/* 단계 카드 — 좌측 진행 번호 + 알터네이팅 좌/우 스크린샷 */}
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={i}>
            <StepCard step={step} index={i} total={total} />
          </li>
        ))}
      </ol>

      {/* 최종 CTA — 풀폭 배너 */}
      <section className="from-pullim-blue-700 via-pullim-blue-600 to-pullim-blue-500 relative overflow-hidden rounded-2xl bg-gradient-to-br px-6 py-8 text-center text-white shadow-xl sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
        />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{finalHeading}</h2>
          <p className="text-pullim-blue-100 mt-2 text-sm leading-relaxed sm:text-base">
            {finalBody}
          </p>
          <Link
            href={finalCta.href}
            className="text-pullim-blue-700 focus-visible:ring-pullim-lemon/60 mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold shadow-lg transition-transform hover:scale-[1.02] focus-visible:ring-4"
          >
            {finalCta.label}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, index, total }: { step: OnboardingStep; index: number; total: number }) {
  const isOdd = index % 2 === 1; // 짝수(0,2,4) = 텍스트 좌 / 홀수(1,3) = 텍스트 우
  const isLast = index === total - 1;

  return (
    <article
      className={cn(
        'bg-card relative rounded-2xl border p-4 transition-all sm:p-5',
        step.signature && 'ring-pullim-lemon-ink/30 ring-2',
      )}
    >
      <div className={cn(
        'grid grid-cols-1 gap-4 sm:gap-5',
        step.screenshot && 'lg:grid-cols-[1fr_minmax(0,420px)]',
        step.screenshot && isOdd && 'lg:grid-cols-[minmax(0,420px)_1fr]',
      )}>
        {/* 텍스트 영역 */}
        <div className={cn('flex items-start gap-4', step.screenshot && isOdd && 'lg:order-2')}>
          {/* 단계 번호 + 아이콘 + 진행 connector */}
          <div className="relative flex shrink-0 flex-col items-center gap-2">
            <span
              aria-label={`${index + 1}단계 / 전체 ${total}단계`}
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-full font-mono text-base font-bold',
                step.signature
                  ? 'bg-pullim-lemon text-pullim-lemon-ink'
                  : 'bg-pullim-blue-600 text-white',
              )}
            >
              {index + 1}
            </span>
            <step.Icon aria-hidden className="text-pullim-blue-600 h-6 w-6" />
            {!isLast && (
              <span
                aria-hidden
                className="bg-pullim-blue-100 absolute top-12 left-1/2 hidden h-[calc(100%+1.25rem)] w-px -translate-x-1/2 sm:block"
              />
            )}
          </div>

          {/* 본문 */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-pullim-slate-900 text-lg font-bold tracking-tight sm:text-xl">
                {step.title}
              </h2>
              {step.signature && (
                <span className="bg-pullim-lemon text-pullim-lemon-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
                  <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
                  시그니처
                </span>
              )}
            </div>
            <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed sm:text-base">
              {step.description}
            </p>

            {step.bullets && step.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {step.bullets.map((b, j) => (
                  <li key={j} className="text-pullim-slate-600 flex items-start gap-2 text-sm leading-relaxed">
                    <span aria-hidden className="bg-pullim-blue-400 mt-2 inline-block h-1 w-1 shrink-0 rounded-full" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {step.cta && (
              <Link
                href={step.cta.href}
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 focus-visible:ring-pullim-blue-400/50 mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors focus-visible:ring-4"
              >
                {step.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* 스크린샷 영역 — 예시 배지 부착, 디자이너 캡션 제거 */}
        {step.screenshot && (
          <figure className={cn('relative min-w-0', isOdd && 'lg:order-1')} aria-label="화면 예시">
            <span className="border-pullim-slate-200 bg-pullim-slate-50 text-pullim-slate-600 absolute -top-2 right-3 z-10 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-sm">
              예시
            </span>
            {step.screenshot}
          </figure>
        )}
      </div>
    </article>
  );
}
