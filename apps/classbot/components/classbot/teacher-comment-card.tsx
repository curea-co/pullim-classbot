'use client';

import { MessageCircle } from 'lucide-react';
import { useAssignmentComment, useInterventionStore } from '@/lib/store/interventions';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 결과 페이지 "선생님 한마디" — 교사 comment 개입의 결과 표면.
 * spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §5.
 * 인박스와 같은 스토어를 읽는 파생 뷰. comment 없으면 미렌더. hydration 게이트(persist).
 */
export function TeacherCommentCard({
  assignmentId,
  studentId,
}: {
  assignmentId: string;
  studentId: string;
}) {
  const hydrated = useStoresHydrated(useInterventionStore);
  const comment = useAssignmentComment(assignmentId, studentId);

  if (!hydrated || !comment) return null;

  return (
    <section className="border-pullim-blue-100 bg-pullim-blue-50 rounded-2xl border p-4">
      <div className="flex items-start gap-2.5">
        <span className="bg-pullim-blue-600 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-pullim-blue-600 text-2xs font-bold tracking-wider uppercase">
            선생님 한마디
          </p>
          <p className="text-pullim-slate-900 mt-0.5 text-sm leading-relaxed">{comment.message}</p>
        </div>
      </div>
    </section>
  );
}
