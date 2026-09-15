import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPI_BOX, KPI_LABEL, KPI_VALUE, type KpiSize } from './kpi-stat';

/**
 * 카드 전체가 링크인 요약 카드 — KpiStat 과 같은 생김새.
 *
 * KpiStat 의 `action` 은 카드 **안에** 또 다른 클릭 대상(텍스트 링크)을 만든다.
 * 카드가 곧 액션인 자리에서는 이걸 쓴다 — 누를 데가 카드 하나뿐이라 중첩이 없다.
 *
 * 쓰지 않는 자리: 같은 화면 안 앵커 이동(#section). 그건 액션이 아니라 스크롤이라
 * 숫자만 남기고 링크를 걷어내는 게 맞다.
 *
 * ⚠ 밑선을 맞추는 것은 두 가지다 — **같은 클래스 상수**와 **같은 포매팅 컨텍스트**.
 * 칸·라벨·값 클래스는 `kpi-stat.tsx` 의 `KPI_BOX`/`KPI_LABEL`/`KPI_VALUE` 를 그대로 쓰고,
 * 안쪽 `<a>` 는 KpiStat 의 `<li>` 와 같은 **블록 컨테이너**로 둔다. 예전에는 여기가
 * `flex flex-col` 이라 라벨이 blockify 되었고, 그 결과 클래스를 똑같이 맞춰도 익명 line box
 * 의 strut 만큼(4~6px) 값의 밑선이 이웃 KpiStat 과 어긋났다.
 *
 * 다른 것은 배경이 `<li>` 가 아니라 안쪽 `<a>` 에 붙는 것과 hover/focus·ArrowRight 뿐이다 —
 * 칸 전체가 클릭 영역이어야 해서다. `tone`·`onDark` 는 이 부품이 받지 않는다.
 */
export interface KpiStatLinkProps {
  label: string;
  value: string;
  /** 다른 화면으로 나가는 길. 같은 화면 앵커(#…)는 넣지 않는다. */
  href: string;
  /** 칸 크기. 보통은 감싸는 KpiStatBar 가 내려 준다. */
  size?: KpiSize;
}

export function KpiStatLink({ label, value, href, size = 'md' }: KpiStatLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          // block — KpiStat 의 <li> 와 같은 포매팅 컨텍스트. flex 로 두면 밑선이 어긋난다.
          'group block h-full transition-colors outline-none',
          KPI_BOX,
          'hover:bg-pullim-blue-50 focus-visible:ring-pullim-blue-400/50 focus-visible:ring-2',
        )}
      >
        <div className={cn(KPI_LABEL[size], 'text-pullim-slate-500 group-hover:text-pullim-blue-700')}>
          {label}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        <div className={cn(KPI_VALUE[size], 'text-pullim-slate-900')}>{value}</div>
      </Link>
    </li>
  );
}
KpiStatLink.kpiSizeAware = true as const;
