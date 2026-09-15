'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, Pencil, Users } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { SectionHeading } from '@/components/shell/section-heading';
import { RemindButton } from '@/components/classbot/remind-button';
import { SubmissionStatusPanel } from '@/components/classbot/submission-status-sheet';
import { Chip } from '@/components/ui/chip';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';
import {
  buildBotIndex, progressForTargets, statusLabels, statusOf, wholeClassSize,
} from '../assignment-filters';
import { RestoreButton, WithdrawButton } from './withdraw-controls';

type Params = Promise<{ id: string }>;

/**
 * 과제 상세 — 「이 과제가 어떻게 되고 있나」 (`proc/spec/14 § 3.3.4`).
 *
 * **교사 개입이 사는 집이다.** 리마인드·코멘트·오답 다시 내기 셋은 이미 만들어져 있었는데
 * 갈 자리가 없어 봇 운영 화면(`/teacher/classbot`)에 얹혀 있었다. 이 화면이 생기면서
 * 그리로 옮겨 온다 — 새로 만드는 것이 아니라 **옮기는 것**이다. 봇 운영 화면은 제 질문
 * (「봇이 잘 돌고 있나」)으로 돌아가고, 과제 줄은 이 화면으로 가는 길만 남긴다.
 *
 * 제출 현황은 **펼친 채로 둔다** — 봇 운영 화면에서는 시트(서랍)였다. 거기서는 과제가 여럿이라
 * 서랍이 맞았지만, 여기는 과제 하나만 다루는 화면이라 한 번 더 누르게 할 이유가 없다.
 * 진행률 표와 제출 현황이 같은 학생 명단이기도 해서, 둘을 나눠 그리면 같은 명단이 두 벌이 된다.
 */
export default function TeacherAssignmentDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  return <AssignmentDetail id={id} />;
}

function AssignmentDetail({ id }: { id: string }) {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const drafts = useAssignmentStore((s) => s.drafts);
  const submissions = useAssignmentStore((s) => s.submissions);
  const hydrated = useStoresHydrated(useAssignmentStore);

  const assignment = useMemo(
    () => [...dispatched, ...drafts].find((a) => a.id === id),
    [dispatched, drafts, id],
  );
  const botIndex = useMemo(() => buildBotIndex(), []);

  if (!hydrated) {
    return (
      <TeacherPageShell
        backHref="/teacher/assignment"
        backLabel="낸 과제"
        header={{ eyebrow: { icon: ClipboardList, text: '평가' }, title: '과제 상세' }}
      >
        <div data-testid="assignment-detail-loading" className="text-pullim-slate-500 py-10 text-center text-sm">
          불러오는 중이에요…
        </div>
      </TeacherPageShell>
    );
  }

  if (!assignment) {
    /*
      persist 스토어라 「없다」는 답이 두 뜻이다 — 지운 과제이거나, 다른 브라우저에서 낸 과제이거나.
      404 로 끊지 않고 목록으로 돌려보내는 이유가 그것이다. 교사가 여기서 할 수 있는 일은 하나뿐이다.
    */
    return (
      <TeacherPageShell
        backHref="/teacher/assignment"
        backLabel="낸 과제"
        header={{ eyebrow: { icon: ClipboardList, text: '평가' }, title: '과제 상세' }}
      >
        <EmptyState
          icon={ClipboardList}
          title="이 과제를 찾지 못했어요"
          description="지워졌거나 다른 기기에서 낸 과제일 수 있어요."
          action={{ href: '/teacher/assignment', label: '낸 과제로' }}
        />
      </TeacherPageShell>
    );
  }

  const mode = assignmentModeBadge[assignment.mode];
  const status = statusOf(assignment);
  const facts = botIndex.get(assignment.botId);
  // 아래 학생별 현황 패널과 **같은 명단**에서 센다 — 세는 곳이 둘이면 갈린다
  // (`assignment-filters.ts` 의 `wholeClassSize` 주석).
  const targetCount = assignment.targetStudentIds.length || wholeClassSize();
  // 대상 밖 제출은 세지 않는다 — 아래 패널과 같은 규약(`progressForTargets` 주석).
  const { submittedCount, avgScore } = progressForTargets(assignment, submissions);
  const isDraft = status === 'draft';

  return (
    <TeacherPageShell
      backHref="/teacher/assignment"
      backLabel="낸 과제"
      header={{
        eyebrow: { icon: ClipboardList, text: '평가' },
        title: assignment.title,
        description: [
          facts?.botName ?? assignment.assignedBy,
          ...(facts?.classrooms.map((c) => c.label) ?? []),
          `${assignment.questionCount}문항`,
          `난이도 ${assignment.difficulty}`,
        ].join(' · '),
        /*
          회수된 과제에는 [고치기]를 두지 않는다 — 고쳐 놓고 되돌리면 학생이 못 보던 내용을
          갑자기 받는다. 되돌린 뒤에 고치는 순서라야 학생이 보는 것과 어긋나지 않는다
          (수정 화면도 같은 판정을 한 번 더 한다 — 주소로 바로 들어올 수 있어서).
        */
        action: (
          <div className="flex flex-wrap gap-2">
            {status === 'withdrawn' ? (
              <RestoreButton assignment={assignment} />
            ) : (
              <>
                <Link
                  href={`/teacher/assignment/${assignment.id}/edit`}
                  data-testid="assignment-edit-link"
                  className="text-pullim-slate-600 border-pullim-slate-200 hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors outline-none focus-visible:ring-2"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  고치기
                </Link>
                {status === 'live' && (
                  <WithdrawButton
                    assignment={assignment}
                    submittedCount={submittedCount}
                    targetCount={targetCount}
                  />
                )}
              </>
            )}
          </div>
        ),
      }}
    >
      {/* 이 과제가 무엇인지 — 모드·상태·마감은 한 줄에 함께 둔다. 셋이 같이 읽혀야 뜻이 선다 */}
      <div data-testid="assignment-detail-facts" className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', mode.bg, mode.fg)}>
          {mode.label}
        </span>
        <Chip tone="outline" className="py-1">{statusLabels[status]}</Chip>
        {!isDraft && (
          <span className={cn('font-mono text-2xs font-bold', assignment.dDay === 'D-1' || assignment.dDay === '오늘' ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
            {assignment.dDay} ({assignment.dueLabel})
          </span>
        )}
        <span className="text-pullim-slate-500 text-2xs">{assignment.scope}</span>
      </div>

      {/*
        한눈에 — 「평균 소요」는 두지 않는다. 문항별 풀이 시간(`TimeSegment`)이 아직 mock 에
        없어서, 자리를 만들면 그 칸이 늘 비거나 지어낸 숫자가 들어간다. 있는 것만 센다.
      */}
      <KpiStatBar cols={4}>
        <KpiStat label="대상" value={`${targetCount}명`} icon={Users} />
        <KpiStat label="제출" value={isDraft ? '—' : `${submittedCount}명`} />
        <KpiStat label="미제출" value={isDraft ? '—' : `${Math.max(targetCount - submittedCount, 0)}명`} />
        <KpiStat label="평균 점수" value={avgScore == null ? '—' : `${avgScore}점`} />
      </KpiStatBar>

      {status === 'withdrawn' ? (
        <EmptyState
          icon={ClipboardList}
          tone="plain"
          title="회수한 과제예요"
          description={
            assignment.state === 'overdue'
              ? '학생의 「받은 과제」에서는 사라졌어요. 이미 낸 답과 채점은 그대로 남아 있어요. 마감이 지나서 되돌릴 수는 없어요 — 다시 내려면 같은 내용으로 새 과제를 내주세요.'
              : '학생의 「받은 과제」에서는 사라졌어요. 이미 낸 답과 채점은 그대로 남아 있어요.'
          }
        />
      ) : isDraft ? (
        <EmptyState
          icon={ClipboardList}
          tone="plain"
          title="아직 내지 않은 과제예요"
          description="내고 나면 누가 냈고 누가 안 냈는지 여기에서 볼 수 있어요."
        />
      ) : (
        <section className="bg-card space-y-4 rounded-2xl border p-5">
          <SectionHeading
            title="학생별 현황"
            description="아직 안 낸 학생에게 한 번에 알릴 수 있어요. 낸 학생에게는 한 줄 코멘트를 보낼 수 있고요."
            action={
              <RemindButton
                assignmentId={assignment.id}
                botId={assignment.botId}
                title={assignment.title}
                targetStudentIds={assignment.targetStudentIds}
              />
            }
          />
          {/*
            시트가 아니라 패널을 그대로 놓는다 — 이 화면이 곧 그 서랍이 열려 있는 자리다
            (위 머리주석). 컴포넌트가 패널을 따로 내보내고 있어서 감싸기만 벗기면 된다.
          */}
          <SubmissionStatusPanel assignment={assignment} />
        </section>
      )}

      <p className="text-pullim-slate-500 text-2xs">
        채점은 <Link href="/teacher/grading?view=queue" className="text-pullim-blue-600 font-bold underline underline-offset-2">채점 허브</Link>에서 해요 — 서술형 AI 초안이 거기로 갑니다.
      </p>
    </TeacherPageShell>
  );
}
