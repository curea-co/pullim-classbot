import Link from 'next/link';
import { ArrowRight, Lock, Star, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ValueBullet = {
  Icon: LucideIcon;
  label: string;
  description: string;
};

type SubRoute = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  locked?: boolean;
  signature?: boolean;
};

type Props = {
  /** 정체성 — 한 문장 (이 섹션이 다른 기능과 다른 점) */
  identity: string;
  /** 핵심 가치 3개 (이 섹션이 무엇을 해주나) */
  values: ValueBullet[];
  /** Sub-route 진입 카드들 */
  subRoutes: SubRoute[];
  /** 시그니처 컨텐츠 슬롯 — 미리보기 1~2개 */
  preview?: React.ReactNode;
};

/**
 * 섹션 소개 페이지 공통 패턴.
 * 정체성 → 핵심 가치 → sub-route 카드 → 시그니처 미리보기.
 */
export function SectionIntro({ identity, values, subRoutes, preview }: Props) {
  return (
    <div className="space-y-5">
      {/* 정체성 + 핵심 가치 */}
      <section className="from-pullim-blue-700 to-pullim-blue-500 relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl xl:p-6">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
        />
        <div className="relative">
          <h2 className="text-pullim-lemon text-[10px] font-bold tracking-wider uppercase">
            이 섹션의 정체성
          </h2>
          <p className="mt-1.5 text-base font-semibold leading-relaxed text-white xl:text-lg">
            {identity}
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {values.map(v => (
              <li key={v.label} className="bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <v.Icon aria-hidden className="text-pullim-lemon h-4 w-4" />
                  <span className="text-pullim-blue-100 text-[10px] font-bold tracking-wider uppercase">
                    {v.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-snug text-white/90">{v.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sub-route 진입 카드 */}
      <section>
        <h3 className="text-pullim-slate-900 mb-2.5 text-sm font-bold tracking-tight">
          이 섹션 안에서 할 수 있는 것
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {subRoutes.map(s => <SubRouteCard key={s.href} sub={s} />)}
        </div>
      </section>

      {/* 시그니처 미리보기 */}
      {preview}
    </div>
  );
}

function SubRouteCard({ sub }: { sub: SubRoute }) {
  const Icon = sub.icon;
  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            sub.signature ? 'bg-pullim-warn text-white' : 'bg-pullim-blue-50 text-pullim-blue-600',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {sub.locked ? (
          <Lock className="text-pullim-slate-300 h-3.5 w-3.5" />
        ) : (
          <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 transition-colors" />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <h4 className="text-pullim-slate-900 text-sm font-bold tracking-tight">{sub.label}</h4>
        {sub.signature && (
          <span className="bg-pullim-warn inline-flex items-center justify-center rounded-full px-1 py-0.5 text-white">
            <Star className="h-2 w-2 fill-current" aria-hidden />
          </span>
        )}
      </div>
      <p className="text-pullim-slate-500 mt-0.5 line-clamp-2 text-[11px] leading-snug">
        {sub.description}
      </p>
    </>
  );

  if (sub.locked) {
    return <div aria-disabled className={baseClass(sub)}>{content}</div>;
  }
  return <Link href={sub.href} className={baseClass(sub)}>{content}</Link>;
}

function baseClass(sub: SubRoute): string {
  return cn(
    'group bg-card flex h-full flex-col rounded-xl border p-3.5 transition-all',
    sub.locked
      ? 'opacity-60 cursor-not-allowed border-dashed'
      : 'hover:border-pullim-blue-300 hover:shadow-pullim-md',
    sub.signature && !sub.locked && 'ring-pullim-warn/30 ring-2',
  );
}
