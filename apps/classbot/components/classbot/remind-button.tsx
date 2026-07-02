'use client';

import { BellRing, Check } from 'lucide-react';
import { classRoster } from '@/lib/mock';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useInterventionStore, useHasRemindFor } from '@/lib/store/interventions';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 진행률 행 [미제출 N명 리마인드] — 교사 개입 remind 쓰기 표면.
 * spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §4.
 * 미제출 = classRoster − 해당 과제 제출자. 발송 시 학생별 remind 이벤트(제목 포함 문구).
 * 같은 과제 재발송은 이벤트 존재로 파생해 비활성(persist). hydration 게이트.
 */
export function RemindButton({
  assignmentId,
  botId,
  title,
}: {
  assignmentId: string;
  botId: string;
  title: string;
}) {
  const hydrated = useStoresHydrated(useInterventionStore, useAssignmentStore);
  const submissions = useAssignmentStore((s) => s.submissions);
  const send = useInterventionStore((s) => s.send);
  const alreadySent = useHasRemindFor(assignmentId);

  if (!hydrated) return null;

  const submitted = new Set(
    submissions.filter((s) => s.assignmentId === assignmentId).map((s) => s.studentId),
  );
  const notSubmitted = classRoster.filter((r) => !submitted.has(r.id));
  if (notSubmitted.length === 0) return null;

  const handleSend = () => {
    for (const student of notSubmitted) {
      send({
        type: 'remind',
        botId,
        studentId: student.id,
        assignmentId,
        message: `'${title}' 과제가 아직 제출 전이에요. 마감 전에 도전해 볼까요?`,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={alreadySent}
      className={
        alreadySent
          ? 'text-pullim-slate-400 border-pullim-slate-200 inline-flex min-h-11 items-center gap-1 rounded-lg border px-2.5 text-2xs font-bold'
          : 'text-pullim-blue-600 border-pullim-blue-200 hover:bg-pullim-blue-50 inline-flex min-h-11 items-center gap-1 rounded-lg border px-2.5 text-2xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400'
      }
    >
      {alreadySent ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden />
          리마인드 보냄
        </>
      ) : (
        <>
          <BellRing className="h-3.5 w-3.5" aria-hidden />
          미제출 {notSubmitted.length}명 리마인드
        </>
      )}
    </button>
  );
}
