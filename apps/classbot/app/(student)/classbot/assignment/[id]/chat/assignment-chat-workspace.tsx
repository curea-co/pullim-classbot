'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, ListChecks, MessageCircle, Play, Target } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { AiDisclosureNotice } from '@/components/classbot/ai-disclosure-notice';
import { RichText } from '@/components/classbot/rich-text';
import {
  CHAT_CONTINUOUS_THRESHOLD_MS,
  ChatBubbleFrame,
  ChatComposer,
  ChatDateDivider,
  chatBubbleClass,
  type ChatBotFace,
} from '@/components/classbot/chat-transcript';
import { gradingModeOf, type AssignmentQuestion, type GradingMode } from '@/lib/mock';
import {
  buildAssignmentChatSeed,
  pickAssignmentChatReply,
  type AssignmentChatContext,
} from '@/lib/mock/classbot-assignment-chat';
import {
  useAssignmentChatStore,
  useAssignmentChatTurns,
  type AssignmentChatTurn,
} from '@/lib/store/assignment-chat';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useRosterMe } from '@/lib/current-user';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
import { cn } from '@/lib/utils';

/**
 * 과제 대화 — SCR-C-37 / FR-C-39.
 *
 * **대화가 화면을 이끌고, 과제 진행이 곁에서 상시 보인다.**
 *  · 말풍선·날짜 구분선·입력 줄은 봇 대화(`/classbot/chat`)와 **같은 프리미티브**를 쓴다
 *    (`components/classbot/chat-transcript`) — 두 대화 화면이 서로 어긋나지 않게.
 *  · 곁의 진행 트래커는 과제 유형을 따라간다. 유형 판단은 `gradingModeOf` 하나만 본다.
 *  · 대화는 `assignmentId` 로 묶여 store 에 남는다 — 영속을 붙일 자리는
 *    `lib/store/assignment-chat.ts` 주석에 표시해 뒀다.
 */
export function AssignmentChatWorkspace({
  assignment,
  questions,
  bot,
}: {
  assignment: AssignmentReadRow;
  questions: AssignmentQuestion[];
  bot: ChatBotFace;
}) {
  const me = useRosterMe();

  const turns = useAssignmentChatTurns(assignment.id);
  const seed = useAssignmentChatStore(s => s.seed);
  const append = useAssignmentChatStore(s => s.append);
  const [value, setValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 대화를 만들 때 쓰는 과제 맥락 — 인사도 되돌림 문구도 전부 이 과제를 가리킨다.
  const ctx: AssignmentChatContext = useMemo(() => ({
    assignmentId: assignment.id,
    title: assignment.title,
    scope: assignment.scope,
    questionCount: assignment.questionCount,
    dueLabel: assignment.dueLabel,
    botName: bot.name,
    assignedBy: assignment.assignedBy,
    studentName: me.name,
  }), [assignment, bot.name, me.name]);

  // 첫 진입 오프너 — 이미 대화가 있으면 seed 가 알아서 비켜선다(멱등).
  useEffect(() => {
    const at = Date.now();
    seed(
      assignment.id,
      buildAssignmentChatSeed(ctx).map((r, i) => ({
        id: `seed_${assignment.id}_${i}`,
        role: 'bot' as const,
        at: at + i,
        ...r,
      })),
    );
  }, [assignment.id, ctx, seed]);

  // 새 턴이 붙으면 바닥으로.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length]);

  function submit() {
    const text = value.trim();
    if (!text) return;
    const at = Date.now();
    // assignmentId 를 그대로 들고 저장한다 — 이 화면이 따로 있는 까닭.
    append(assignment.id, { id: `s_${at}`, role: 'student', text, at });
    setValue('');
    // 지금 답은 정해진 문구다. 실제 봇 응답(스트리밍)은 여기 자리에 붙는다 —
    // 저장은 store 의 append 안(주석 ②)에서 같은 assignmentId 로 서버에 보내면 된다.
    const reply = pickAssignmentChatReply(text, ctx);
    append(assignment.id, { id: `b_${at + 1}`, role: 'bot', at: at + 1, ...reply });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const gradingMode: GradingMode =
    questions.some(q => gradingModeOf(q) === 'teacher') ? 'teacher' : 'auto';

  return (
    <div className="space-y-3">
      <BackLink href={`/classbot/assignment/${assignment.id}`}>과제 상세</BackLink>

      <PageHeader
        eyebrow={{ icon: MessageCircle, text: '과제 대화' }}
        title={assignment.title}
        description={`${assignment.assignedBy} · ${assignment.scope}`}
        action={
          <Link
            href={`/classbot/assignment/${assignment.id}/solve`}
            aria-label="풀이 화면으로 가기"
            className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
          >
            <Play className="h-3 w-3" />
            풀이
          </Link>
        }
      />

      {/* AI 검증 고지 — 챗 상단 상시(핸드오프 §13.2). 봇 대화와 같은 배너를 쓴다. */}
      <AiDisclosureNotice />

      {/* 진행 한 줄 — 모바일에서 트래커가 대화 아래로 내려가도 진행은 늘 보인다. */}
      <ProgressStrip assignment={assignment} gradingMode={gradingMode} />

      <ContextRail
        railWidth="md"
        stickyRail
        rail={<AssignmentTracker assignment={assignment} questions={questions} gradingMode={gradingMode} studentId={me.id} />}
      >
        <section className="bg-card flex min-h-0 flex-col rounded-2xl border">
          <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2.5 text-sm">
            <span className="text-pullim-slate-700 font-bold">{bot.name}과 이 과제 풀기</span>
            {/* 대화가 "이 과제에 매여 있다"는 범위만 말한다. 어디에 저장되는지는
                아래 입력창 밑 안내가 맡는다 — 지금은 이 기기 localStorage 뿐이다. */}
            <span className="text-pullim-slate-400 ml-auto text-2xs">
              이 대화는 이 과제에만 매여 있어요
            </span>
          </header>

          <div
            ref={scrollRef}
            data-slot="assignment-chat-scroll"
            className="flex max-h-[calc(100dvh-22rem)] min-h-[360px] flex-col gap-3 overflow-y-auto p-4"
          >
            {turns.map((t, i) => (
              <AssignmentTurnRow key={t.id} turn={t} prev={turns[i - 1]} bot={bot} meName={me.name} />
            ))}
          </div>

          <div className="border-t p-3">
            <ChatComposer
              value={value}
              onValueChange={setValue}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              placeholder={`${bot.name}에게 물어보세요…`}
              disabled={!value.trim()}
            />
            {/* 로그인 여부와 무관하게 아직 이 기기에만 남는다 — 서버 영속이 없다
                (`lib/store/assignment-chat.ts`). 로그인 상태에서만 안내를 감추면
                로그인한 학생이 기기를 옮겼을 때 사라지는 걸 예고받지 못한다. */}
            <p className="text-pullim-slate-400 mt-1.5 text-micro">
              이 대화는 아직 이 기기에만 남아요. 다른 기기에서는 이어지지 않아요.
            </p>
          </div>
        </section>
      </ContextRail>
    </div>
  );
}

/* ─── 말풍선 한 줄 — 겉틀은 봇 대화와 같은 프리미티브 ─── */
function AssignmentTurnRow({
  turn, prev, bot, meName,
}: {
  turn: AssignmentChatTurn;
  prev: AssignmentChatTurn | undefined;
  bot: ChatBotFace;
  meName: string;
}) {
  const isStudent = turn.role === 'student';
  const showDivider = !prev || new Date(prev.at).toDateString() !== new Date(turn.at).toDateString();
  const continuation =
    !!prev
    && prev.role === turn.role
    && turn.role === 'bot'
    && turn.at - prev.at <= CHAT_CONTINUOUS_THRESHOLD_MS;

  return (
    <>
      {showDivider && <ChatDateDivider ts={turn.at} />}
      <ChatBubbleFrame isStudent={isStudent} bot={bot} meName={meName} at={turn.at} continuation={continuation}>
        {isStudent ? (
          <div className={chatBubbleClass(true)}>{turn.text}</div>
        ) : (
          <>
            {turn.tag && (
              <span className="bg-pullim-slate-100 text-pullim-slate-600 mb-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-micro font-bold">
                {turn.tag}
              </span>
            )}
            <div className={cn(chatBubbleClass(false), 'px-4 py-3')} style={{ borderLeftColor: bot.hex }}>
              <RichText text={turn.text} />
            </div>
            {/* 선생님에게 전해진다고 말하지 않는다 — 교사용 집계가 아직 없다(위 store 주석). */}
            {turn.redirected && (
              <p className="text-pullim-slate-400 mt-1 text-micro">
                수업 주제로 되돌렸어요
              </p>
            )}
          </>
        )}
      </ChatBubbleFrame>
    </>
  );
}

/* ─── 진행 한 줄 ─── */
function ProgressStrip({ assignment: a, gradingMode }: { assignment: AssignmentReadRow; gradingMode: GradingMode }) {
  const percent = a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100;
  return (
    <section className="bg-card flex items-center gap-3 rounded-2xl border px-3 py-2.5">
      <span className="text-pullim-slate-500 inline-flex shrink-0 items-center gap-1 text-2xs font-bold">
        <Target className="h-3 w-3" />
        {gradingMode === 'auto' ? '자동 채점' : '선생님 채점'}
      </span>
      <div className="bg-pullim-slate-200 h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
        <div className="bg-pullim-blue-600 h-full rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-pullim-slate-500 shrink-0 font-mono text-micro font-bold">
        {a.completedCount}/{a.questionCount}문항
      </span>
      <span className="text-pullim-slate-500 inline-flex shrink-0 items-center gap-1 text-micro font-bold">
        <Clock className="h-3 w-3" />
        {a.dDay}
      </span>
    </section>
  );
}

/* ─── 곁의 진행 트래커 — 과제 유형에 따라 다르다 ─── */
function AssignmentTracker({
  assignment: a, questions, gradingMode, studentId,
}: {
  assignment: AssignmentReadRow;
  questions: AssignmentQuestion[];
  gradingMode: GradingMode;
  studentId: string;
}) {
  // 낸 답 — 풀이 화면이 남긴 제출 기록. 대화 화면은 읽기만 한다.
  const submissions = useAssignmentStore(s => s.submissions);
  const answers = useMemo(
    () => submissions.find(s => s.assignmentId === a.id && s.studentId === studentId)?.answers ?? {},
    [submissions, a.id, studentId],
  );

  if (questions.length === 0) {
    return (
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="과제 진행" />
        <EmptyState
          size="sm"
          tone="plain"
          title="문항을 준비 중이에요"
          description="문항이 생기면 여기에 진행이 보여요."
        />
      </section>
    );
  }

  return gradingMode === 'auto'
    ? <AutoGradedTracker assignment={a} questions={questions} answers={answers} />
    : <TeacherGradedTracker assignment={a} questions={questions} answers={answers} />;
}

/**
 * 문항이 답을 낸 것으로 보이는지.
 * 제출 기록에 답이 있거나(정확), 과제 행의 진행 수 안에 들어오면(목록·상세와 같은 숫자) 낸 것으로 본다.
 */
function isAnswered(q: AssignmentQuestion, answers: Record<string, string>, completedCount: number): boolean {
  return answers[q.id] !== undefined || q.order <= completedCount;
}

/* 자동 채점형 — 문항별 진행 · 낸 답 · 남은 문항 */
function AutoGradedTracker({
  assignment: a, questions, answers,
}: {
  assignment: AssignmentReadRow;
  questions: AssignmentQuestion[];
  answers: Record<string, string>;
}) {
  const doneCount = questions.filter(q => isAnswered(q, answers, a.completedCount)).length;
  const remaining = questions.length - doneCount;

  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="문항별 진행"
        description={`${doneCount}/${questions.length}문항 · 남은 문항 ${remaining}개`}
      />
      <ul className="space-y-1.5">
        {questions.map(q => {
          const done = isAnswered(q, answers, a.completedCount);
          const myAnswer = answers[q.id];
          return (
            <li
              key={q.id}
              className={cn(
                'rounded-xl border p-2.5',
                done ? 'border-pullim-blue-200 bg-pullim-blue-50/40' : 'border-pullim-slate-200 bg-white',
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {done
                    ? <CheckCircle2 className="text-pullim-blue-600 h-3.5 w-3.5" aria-hidden />
                    : <Circle className="text-pullim-slate-300 h-3.5 w-3.5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-pullim-slate-700 text-2xs">
                    <span className="font-mono font-bold">{q.order}번</span>
                    <span className="text-pullim-slate-300"> · </span>
                    <span className="text-pullim-slate-600">{q.prompt}</span>
                  </p>
                  {done ? (
                    <p className="text-pullim-blue-700 mt-1 text-micro font-semibold">
                      {myAnswer !== undefined
                        ? `낸 답 — ${myAnswer}`
                        : '냈어요 · 낸 답은 풀이 화면에 있어요'}
                    </p>
                  ) : (
                    <p className="text-pullim-slate-400 mt-1 text-micro">아직 안 냈어요</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* 선생님 채점형 — 요구사항 체크리스트 (다룬 항목 / 안 다룬 항목) */
function TeacherGradedTracker({
  assignment: a, questions, answers,
}: {
  assignment: AssignmentReadRow;
  questions: AssignmentQuestion[];
  answers: Record<string, string>;
}) {
  // 요구사항 = 선생님이 출제 때 적어 둔 채점 기준(루브릭) 한 줄씩.
  const criteria = questions.flatMap(q =>
    (q.rubric ?? []).map((c, i) => ({
      id: `${q.id}_${i}`,
      questionOrder: q.order,
      text: c.criterion,
      covered: isAnswered(q, answers, a.completedCount),
    })),
  );

  if (criteria.length === 0) {
    return (
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="요구사항" />
        <EmptyState
          size="sm"
          tone="plain"
          title="요구사항을 준비 중이에요"
          description="선생님이 채점 기준을 넣으면 여기에 하나씩 보여요."
        />
      </section>
    );
  }

  const covered = criteria.filter(c => c.covered);
  const notCovered = criteria.filter(c => !c.covered);

  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="요구사항 체크리스트"
        description={`${covered.length}/${criteria.length}개 다뤘어요`}
      />

      <CriterionGroup label="다룬 항목" items={covered} covered />
      <CriterionGroup label="안 다룬 항목" items={notCovered} />

      <p className="text-pullim-slate-400 mt-3 text-micro leading-relaxed">
        낸 답을 기준으로 표시해요. 대화에서 다뤘는지 자동으로 찾아 주는 건 준비 중이에요.
      </p>
    </section>
  );
}

function CriterionGroup({
  label, items, covered = false,
}: {
  label: string;
  items: { id: string; questionOrder: number; text: string }[];
  covered?: boolean;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-pullim-slate-400 inline-flex items-center gap-1 text-micro font-bold tracking-wider uppercase">
        <ListChecks className="h-3 w-3" />
        {label} {items.length}개
      </p>
      {items.length === 0 ? (
        <p className="text-pullim-slate-400 mt-1 text-micro">없어요</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map(c => (
            <li key={c.id} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">
                {covered
                  ? <CheckCircle2 className="text-pullim-blue-600 h-3.5 w-3.5" aria-hidden />
                  : <Circle className="text-pullim-slate-300 h-3.5 w-3.5" aria-hidden />}
              </span>
              <span className={cn('text-2xs leading-relaxed', covered ? 'text-pullim-slate-700' : 'text-pullim-slate-500')}>
                <span className="font-mono font-bold">{c.questionOrder}번</span> · {c.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
