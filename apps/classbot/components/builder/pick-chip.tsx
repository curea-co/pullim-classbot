'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 하나만 고르는 칩(학년) · 여러 개 고르는 칩(반) 공용.
 * 모양은 출제 화면의 학생 고르기 칩과 같은 것을 쓴다 — 교사가 같은 손짓을 두 번 배우지 않게.
 */
export function PickChip({
  active, label, onSelect, role, ...rest
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
  /** 하나만 고르면 radio, 여러 개 고르면 생략(aria-pressed 로 말한다) */
  role?: 'radio';
  'data-testid'?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === 'radio' ? active : undefined}
      aria-pressed={role === 'radio' ? undefined : active}
      onClick={onSelect}
      data-testid={rest['data-testid']}
      className={cn(
        'focus-visible:ring-pullim-blue-400/50 flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1.5 text-xs font-bold transition-all outline-none focus-visible:ring-3',
        active
          ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
          : 'border-pullim-slate-200 text-pullim-slate-600 hover:border-pullim-slate-400 bg-white',
      )}
    >
      {active && <Check className="h-3 w-3" aria-hidden />}
      {label}
    </button>
  );
}
