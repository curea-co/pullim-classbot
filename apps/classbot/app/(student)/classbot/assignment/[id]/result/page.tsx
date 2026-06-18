'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ContextRail } from '@/components/shell/context-rail';
import { ScoreDisplay } from '@/components/classbot/score-display';
import { classBots } from '@/lib/mock';
import { useRosterMe } from '@/lib/current-user';
import { useAssignmentLookup, getQuestionsForAssignment, useStudentSubmission } from '@/lib/store/assignments';
import { questionTypeMeta } from '@/lib/question-type';
import type { QuestionType } from '@/lib/question-type';
import { cn } from '@/lib/utils';

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const a = useAssignmentLookup(id);
  const me = useRosterMe();
  const submission = useStudentSubmission(id, me.id);
  if (!a) {
    if (id.startsWith('as_user_')) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-pullim-slate-500 text-sm">결과를 불러오는 중...</p>
        </div>
      );
    }
    notFound();
  }
  const questions = getQuestionsForAssignment(a);
  const bot = classBots.find(b => b.id === a.botId);

  const isExam = a.mode === 'exam';
  const autoGraded = questions.filter(q => q.type === 'mc' || q.type === 'short' || q.type === 'numeric').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;

  const scoreCard = isExam ? (
    <section className="bg-pullim-slate-900 text-white rounded-2xl p-5">
      <div className="text-pullim-lemon text-[10px] font-bold tracking-wider uppercase">
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
          <div className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">자동 채점</div>
          <ScoreDisplay score={autoGraded} max={questions.length} size="xl" tone="fixed-accent" className="mt-1" />
          <p className="text-pullim-slate-500 mt-0.5 text-[10px]">객관식·단답·수치는 즉시</p>
        </div>
        {submission ? (
          <div>
            <div className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">내 점수</div>
            <div data-testid="result-score" className="mt-1">
              <ScoreDisplay score={submission.scorePercent} max={100} size="xl" tone="threshold" />
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-[10px]">자동 채점 mock 추정</p>
          </div>
        ) : essayCount > 0 ? (
          <div>
            <div className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">검수 대기</div>
            <div className="text-pullim-blue-700 mt-1 font-mono text-2xl font-bold">
              {essayCount}<span className="text-pullim-slate-400 text-base">문항</span>
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-[10px]">선생님이 곧 봐줄 거예요</p>
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
      <Link
        href="/classbot/assignment"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        받은 과제
      </Link>

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '제출 완료', tone: 'blue' }}
        title={<>수고했어요 <Heart className="text-pullim-blue-500 inline h-5 w-5" /></>}
        description={`${a.title} · ${bot?.name ?? a.assignedBy}`}
      />

      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* 봇 피드백 — 시험 외 */}
        {!isExam && (
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading title="봇 한 마디" description={bot?.name ?? a.assignedBy} />
            <div className="space-y-2">
              <div className="bg-pullim-blue-50 rounded-lg p-3">
                <div className="text-pullim-blue-700 text-[10px] font-bold tracking-wider uppercase">오늘 잘한 점</div>
                <p className="text-pullim-slate-700 mt-1 text-[12px] leading-relaxed">
                  중간에 막혔을 때 힌트 1단계만 보고 다시 풀어낸 점 — 그게 진짜 실력이에요.
                </p>
              </div>
              <div className="bg-pullim-slate-50 rounded-lg p-3">
                <div className="text-pullim-slate-700 text-[10px] font-bold tracking-wider uppercase">다음에 신경 쓸 점</div>
                <p className="text-pullim-slate-700 mt-1 text-[12px] leading-relaxed">
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
                      <span className="bg-pullim-slate-200 text-pullim-slate-600 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold">
                        {q.order}
                      </span>
                      <span className="text-pullim-slate-700 truncate text-xs font-bold">{q.prompt}</span>
                      {meta && (
                        <span className="text-pullim-slate-400 ml-auto shrink-0 text-[10px]">
                          {meta.label}
                        </span>
                      )}
                    </div>
                    {q.modelAnswer && (
                      <p className="text-pullim-slate-500 mt-1.5 text-[11px] leading-relaxed">
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
