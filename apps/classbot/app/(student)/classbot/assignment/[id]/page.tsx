'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Play, AlertCircle, Inbox } from 'lucide-react';
import { AssignmentOverviewHeader } from '@/components/classbot/assignment-overview-header';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ContextRail } from '@/components/shell/context-rail';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getQuestionsByAssignment } from '@/lib/mock';
import { useMyAssignment } from '@/hooks/api/read/use-student-reads';
import { questionTypeMeta } from '@/lib/question-type';
import { cn } from '@/lib/utils';

/**
 * 학생 과제 상세 — Phase 7 Stage 2: `GET /api/assignments/[id]`(실DB·인증) 배선.
 *
 * 목록(`/api/assignments`)과 **같은 실DB 소스**를 본다 — 목록=실DB / 상세=mock 의
 * split-brain(목록의 실DB 과제를 클릭하면 상세에서 404)을 제거한다. 미로그인은
 * 로그인 게이트(D1 로그인월), 본인 명의 과제가 없으면 not-found 카드.
 *
 * 범위 밖(더 깊은 레이어): 문항(`getQuestionsByAssignment`)은 여전히 mock,
 * 풀이 진행(solve/submit) 상태는 store. 교사 발사 과제의 실DB 반영(write)도 후속 슬라이스.
 */
export default function AssignmentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: a, isLoading, isUnauthenticated, isNotFound, isError, refetch } =
    useMyAssignment(id);

  const back = (
    <Link
      href="/classbot/assignment"
      className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
    >
      <ArrowLeft className="h-3 w-3" />
      받은 과제
    </Link>
  );

  if (isUnauthenticated) {
    return <div className="space-y-4">{back}<ReadLoginGate label="과제" /></div>;
  }
  if (isNotFound) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={Inbox}
          title="과제를 찾을 수 없어요"
          description="받은 과제 목록에서 다시 확인해 주세요."
          action={{ href: '/classbot/assignment', label: '받은 과제로' }}
        />
      </div>
    );
  }
  if (isError) {
    return <div className="space-y-4">{back}<ReadErrorState onRetry={() => void refetch()} /></div>;
  }
  if (isLoading || !a) {
    return <div className="space-y-4">{back}<AssignmentDetailSkeleton /></div>;
  }

  // 문항은 더 깊은 레이어(mock) — 시드 과제는 존재, 신규 DB 과제는 빈 배열로 안내.
  const questions = getQuestionsByAssignment(id);

  const isInProgress = a.state === 'in-progress';
  const isSubmitted = a.state === 'submitted';
  const isExam = a.mode === 'exam';

  const ctaHref =
    isSubmitted ? `/classbot/assignment/${a.id}/result`
    : `/classbot/assignment/${a.id}/solve?step=${isInProgress ? a.completedCount + 1 : 1}`;
  const ctaLabel =
    isSubmitted ? '결과 보기'
    : isInProgress ? `이어서 풀기 (${a.completedCount + 1}/${a.questionCount})`
    : '지금 시작하기';

  const rail = (
    <div className="max-lg:sticky max-lg:bottom-2 max-lg:z-10 space-y-3">
      <Link
        href={ctaHref}
        data-testid="assignment-start-cta"
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-colors',
          isExam
            ? 'bg-pullim-danger hover:bg-pullim-danger/90 text-white'
            : 'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
        )}
      >
        <Play className="h-4 w-4" />
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>

      <FlywheelNote>
        쓰는 동안 자동으로 저장돼요. 마음 편히 풀어요. 제출하면 선생님 채점 큐로 흘러가요.
      </FlywheelNote>
    </div>
  );

  return (
    <div className="space-y-4">
      {back}

      <ContextRail railWidth="md" stickyRail rail={rail}>
        <AssignmentOverviewHeader assignment={a} />

        {/* 시험 모드 경고 */}
        {isExam && !isSubmitted && (
          <AlertCard tone="danger" icon={AlertCircle} title="시작 전 확인">
            <ul className="space-y-1">
              <li>• 시작하면 봇이 잠겨요. 시험 도중 도움을 받을 수 없어요.</li>
              <li>• 시간도 멈출 수 없어요. 60분 카운트다운이 자동으로 시작돼요.</li>
              <li>• 외부 탭으로 전환하면 카운트가 기록돼요.</li>
            </ul>
          </AlertCard>
        )}

        {/* 문항 미리보기 */}
        <section className="bg-card rounded-2xl border p-4">
          <h3 className="text-pullim-slate-900 text-sm font-bold">문항 구성</h3>
          <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
            {questions.length}개 시드 문항 — 실제 풀이는 워크스페이스에서 진행해요.
          </p>
          {questions.length === 0 ? (
            <p className="text-pullim-slate-400 mt-3 text-[11px]">새 과제는 문항이 풀이 워크스페이스에서 자동 생성돼요.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {questions.map(q => {
                const meta = questionTypeMeta[q.type as keyof typeof questionTypeMeta];
                const TypeIcon = meta?.icon;
                return (
                  <li key={q.id} className="text-pullim-slate-600 flex items-center gap-2 text-[11px]">
                    <span className="bg-pullim-slate-100 text-pullim-slate-500 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold">
                      {q.order}
                    </span>
                    <span className="text-pullim-slate-400 font-mono text-[11px] inline-flex items-center gap-0.5">
                      {TypeIcon && <TypeIcon className="h-3 w-3" aria-hidden />}
                      {meta?.label ?? q.type}
                    </span>
                    <span className="truncate">{q.prompt}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </ContextRail>
    </div>
  );
}

function AssignmentDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
