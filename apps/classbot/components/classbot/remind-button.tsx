'use client';

import { BellRing, Check } from 'lucide-react';
import { classRoster } from '@/lib/mock';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useInterventionStore, useRemindedStudentIds } from '@/lib/store/interventions';
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
  targetStudentIds = [],
}: {
  assignmentId: string;
  botId: string;
  title: string;
  /** 발사 대상 학생 — 빈 배열 = 반 전체 (Assignment.targetStudentIds 규약과 동일) */
  targetStudentIds?: string[];
}) {
  const hydrated = useStoresHydrated(useInterventionStore, useAssignmentStore);
  const submissions = useAssignmentStore((s) => s.submissions);
  const send = useInterventionStore((s) => s.send);
  const reminded = useRemindedStudentIds(assignmentId);

  if (!hydrated) return null;

  const submitted = new Set(
    submissions.filter((s) => s.assignmentId === assignmentId).map((s) => s.studentId),
  );
  // 부분 대상 발사면 그 학생들만 — 반 전체로 새는 리마인드 방지 (Codex #184).
  // 전체 발사([])의 이상적 스코프는 "해당 botId 의 enrollment"이나, mock 은 단일 교실 roster 만
  // 보유(봇별 roster 데이터 부재) — classRoster 가 곧 그 교실. 봇별 스코프는 BE 연동 시 함께 (R3 한계 문서화).
  const eligible =
    targetStudentIds.length === 0
      ? classRoster
      : classRoster.filter((r) => targetStudentIds.includes(r.id));
  const notSubmitted = eligible.filter((r) => !submitted.has(r.id));
  if (notSubmitted.length === 0) return null;

  // 학생 단위 dedup — 이미 받은 학생 제외, 새 미제출자에게는 재발송 가능 (Codex #184 R2)
  const toRemind = notSubmitted.filter((r) => !reminded.has(r.id));
  const alreadySent = toRemind.length === 0;

  const handleSend = () => {
    for (const student of toRemind) {
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
          미제출 {toRemind.length}명 리마인드
        </>
      )}
    </button>
  );
}
