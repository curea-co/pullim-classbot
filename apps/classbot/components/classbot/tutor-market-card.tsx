'use client';

import { botSignature } from '@/lib/tokens/bot-signature';
import { useSelfLearningStore, useIsEnrolled } from '@/lib/store/self-learning';
import type { OfficialTutor } from '@/lib/mock/classbot-official';
import { cn } from '@/lib/utils';
import { Check, Plus } from 'lucide-react';

export function TutorMarketCard({ tutor }: { tutor: OfficialTutor }) {
  const sig = botSignature(tutor);
  const enrolled = useIsEnrolled(tutor.id);
  const { enroll, unenroll } = useSelfLearningStore();

  return (
    <div
      className="bg-card flex items-center gap-3 rounded-2xl border-l-4 border border-transparent p-4 shadow-pullim-xs"
      style={{ borderLeftColor: sig.hex }}
    >
      <span className="bg-pullim-slate-100 grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl">
        {tutor.avatarEmoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-pullim-slate-900">{tutor.name}</p>
        <p className="text-xs text-pullim-slate-500">
          {tutor.subject} · {tutor.grade}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-pullim-slate-600">{tutor.tagline}</p>
      </div>
      <button
        type="button"
        onClick={() => (enrolled ? unenroll(tutor.id) : enroll(tutor.id))}
        aria-pressed={enrolled}
        className={cn(
          'inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-bold',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
          enrolled
            ? 'bg-pullim-blue-50 text-pullim-blue-700'
            : 'bg-pullim-blue-600 text-white',
        )}
      >
        {enrolled ? (
          <>
            <Check className="h-3.5 w-3.5" />
            등록됨
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            등록
          </>
        )}
      </button>
    </div>
  );
}
