'use client';
import { useStudentMode } from '@/lib/store/student-mode';
import { cn } from '@/lib/utils';

const MODES = [
  { key: 'class', label: '교사 수업' },
  { key: 'self',  label: '자기주도' },
] as const;

/** 학생 학습 모드 토글 — 교사 수업 ↔ 자기주도. 학생 셸 전용. */
export function StudentModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useStudentMode();
  return (
    <div role="tablist" aria-label="학습 모드" className={cn('bg-pullim-slate-100 inline-flex rounded-pill p-0.5', className)}>
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(m.key)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-xs font-bold transition-colors min-h-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
              active ? 'bg-card text-pullim-blue-700 shadow-pullim-xs' : 'text-pullim-slate-500 hover:text-pullim-slate-700',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
