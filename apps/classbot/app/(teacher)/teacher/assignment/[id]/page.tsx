'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, Info, Users } from 'lucide-react';
import { ApiError } from '@pullim-classbot/api-client';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { BotNote } from '@/components/classbot/bot-note';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { ReadErrorState } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { useAssignmentDetail, useAssignmentSubmissions } from '@/hooks/api/assignment-dispatch';
import { useOperatorClasses } from '@/hooks/api/classroom';
import type { AssignmentDetailDto, AssignmentQuestionDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';
import { statusOf as httpStatusOf } from '@/lib/api/classbot-client';
import { dDayLabel, shortTimeLabel } from '@/lib/assignment-labels';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';
import { isDueSoon, modeOf, remainingOf, statusLabels, statusOf, toTeacherClass } from '../assignment-filters';

type Params = Promise<{ id: string }>;

/**
 * 과제 상세 — 「이 과제가 어떻게 되고 있나」 (`proc/spec/14 § 3.3.4` · 2026-09-16 계획 §06 R10).
 *
 * **정본 둘을 읽는다** — 메타·문항은 `GET /classbot/assignments/:id`(operator 도 통과), 제출 현황은
 * `GET /classbot/assignments/:id/submissions`(operator 전용). 종전의 localStorage 스토어 + mock 명단(`classRoster`)은
 * PR 6 에서 걷었다. 마감은 지금 기준이다 — 정본 `dDay` 는 낼 때 굳힌 정수라 `dispatchedAt` 로 다시 센다(`remainingOf`).
 *
 * 그래서 이 화면이 **아직 못 하는 것**을 버튼 대신 말로 둔다:
 *  - **고치기·회수** — 정본에 PATCH·회수 문이 없다(계획 §05 표에 그 줄이 없다). 죽은 버튼을 두지 않고 안내 한 줄.
 *  - **학생 이름** — 제출 행에는 sub 만 온다. 반 명단(`GET /classes/:id/members`)은 pullim-api PR 2·FE PR 5b 몫.
 *  - **미제출 명단·리마인드·코멘트·오답 다시 내기** — 종전의 리마인드 버튼·제출 현황 시트는 은퇴한 로컬 제출 레인
 *    (`pullim-assignments`)과 목 명단(`classRoster`) 위에 서 있었다. 실제 제출·실제 명단으로 다시 세우려면 명단 문이
 *    pullim-api 에 열려야 하고(5b), 그 뒤 **별건**으로 되살린다. 여기서는 낸 학생만 보인다.
 */
export default function TeacherAssignmentDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  return <AssignmentDetail id={id} />;
}

/** 403(남의 반)·404(없음)는 교사에게 같은 말이다 — 「내 반의 과제가 아니다」. */
function isNotMine(error: unknown): boolean {
  const status = httpStatusOf(error);
  return status === 403 || status === 404;
}

function AssignmentDetail({ id }: { id: string }) {
  const detail = useAssignmentDetail(id);
  const submissions = useAssignmentSubmissions(id);
  const classes = useOperatorClasses();

  const klass = useMemo(() => {
    const card = detail.data ? classes.data?.find((c) => c.id === detail.data?.classId) : undefined;
    return card ? toTeacherClass(card) : undefined;
  }, [classes.data, detail.data]);

  const shell = { backHref: '/teacher/assignment', backLabel: '낸 과제' } as const;

  if (detail.isPending) {
    return (
      <TeacherPageShell {...shell} header={{ eyebrow: { icon: ClipboardList, text: '평가' }, title: '과제 상세' }}>
        <div data-testid="assignment-detail-loading" className="text-pullim-slate-500 py-10 text-center text-sm">
          불러오는 중이에요…
        </div>
      </TeacherPageShell>
    );
  }

  if (detail.isError) {
    return (
      <TeacherPageShell {...shell} header={{ eyebrow: { icon: ClipboardList, text: '평가' }, title: '과제 상세' }}>
        {isNotMine(detail.error) ? (
          <EmptyState
            icon={ClipboardList}
            title="이 과제를 찾지 못했어요"
            description="내가 운영하는 반의 과제만 볼 수 있어요. 지워졌거나 다른 선생님의 과제일 수 있어요."
            action={{ href: '/teacher/assignment', label: '낸 과제로' }}
          />
        ) : (
          <ReadErrorState onRetry={() => void detail.refetch()} />
        )}
      </TeacherPageShell>
    );
  }

  const a = detail.data;
  const mode = assignmentModeBadge[modeOf(a)];
  const status = statusOf(a);
  const dueSoon = isDueSoon(a);

  const rows = submissions.data ?? [];
  const graded = rows.filter((s) => s.scorePercent !== null);
  const avgScore =
    graded.length === 0
      ? null
      : Math.round(graded.reduce((sum, s) => sum + (s.scorePercent ?? 0), 0) / graded.length);
  const enrolled = klass?.enrolledCount ?? null;

  return (
    <TeacherPageShell
      {...shell}
      header={{
        eyebrow: { icon: ClipboardList, text: '평가' },
        title: a.title,
        description: [klass?.name ?? '반 이름 없음', `${a.questionCount}문항`, `난이도 ${a.difficulty}`].join(' · '),
      }}
    >
      {/* 이 과제가 무엇인지 — 모드·상태·마감은 한 줄에 함께 둔다. 셋이 같이 읽혀야 뜻이 선다 */}
      <div data-testid="assignment-detail-facts" className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', mode.bg, mode.fg)}>{mode.label}</span>
        <Chip tone="outline" className="py-1">{statusLabels[status]}</Chip>
        <span className={cn('font-mono text-2xs font-bold', dueSoon ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
          {dDayLabel(remainingOf(a))} ({a.dueLabel})
        </span>
        <span className="text-pullim-slate-500 text-2xs">{a.scope}</span>
      </div>

      {/*
        고치기·회수 버튼이 있던 자리 — 정본에 그 문이 없어 버튼을 두지 않는다. 죽은 버튼보다 한 줄이 낫다.
        문이 생기면(pullim-api 후속) 여기에 다시 붙인다.
      */}
      <div data-testid="assignment-edit-unavailable">
        <BotNote icon={Info}>
          낸 과제를 고치거나 회수하는 기능은 아직 정본 서버(pullim-api)에 없어요. 잘못 낸 과제는 새로 내 주세요 —
          학생 화면에는 두 과제가 모두 보여요.
        </BotNote>
      </div>

      {/* 한눈에 — 있는 것만 센다. 대상은 반 참여 인원(모르면 —), 제출은 제출 현황의 행 수다. */}
      <KpiStatBar cols={4}>
        <KpiStat label="반 참여" value={enrolled === null ? '—' : `${enrolled}명`} icon={Users} />
        <KpiStat label="제출" value={submissions.isPending ? '…' : `${rows.length}명`} />
        <KpiStat label="채점됨" value={submissions.isPending ? '…' : `${graded.length}명`} />
        <KpiStat label="평균 점수" value={avgScore === null ? '—' : `${avgScore}점`} />
      </KpiStatBar>

      <section className="bg-card space-y-4 rounded-2xl border p-5">
        <SectionHeading
          title="학생별 제출"
          description="낸 학생과 서버가 매긴 점수예요. 서술형이 있는 과제는 점수가 비어 있고, 채점 허브에서 봐요."
        />
        <SubmissionsPanel query={submissions} detail={a} />
        <p className="text-pullim-slate-500 text-2xs">
          학생 이름은 반 명단이 정본에 붙으면 보여요 — 지금은 학생 식별자예요. 미제출 명단·리마인드·코멘트·오답 다시 내기는
          반 명단 문이 정본에 열린 뒤 따로 다시 세워요.
        </p>
      </section>

      <p className="text-pullim-slate-500 text-2xs">
        채점은 <Link href="/teacher/grading?view=queue" className="text-pullim-blue-600 font-bold underline underline-offset-2">채점 허브</Link>에서 해요 — 서술형 AI 초안이 거기로 갑니다.
      </p>
    </TeacherPageShell>
  );
}

/** 제출 현황 표 — 학생 sub·제출 시각·점수·답. */
function SubmissionsPanel({
  query,
  detail,
}: {
  query: ReturnType<typeof useAssignmentSubmissions>;
  detail: AssignmentDetailDto;
}) {
  if (query.isPending) {
    return (
      <p data-testid="submissions-loading" className="text-pullim-slate-500 text-2xs">
        제출 현황을 불러오는 중이에요…
      </p>
    );
  }
  if (query.isError) {
    const status = httpStatusOf(query.error);
    return (
      <p role="alert" data-testid="submissions-error" className="text-pullim-danger text-2xs">
        {status === 403
          ? '이 반의 운영자만 제출 현황을 볼 수 있어요.'
          : (query.error instanceof ApiError ? query.error.message : '제출 현황을 불러오지 못했어요.')}
      </p>
    );
  }
  const rows = query.data;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        tone="plain"
        size="sm"
        title="아직 낸 학생이 없어요"
        description="학생이 제출하면 여기에 점수와 답이 보여요."
      />
    );
  }
  const questions = [...detail.questions].sort((a, b) => a.order - b.order);
  return (
    <ul data-testid="submissions-list" className="space-y-1.5">
      {rows.map((s) => (
        <SubmissionRow key={s.submissionId} submission={s} questions={questions} />
      ))}
    </ul>
  );
}

/** sub 는 길고 뜻이 없다 — 앞 여덟 글자만 보이고 전체는 title 로 남긴다. */
function shortSub(sub: string): string {
  return sub.length > 10 ? `${sub.slice(0, 8)}…` : sub;
}

/** 답을 사람이 읽는 글자로 — 객관식은 고른 보기 글자, 나머지는 값 그대로. 빈 답은 「—」. */
function answerLabel(q: AssignmentQuestionDto, raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (q.type === 'mc' && Array.isArray(q.options)) {
    const idx = Number(raw);
    const picked = Number.isInteger(idx) ? q.options[idx] : undefined;
    if (typeof picked === 'string') return `${idx + 1}번 · ${picked}`;
  }
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function SubmissionRow({ submission: s, questions }: { submission: SubmissionsViewDto; questions: AssignmentQuestionDto[] }) {
  return (
    <li data-testid={`submission-row-${s.studentId}`} className="bg-card rounded-xl border px-3 py-2">
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <span className="text-pullim-slate-900 min-w-0 flex-1 truncate font-mono text-sm font-semibold" title={s.studentId}>
          {shortSub(s.studentId)}
        </span>
        <span className="text-pullim-slate-500 text-2xs">{shortTimeLabel(s.submittedAt)} 제출</span>
        {s.scorePercent === null ? (
          <Chip tone="neutral">채점 대기</Chip>
        ) : (
          <Chip tone="info">{s.scorePercent}점</Chip>
        )}
      </div>
      <details className="mt-1">
        <summary className="text-pullim-blue-600 cursor-pointer text-2xs font-bold">답 보기</summary>
        <ol className="text-pullim-slate-700 mt-1 space-y-0.5 text-2xs">
          {questions.map((q, i) => (
            <li key={q.id} className="flex gap-2">
              <span className="text-pullim-slate-500 font-mono">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
              <span className="font-mono font-bold">{answerLabel(q, s.answers[q.id])}</span>
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}
