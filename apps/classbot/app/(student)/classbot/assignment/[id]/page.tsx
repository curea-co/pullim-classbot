'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageCircle, Play, AlertCircle, Inbox } from 'lucide-react';
import { AssignmentOverviewHeader } from '@/components/classbot/assignment-overview-header';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ContextRail } from '@/components/shell/context-rail';
import { ReadErrorState } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { studentQuestionsOf, useVisibleAssignment } from '../use-assignment-reads';
import { useSubmissionResult } from '@/lib/store/submission-result';
import { questionTypeMeta } from '@/lib/question-type';
import { cn } from '@/lib/utils';

/**
 * 학생 과제 상세 — 정본 `GET /classbot/assignments/:id` **하나만** 읽는다(2026-09-16 계획 §06 R8 · FE PR 6).
 *
 * 문항도 같은 응답에서 온다(🔒 answerKey 없음). 종전의 「목록=서버 / 문항=mock 시드 / 데모=로컬 스토어」
 * 세 갈래는 걷었다 — 목록·상세·풀이·결과·대화가 같은 행과 같은 문항을 본다.
 *
 * **제출 여부는 이 세션 안에서만 안다.** 정본에 학생 본인의 제출을 되읽는 문이 없어(`/submissions` 는 operator 전용)
 * 새로고침하면 서버 행의 `state`(교사가 낼 때 굳힌 값)로 돌아간다 — 그때 CTA 는 다시 「시작」이다.
 */
export default function AssignmentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useVisibleAssignment(id);
  const submitted = useSubmissionResult(id);
  const a = api.data;

  const back = (
    <Link
      href="/classbot/assignment"
      className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
    >
      <ArrowLeft className="h-3 w-3" />
      받은 과제
    </Link>
  );

  if (api.isNotFound) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={Inbox}
          title="과제를 찾을 수 없어요"
          description="받은 과제 목록에서 다시 확인해 주세요."
          action={{ href: '/classbot/assignment', label: '받은 과제', ariaLabel: '받은 과제로 가기' }}
        />
      </div>
    );
  }
  if (api.isError) {
    return <div className="space-y-4">{back}<ReadErrorState onRetry={() => void api.refetch()} /></div>;
  }
  // 401(로그인으로 가는 중)도 여기 — 오류 카드 대신 자리를 지킨다.
  if (api.isLoading || !a) {
    return <div className="space-y-4">{back}<AssignmentDetailSkeleton /></div>;
  }

  const questions = studentQuestionsOf(a);

  const isSubmitted = a.state === 'submitted' || submitted !== undefined;
  const isInProgress = !isSubmitted && a.state === 'in-progress';
  const isExam = a.mode === 'exam';

  const ctaHref =
    isSubmitted ? `/classbot/assignment/${a.id}/result`
    : `/classbot/assignment/${a.id}/solve?step=${isInProgress ? a.completedCount + 1 : 1}`;
  const ctaLabel =
    isSubmitted ? '결과'
    : isInProgress ? `이어서 풀기 (${a.completedCount + 1}/${a.questionCount})`
    : '시작';
  // 보이는 글자는 단어, 잃은 뜻은 낭독기 이름에 ([07 § 6.6.2(3)])
  const ctaAria =
    isSubmitted ? '제출한 결과 보기'
    : isInProgress ? `이어서 풀기 — ${a.completedCount + 1}번째 문항부터`
    : '지금 시작하기';

  const rail = (
    <div className="max-lg:sticky max-lg:bottom-2 max-lg:z-10 space-y-3">
      <Link
        href={ctaHref}
        aria-label={ctaAria}
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

      {/* 과제 대화 진입 — 혼자 풀다 막히면 이 과제에 매인 대화로 간다.
          시험 모드는 봇 응답 자체가 막히므로 진입점을 내보내지 않는다(풀이 화면과 같은 기준).
          라우트 쪽에서도 한 번 더 막는다 — 딥링크로 들어올 수 있기 때문이다. */}
      {!isExam && (
      <Link
        href={`/classbot/assignment/${a.id}/chat`}
        aria-label="봇과 같이 풀며 이 과제 대화하기"
        data-testid="assignment-chat-cta"
        className="bg-card hover:bg-pullim-slate-50/50 flex w-full items-center gap-3 rounded-2xl border p-3 transition-colors"
      >
        <span className="bg-pullim-blue-50 text-pullim-blue-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-900 text-sm font-bold">대화</div>
        </div>
        <ArrowRight className="text-pullim-slate-300 h-4 w-4" />
      </Link>
      )}

      <FlywheelNote>
        답은 제출할 때 한 번에 선생님께 가요. 중간에 나가면 쓴 답은 남지 않으니 한 번에 끝까지 풀어요.
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

        {/* 문항 미리보기 — 선생님이 낸 문항 그대로. 정답은 서버에만 있다. */}
        <section className="bg-card rounded-2xl border p-4">
          <h3 className="text-pullim-slate-900 text-sm font-bold">문항 구성</h3>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            {questions.length}문항 — 풀이는 풀이 화면에서 해요.
          </p>
          {questions.length === 0 ? (
            <p className="text-pullim-slate-400 mt-3 text-2xs">아직 문항이 없어요. 선생님이 문항을 넣으면 여기 보여요.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {questions.map(q => {
                const meta = questionTypeMeta[q.type];
                const TypeIcon = meta.icon;
                return (
                  <li key={q.id} className="text-pullim-slate-600 flex items-center gap-2 text-2xs">
                    <span className="bg-pullim-slate-100 text-pullim-slate-500 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-micro font-bold">
                      {q.order}
                    </span>
                    <span className="text-pullim-slate-400 font-mono text-2xs inline-flex items-center gap-0.5">
                      <TypeIcon className="h-3 w-3" aria-hidden />
                      {meta.label}
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
