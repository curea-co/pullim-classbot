'use client';

import { cn } from '@/lib/utils';
import { useIsGoal, useSelfLearningStore } from '@/lib/store/self-learning';
import type { TutorUnit } from '@/lib/mock/classbot-official';
import { LearningPath } from '@/components/classbot/learning-path';

export function CurriculumUnitCard({
  tutorId,
  unit,
}: {
  tutorId: string;
  unit: TutorUnit;
}) {
  const isGoal = useIsGoal(tutorId, unit.id);
  const addGoal = useSelfLearningStore((s) => s.addGoal);
  const removeGoal = useSelfLearningStore((s) => s.removeGoal);

  function handleToggle() {
    if (isGoal) {
      removeGoal(tutorId, unit.id);
    } else {
      addGoal(tutorId, unit.id);
    }
  }

  return (
    <div className="rounded-2xl border border-pullim-slate-100 bg-white p-4 shadow-sm space-y-3">
      {/* Header row: order badge + title + goal toggle */}
      <div className="flex items-center gap-3">
        {/* Order badge */}
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pullim-blue-600 font-mono text-xs font-bold text-white"
          aria-hidden="true"
        >
          {unit.order}
        </span>

        {/* Unit title */}
        <span className="flex-1 text-sm font-semibold text-pullim-slate-900 leading-snug">
          {unit.title}
        </span>

        {/* Goal toggle */}
        <button
          type="button"
          aria-pressed={isGoal}
          onClick={handleToggle}
          className={cn(
            'shrink-0 min-h-11 rounded-full px-4 text-xs font-bold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 focus-visible:ring-offset-1',
            isGoal
              ? 'bg-pullim-blue-50 text-pullim-blue-700'
              : 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700',
          )}
        >
          {isGoal ? '추가됨' : '목표 추가'}
        </button>
      </div>

      {/* Learning path scaffold */}
      <LearningPath tutorId={tutorId} unit={unit} />
    </div>
  );
}
