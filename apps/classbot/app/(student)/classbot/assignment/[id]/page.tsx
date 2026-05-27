'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Play, AlertCircle } from 'lucide-react';
import { AssignmentOverviewHeader } from '@/components/classbot/assignment-overview-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { getQuestionsByAssignment } from '@/lib/mock';
import { useAssignmentLookup } from '@/lib/store/assignments';
import { cn } from '@/lib/utils';

export default function AssignmentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const a = useAssignmentLookup(id);
  if (!a) {
    // 신규 발사 직후 hydration 전엔 dispatched가 비어있을 수 있어 잠시 로딩 표시
    if (id.startsWith('as_user_')) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-pullim-slate-500 text-sm">과제를 불러오는 중...</p>
        </div>
      );
    }
    notFound();
  }
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

  return (
    <div className="space-y-4">
      <Link
        href="/classbot/assignment"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        받은 과제
      </Link>

      <AssignmentOverviewHeader assignment={a} />

      {/* 시험 모드 경고 */}
      {isExam && !isSubmitted && (
        <section className="border-pullim-danger/30 bg-pullim-danger-bg rounded-2xl border p-4">
          <header className="mb-2 flex items-center gap-2">
            <AlertCircle className="text-pullim-danger h-4 w-4" />
            <h3 className="text-pullim-danger text-sm font-bold">시작 전 확인</h3>
          </header>
          <ul className="text-pullim-slate-700 space-y-1 text-[11px] leading-relaxed">
            <li>• 시작하면 봇이 잠겨요. 시험 도중 도움을 받을 수 없어요.</li>
            <li>• 시간도 멈출 수 없어요. 60분 카운트다운이 자동으로 시작돼요.</li>
            <li>• 외부 탭으로 전환하면 카운트가 기록돼요.</li>
          </ul>
        </section>
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
            {questions.map(q => (
              <li key={q.id} className="text-pullim-slate-600 flex items-center gap-2 text-[11px]">
                <span className="bg-pullim-slate-100 text-pullim-slate-500 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold">
                  {q.order}
                </span>
                <span className="text-pullim-slate-400 font-mono text-[11px] uppercase">{q.type}</span>
                <span className="truncate">{q.prompt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CTA */}
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
}
