import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * 카드 전체가 링크인 요약 카드 — KpiStat 과 같은 생김새.
 *
 * KpiStat 의 `action` 은 카드 **안에** 또 다른 클릭 대상(텍스트 링크)을 만든다.
 * 카드가 곧 액션인 자리에서는 이걸 쓴다 — 누를 데가 카드 하나뿐이라 중첩이 없다.
 *
 * 쓰지 않는 자리: 같은 화면 안 앵커 이동(#section). 그건 액션이 아니라 스크롤이라
 * 숫자만 남기고 링크를 걷어내는 게 맞다.
 */
export interface KpiStatLinkProps {
  label: string;
  value: string;
  /** 다른 화면으로 나가는 길. 같은 화면 앵커(#…)는 넣지 않는다. */
  href: string;
}

export function KpiStatLink({ label, value, href }: KpiStatLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className="group bg-pullim-slate-50/50 hover:bg-pullim-blue-50 focus-visible:ring-pullim-blue-400/50 flex h-full flex-col rounded-lg px-3 py-2 transition-colors outline-none focus-visible:ring-2"
      >
        <span className="text-pullim-slate-500 group-hover:text-pullim-blue-700 inline-flex items-center gap-1 text-2xs font-semibold tracking-wider uppercase">
          {label}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        <span className="text-pullim-slate-900 mt-0.5 font-mono text-base font-bold">{value}</span>
      </Link>
    </li>
  );
}
