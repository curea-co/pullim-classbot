import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** 핵심 정보 (단원, 시간, 정답률 등) — 진하게 강조 */
  primary: ReactNode;
  /** 부가 정보 (SKU, 출처, 카운트 등) — 옅게 */
  secondary?: ReactNode;
  /** 두 영역 연결자 */
  separator?: 'dot' | 'pipe' | 'break';
  /** 폰트 크기 — xs: 10/11px, sm: 11/12px */
  size?: 'xs' | 'sm';
  /** 다크 카드 위에서 사용 (slate-950 배경) */
  tone?: 'light' | 'dark';
  className?: string;
};

/**
 * 메타데이터 2-단계 렌더러 — Layer 1 §14.1 "메타 hierarchy 2단계" 룰 준수.
 *
 * - primary: slate-700 (light) / slate-200 (dark) — 스캔 시 먼저 잡혀야 할 핵심
 * - secondary: slate-400 (light) / slate-500 (dark) — 부가 정보
 *
 * 카드/리스트 행에서 ≥3 메타 항목을 한 단계 회색으로 늘어놓던 패턴을
 * "primary · secondary"로 분리하기 위한 공통 컴포넌트.
 */
export function MetaRow({
  primary,
  secondary,
  separator = 'dot',
  size = 'xs',
  tone = 'light',
  className,
}: Props) {
  const primaryCls =
    tone === 'dark' ? 'text-pullim-slate-200' : 'text-pullim-slate-700';
  const secondaryCls =
    tone === 'dark' ? 'text-pullim-slate-500' : 'text-pullim-slate-400';
  const sepCls =
    tone === 'dark' ? 'text-pullim-slate-700' : 'text-pullim-slate-300';
  const primarySize = size === 'sm' ? 'text-xs' : 'text-[11px]';
  const secondarySize = size === 'sm' ? 'text-[11px]' : 'text-[10px]';

  if (separator === 'break' || !secondary) {
    return (
      <div className={cn('flex flex-col gap-0.5', className)}>
        <span className={cn(primaryCls, primarySize, 'font-semibold')}>{primary}</span>
        {secondary && (
          <span className={cn(secondaryCls, secondarySize)}>{secondary}</span>
        )}
      </div>
    );
  }

  const sepChar = separator === 'pipe' ? '|' : '·';

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5', className)}>
      <span className={cn(primaryCls, primarySize, 'font-semibold')}>{primary}</span>
      <span className={cn(sepCls, secondarySize)} aria-hidden>{sepChar}</span>
      <span className={cn(secondaryCls, secondarySize)}>{secondary}</span>
    </div>
  );
}
