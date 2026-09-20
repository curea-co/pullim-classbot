'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles, Clock, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ContextRail } from '@/components/shell/context-rail';
import { ScoreDisplay } from '@/components/classbot/score-display';
import { TeacherCommentCard } from '@/components/classbot/teacher-comment-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRooms } from '@/components/classbot/home/my-rooms';
import { useSubmissionResult } from '@/lib/store/submission-result';
import { shortTimeLabel } from '@/lib/assignment-labels';
import { mySubmissionOf, studentQuestionsOf, useVisibleAssignment } from '../../use-assignment-reads';
import { cn } from '@/lib/utils';

/**
 * 결과 화면 — 점수는 **서버가 센 것**이다(2026-09-16 계획 §06 「결과는 `submissions` 의 점수」 · FE PR 6).
 *
 * 과제 메타·문항은 정본 상세(`useVisibleAssignment`)에서, 점수·제출 시각은 제출 직후 응답을 든
 * `lib/store/submission-result.ts`(저장하지 않는다)에서 읽는다. 종전의 로컬 스토어 폴백(`useAssignmentLookup`·
 * `useStudentSubmission`)과 브라우저 채점은 걷었다.
 *
 * 서버가 주는 것과 안 주는 것:
 *  - `scorePercent` — 자동 채점 문항만 있으면 0~100, 서술형이 하나라도 있으면 **null(미채점)**.
 *    **`0` 은 0점이고 `null` 은 점수가 없다는 뜻이다** — 둘을 같은 자리에 그리지 않는다.
 *  - **문항별 정오는 오지 않는다.** 그래서 「오답 한눈에」 카드는 걷었다 — 정답도 기준 응답도 학생 응답에 없다(🔒).
 *  - **새로고침해도 점수가 남는다**(pullim-api #681) — 상세 응답이 본인 제출 세 칸을 실어서다. 세션 응답이
 *    있으면 그게 먼저고(방금 낸 것), 없으면 서버 행이 답한다(`mySubmissionOf`).
 *
 * 점수 칸이 가르는 갈래는 넷이다 — **냈고 점수가 있다 · 냈는데 미채점 · 안 냈다 · 모른다.** 마지막 둘을
 * 합치지 않는다: 「안 냈다」는 서버가 한 말이고, 「모른다」는 이 서버가 아직 본인 제출 칸을 안 싣는다는 뜻이다.
 */
export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useVisibleAssignment(id);
  const result = useSubmissionResult(id);
  const { rooms } = useMyRooms();

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
  const a = api.data;
  if (api.isLoading || !a) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  const questions = studentQuestionsOf(a);
  const botName = rooms.find(r => r.bot.id === a.botId)?.bot.name || a.assignedBy || '선생님';

  const isExam = a.mode === 'exam';
  const autoGraded = questions.filter(q => q.type !== 'essay').length;
  const essayCount = questions.filter(q => q.type === 'essay').length;
  const mine = mySubmissionOf(a, result?.submission);
  const scoredAtLabel = mine.kind === 'submitted' ? shortTimeLabel(mine.gradedAt ?? mine.submittedAt) : '';

  const scoreCard = isExam ? (
    <section className="bg-pullim-slate-900 text-white rounded-2xl p-5">
      <div className="text-2xs font-bold tracking-wider text-white uppercase">
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
          <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">자동 채점</div>
          <ScoreDisplay score={autoGraded} max={questions.length} size="xl" tone="fixed-accent" className="mt-1" />
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">객관식·단답·수치는 바로</p>
        </div>
        {mine.kind === 'not-submitted' ? (
          /* 서버가 「안 냈다」고 말한 자리 — 결과 화면에 곧장 들어온 경우다. 점수를 못 읽은 것과 다른 말을 한다. */
          <div data-testid="result-not-submitted">
            <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">내 점수</div>
            <div className="text-pullim-slate-400 mt-1 font-mono text-2xl font-bold">—</div>
            <p className="text-pullim-slate-500 mt-0.5 text-2xs">
              아직 안 냈어요. 풀어서 내면 여기에 점수가 보여요.
            </p>
          </div>
        ) : mine.kind === 'unknown' ? (
          /* 모른다 — 이 서버가 아직 본인 제출 칸을 안 싣고(#681 배포 전), 이 세션에서 내지도 않았다.
             「안 냈다」고 말하지 않는다. 우리가 아는 것은 「여기서는 못 본다」까지다. */
          <div data-testid="result-missing">
            <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">내 점수</div>
            <div className="text-pullim-slate-400 mt-1 font-mono text-2xl font-bold">—</div>
            <p className="text-pullim-slate-500 mt-0.5 text-2xs">
              점수는 제출하고 바로 그때만 여기서 보여요. 낸 답은 선생님께 가 있어요.
            </p>
          </div>
        ) : mine.scorePercent === null ? (
          <div data-testid="result-ungraded">
            <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">선생님 채점 기다리는 중</div>
            <div className="text-pullim-blue-700 mt-1 font-mono text-2xl font-bold">
              {essayCount}<span className="text-pullim-slate-400 text-base">문항</span>
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-2xs">서술형이 있어 선생님이 보고 점수를 매겨요</p>
          </div>
        ) : (
          <div>
            <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">내 점수</div>
            <div data-testid="result-score" className="mt-1">
              {/* `0` 이 여기까지 온다 — 위 분기가 「점수 없음(null)」을 먼저 걸러 내므로 0 은 0점으로 그려진다 */}
              <ScoreDisplay score={mine.scorePercent} max={100} size="xl" tone="threshold" />
            </div>
            <p className="text-pullim-slate-500 mt-0.5 text-2xs">
              {/* 서버 행으로 되읽은 점수에는 채점 시각이 없다 — 없으면 시각을 지어내지 않고 문장만 남긴다 */}
              {scoredAtLabel && `${scoredAtLabel} 채점 · `}선생님 쪽에서 매긴 점수
            </p>
          </div>
        )}
      </div>
    </section>
  );

  const rail = (
    <>
      {scoreCard}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/classbot/assignment"
          aria-label="받은 과제로 가기"
          className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 inline-flex items-center justify-center gap-1 rounded-2xl py-3 text-xs font-bold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          다른 과제
        </Link>
        <Link
          href="/classbot/chat"
          aria-label="봇에게 질문하기"
          className={cn(
            'inline-flex items-center justify-center gap-1 rounded-2xl py-3 text-xs font-bold',
            'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          질문
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <FlywheelNote>
        낸 답과 점수는 선생님 화면으로 가요. 자주 막힌 곳은 다음 과제에 들어갈 수 있어요.
      </FlywheelNote>
    </>
  );

  return (
    <div className="space-y-4">
      {back}

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '제출 완료', tone: 'blue' }}
        title={<>수고했어요 <Heart className="text-pullim-blue-500 inline h-5 w-5" /></>}
        description={`${a.title} · ${botName}`}
      />

      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* 선생님 한마디 — 교사 comment 개입이 있으면 최상단(정본 인박스 파생 · 없으면 미렌더).
            시험 모드는 결과 피드백 비공개 정책을 따른다. */}
        {!isExam && <TeacherCommentCard assignmentId={id} />}

        {/* 낸 답 — 정오는 서버가 주지 않으니(🔒 정답 비노출) 「무엇을 냈나」만 보여 준다. */}
        {/* 「낸 답」은 이 세션이 보낸 답을 그대로 보여 주는 것이라 세션 응답이 있을 때만 선다 —
            서버 행으로 제출 사실을 되읽어도 **답은 그 응답에 없다**(🔒 `SubmissionDto` 에 답 칸이 없다). */}
        {!isExam && result !== undefined && questions.length > 0 && (
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading title="내가 낸 답" description="맞았는지는 선생님 화면에서 매겨져요." />
            <ul className="space-y-2">
              {questions.map(q => (
                <li key={q.id} className="bg-pullim-slate-50/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-pullim-slate-200 text-pullim-slate-600 font-mono inline-flex h-5 w-5 items-center justify-center rounded text-micro font-bold">
                      {q.order}
                    </span>
                    <span className="text-pullim-slate-700 truncate text-xs font-bold">{q.prompt}</span>
                  </div>
                  <p className="text-pullim-slate-600 mt-1.5 text-2xs leading-relaxed">
                    <span className="text-pullim-slate-400 font-bold">내 답: </span>
                    {answerText(q, result?.answers[q.id])}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </ContextRail>
    </div>
  );
}

/** 낸 답을 글자로 — 객관식은 고른 보기, 나머지는 값. 비었으면 「안 썼어요」. */
function answerText(q: { type: string; options?: string[] }, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '안 썼어요';
  if (q.type === 'mc' && q.options) {
    const idx = Number(raw);
    const picked = Number.isInteger(idx) ? q.options[idx] : undefined;
    if (picked !== undefined) return `${['①', '②', '③', '④', '⑤'][idx] ?? idx + 1} ${picked}`;
  }
  return typeof raw === 'string' ? raw : String(raw);
}
