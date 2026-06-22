'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles, Clock, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ContextRail } from '@/components/shell/context-rail';
import { ScoreDisplay } from '@/components/classbot/score-display';
import { EmptyState } from '@/components/classbot/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { classBots } from '@/lib/mock';
import { useRosterMe } from '@/lib/current-user';
import { useAssignmentLookup, getQuestionsForAssignment, useStudentSubmission } from '@/lib/store/assignments';
import { useMyAssignment } from '@/hooks/api/read/use-student-reads';
import { assignmentToReadRow } from '@/lib/assignment-demo';
import { questionTypeMeta } from '@/lib/question-type';
import type { QuestionType } from '@/lib/question-type';
import { cn } from '@/lib/utils';

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // 상세 페이지와 같은 dual-source 해석 — 인증 사용자는 실API, 미인증은 로컬 스토어 폴백.
  const api = useMyAssignment(id);
  const localA = useAssignmentLookup(id);
  const demo = api.isUnauthenticated;
  const apiRow = demo ? (localA ? assignmentToReadRow(localA) : undefined) : api.data;
  const isLoading = demo ? false : api.isLoading;
  const isNotFound = demo ? !localA : api.isNotFound;

  const me = useRosterMe();
  const submission = useStudentSubmission(id, me.id);

  const back = (
    <Link
      href="/classbot/assignment"
      className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
    >
      <ArrowLeft className="h-3 w-3" />
      받은 과제
    </Link>
  );

  if (isLoading || (!apiRow && !isNotFound)) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }
  if (isNotFound || !apiRow) {
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

  // 문항은 로컬 스토어(mock 레이어) — localA 가 있으면 그대로, 없으면 빈 배열.
  const questions = localA ? getQuestionsForAssignment(localA) : [];
  const bot = classBots.find(b => b.id === apiRow.botId);

  const isExam = apiRow.mode === 'exam';
  const autoGraded = questions.filter(q => q.type === 'mc' || q.type === 'short' || q.type === 'numeric').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;

  const scoreCard = isExam ? (
    <section className="bg-pullim-slate-900 text-white rounded-2xl p-5">
      <div className="text-pullim-lemon text-micro font-bold tracking-wider uppercase">
        <Clock className="-mt-0.5 mr-0.5 inline h-3 w-3" />
        시험 완료
      </div>
      <h2 className="mt-2 text-lg font-bold">결과는 선생님 발표 후 공개돼요</h2>
      <p className="text-pullim-slate-300 mt-1 text-xs leading-relaxed">
        오답·해설도 발표 시점까지 잠겨 있어요. 선생님이 곧 알려줄 거예요.
      </p>
    </section>
  ) : (
    <section className="bg-card rounded-2xl border p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-pullim-slate-400 text-micro font-bold tracking-wider uppercase">자동 채점</div>
          <ScoreDisplay score={autoGraded} max={questions.length} size="xl" tone="fixed-accent" className="mt-1" />
          <p className="text-pullim-slate-500 mt-0.5 text-micro">객관식·단답·수치는 즉시</p>
        </div>
        {submission ? (
          <div>
            <div className="text-pullim-slate-400 text-micro font-bold tracking-wider uppercase">내 점수</div>
            <div data-testid="result-score" className="mt-1">
              <ScoreDisplay score={submission.scorePercent} max={100} size="xl" tone="threshold" />
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-micro">자동 채점 mock 추정</p>
          </div>
        ) : essayCount > 0 ? (
          <div>
            <div className="text-pullim-slate-400 text-micro font-bold tracking-wider uppercase">검수 대기</div>
            <div className="text-pullim-blue-700 mt-1 font-mono text-2xl font-bold">
              {essayCount}<span className="text-pullim-slate-400 text-base">문항</span>
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-micro">선생님이 곧 봐줄 거예요</p>
          </div>
        ) : null}
      </div>
    </section>
  );

  const rail = (
    <>
      {scoreCard}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/classbot/assignment"
          className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 inline-flex items-center justify-center gap-1 rounded-2xl py-3 text-xs font-bold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          비슷한 패턴 더
        </Link>
        <Link
          href="/classbot/chat"
          className={cn(
            'inline-flex items-center justify-center gap-1 rounded-2xl py-3 text-xs font-bold',
            'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          봇에게 질문
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <FlywheelNote>
        자주 막힌 패턴은 다음 과제에 자동으로 들어가요. 풀이 데이터는 선생님 리포트로 흘러갑니다.
      </FlywheelNote>
    </>
  );

  return (
    <div className="space-y-4">
      {back}

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '제출 완료', tone: 'blue' }}
        title={<>수고했어요 <Heart className="text-pullim-blue-500 inline h-5 w-5" /></>}
        description={`${apiRow.title} · ${bot?.name ?? apiRow.assignedBy}`}
      />

      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* 봇 피드백 — 시험 외 */}
        {!isExam && (
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading title="봇 한 마디" description={bot?.name ?? apiRow.assignedBy} />
            <div className="space-y-2">
              <div className="bg-pullim-blue-50 rounded-lg p-3">
                <div className="text-pullim-blue-700 text-micro font-bold tracking-wider uppercase">오늘 잘한 점</div>
                <p className="text-pullim-slate-700 mt-1 text-xs leading-relaxed">
                  중간에 막혔을 때 힌트 1단계만 보고 다시 풀어낸 점 — 그게 진짜 실력이에요.
                </p>
              </div>
              <div className="bg-pullim-slate-50 rounded-lg p-3">
                <div className="text-pullim-slate-700 text-micro font-bold tracking-wider uppercase">다음에 신경 쓸 점</div>
                <p className="text-pullim-slate-700 mt-1 text-xs leading-relaxed">
                  부호 변화 표를 그리는 단계에서 자주 막혔어요. 같은 패턴 5문항이 자동으로 처방됐어요.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 오답 카드 — 시험은 발표 후 */}
        {!isExam && questions.length > 0 && (
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading title="오답 한눈에" description="기준 응답과 내 답을 비교해봐요." />
            <ul className="space-y-2">
              {questions.slice(0, 3).map(q => {
                const meta = questionTypeMeta[q.type as QuestionType];
                return (
                  <li key={q.id} className="bg-pullim-slate-50/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-pullim-slate-200 text-pullim-slate-600 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-micro font-bold">
                        {q.order}
                      </span>
                      <span className="text-pullim-slate-700 truncate text-xs font-bold">{q.prompt}</span>
                      {meta && (
                        <span className="text-pullim-slate-400 ml-auto shrink-0 text-micro">
                          {meta.label}
                        </span>
                      )}
                    </div>
                    {q.modelAnswer && (
                      <p className="text-pullim-slate-500 mt-1.5 text-2xs leading-relaxed">
                        <span className="text-pullim-slate-400 font-bold">기준 응답: </span>
                        {q.modelAnswer}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </ContextRail>
    </div>
  );
}
