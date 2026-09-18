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
import { useClassMembers, useOperatorClasses } from '@/hooks/api/classroom';
import type {
  AssignmentDetailDto,
  AssignmentQuestionDto,
  ClassMemberDto,
  SubmissionsViewDto,
} from '@/lib/api/classbot-dto';
import { statusOf as httpStatusOf } from '@/lib/api/classbot-client';
import { memberLabel } from '@/lib/interventions';
import { dDayLabel, shortTimeLabel } from '@/lib/assignment-labels';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';
import { isDueSoon, modeOf, remainingOf, statusLabels, statusOf, toTeacherClass } from '../assignment-filters';
import { RemindUnsubmitted } from './remind-unsubmitted';

type Params = Promise<{ id: string }>;

/**
 * 과제 상세 — 「이 과제가 어떻게 되고 있나」 (`proc/spec/14 § 3.3.4` · 2026-09-16 계획 §06 R10).
 *
 * **정본 셋을 읽는다** — 메타·문항은 `GET /classbot/assignments/:id`(operator 도 통과), 제출 현황은
 * `GET /classbot/assignments/:id/submissions`(operator 전용), 그리고 **이름과 인원을 주는 명단**은
 * `GET /classbot/classes/:classId/members`(operator 전용). 종전의 localStorage 스토어 + mock 명단(`classRoster`)은
 * PR 6 에서 걷었다. 마감은 지금 기준이다 — 정본 `dDay` 는 낼 때 굳힌 정수라 `dispatchedAt` 로 다시 센다(`remainingOf`).
 *
 * **제출 행의 학생은 명단과 이어 붙여 이름으로 부른다**(`rosterOf` · `submitterName`). 제출 응답에는
 * `studentId`(sub)뿐이라 종전에는 화면이 `701078b7…` 를 그대로 찍었다. 조인은 **실패를 숨기지 않는다** —
 * 명단에 없는 sub 는 「알 수 없는 학생」으로, 명단 자체를 못 읽었으면 종전처럼 sub 앞 여덟 자로 떨어진다.
 * 같은 명단이 「반 참여」 KPI 도 센다. 종전 값은 반 카드의 `profile.enrolledCount` 하나였고 **둘 중 하나만
 * 어긋나도 `—` 로 비었다** — `useOperatorClasses` 목록에서 이 반을 못 찾거나(`klass === undefined`),
 * 찾았어도 옛 `class_bot_profiles` 투영인 `profile` 이 null 이거나(`toTeacherClass` 가 `?? null`).
 * 명단 길이는 그 둘 어느 쪽에도 기대지 않는 지금 실측이다.
 *
 * **미제출 리마인드는 섰다**(계획 PR 5c) — 대상은 같은 명단 빼기 제출자이고, 발송은
 * `POST /classes/:classId/interventions` 다(`./remind-unsubmitted.tsx`). 명단을 못 읽으면 버튼이 없다.
 * 그쪽도 `useClassMembers(classId)` 를 부르지만 같은 쿼리 키라 요청은 한 번이다.
 *
 * 그래서 이 화면이 **아직 못 하는 것**을 버튼 대신 말로 둔다:
 *  - **고치기·회수** — 정본에 PATCH·회수 문이 없다(계획 §05 표에 그 줄이 없다). 죽은 버튼을 두지 않고 안내 한 줄.
 *  - **코멘트** — 학생 하나를 골라 보내는 자리라 반 상세 「명단」 탭의 줄 끝에 있다(`classroom-roster.tsx`).
 *  - **오답 다시 내기(requiz)** — 그 문이 정본에 없다.
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
  // 명단 — 상세가 오기 전에는 반을 모르므로 `undefined` 로 두면 훅이 묻지 않는다. 훅은 조건부로 부를 수 없어
  // 이른 return(로딩·오류) **앞**에 둔다.
  const members = useClassMembers(detail.data?.classId);

  const klass = useMemo(() => {
    const card = detail.data ? classes.data?.find((c) => c.id === detail.data?.classId) : undefined;
    return card ? toTeacherClass(card) : undefined;
  }, [classes.data, detail.data]);

  // 명단을 **읽었을 때만** 색인을 만든다 — 로딩·403·장애면 `undefined` 이고, 그 뜻은 「이름을 모른다」지
  // 「명단에 없다」가 아니다. 둘을 섞으면 멀쩡한 학생이 「알 수 없는 학생」으로 보인다.
  const roster = useMemo(() => rosterOf(members.data), [members.data]);

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
  // 반 참여 — 명단을 읽었으면 그 길이가 지금 실측이다(정본은 활성 멤버십만 주지만 `isActive` 로 한 번 더 거른다.
  // `unsubmittedMembers` 가 세는 대상과 같은 집합이어야 「3명 중 2명 제출」이 맞는다). 못 읽으면 반 카드
  // 프로필의 굳은 수로, 그것도 없으면 「—」다.
  const enrolled = members.isSuccess
    ? members.data.filter((m) => m.isActive).length
    : (klass?.enrolledCount ?? null);

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

      {/* 한눈에 — 있는 것만 센다. 대상은 명단의 활성 인원(못 읽으면 반 카드의 수, 그것도 없으면 —),
          제출은 제출 현황의 행 수다. */}
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
        <SubmissionsPanel query={submissions} detail={a} roster={roster} />
        {/* 미제출 리마인드 — 명단을 읽을 수 있을 때만 선다(`remind-unsubmitted.tsx`). */}
        {submissions.isSuccess && (
          <RemindUnsubmitted
            classId={a.classId}
            assignmentId={a.id}
            assignmentTitle={a.title}
            submissions={rows}
          />
        )}
        {/*
          이름이 어디서 왔는지 — 명단을 읽었는지에 따라 말이 갈린다. 「이름이 안 보인다」와 「이 학생이 명단에 없다」는
          다른 일이라, 하나로 뭉뚱그리면 교사가 엉뚱한 곳을 본다.
        */}
        <p data-testid="roster-join-note" className="text-pullim-slate-500 text-2xs">
          {roster === undefined
            ? '반 명단을 읽지 못해 학생 이름 대신 식별자 앞 여덟 자로 보여요.'
            : '학생 이름은 반 명단에서 가져왔어요. 명단에 없는 제출은 「알 수 없는 학생」으로 보여요 — 반을 나갔거나 다른 경로로 낸 제출이에요.'}{' '}
          한 학생에게 보내는 코멘트는 반 상세 「명단」 탭에서, 오답 다시 내기는 그 문이 정본에 생기면 여기에 붙여요.
        </p>
      </section>

      <p className="text-pullim-slate-500 text-2xs">
        채점은 <Link href="/teacher/grading?view=queue" className="text-pullim-blue-600 font-bold underline underline-offset-2">채점 허브</Link>에서 해요 — 서술형 AI 초안이 거기로 갑니다.
      </p>
    </TeacherPageShell>
  );
}

/** 제출 현황 표 — 학생 이름(명단 조인)·제출 시각·점수·답. */
function SubmissionsPanel({
  query,
  detail,
  roster,
}: {
  query: ReturnType<typeof useAssignmentSubmissions>;
  detail: AssignmentDetailDto;
  /** sub → 명단 한 줄. 명단을 아직 못 읽었거나 못 읽으면 `undefined`. */
  roster: ReadonlyMap<string, ClassMemberDto> | undefined;
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
        <SubmissionRow key={s.submissionId} submission={s} questions={questions} roster={roster} />
      ))}
    </ul>
  );
}

/** sub 는 길고 뜻이 없다 — 앞 여덟 글자만 보이고 전체는 title 로 남긴다. */
function shortSub(sub: string): string {
  return sub.length > 10 ? `${sub.slice(0, 8)}…` : sub;
}

/**
 * 명단 → sub 색인. 명단을 못 읽었으면(`undefined`) 색인도 만들지 않는다 —
 * 빈 Map 으로 접으면 「이름을 모른다」가 「명단에 없다」로 둔갑한다.
 * @param members - `GET /classes/:classId/members` 응답 · 아직 못 읽었으면 undefined
 * @returns sub → 명단 한 줄 · 못 읽었으면 undefined
 */
function rosterOf(members: ClassMemberDto[] | undefined): ReadonlyMap<string, ClassMemberDto> | undefined {
  return members === undefined ? undefined : new Map(members.map((m) => [m.memberId, m]));
}

/** 제출 행에 그릴 이름. `subOnly` 면 말이 아니라 sub 자체라서 mono 로 그린다. */
interface SubmitterName {
  label: string;
  subOnly: boolean;
}

/**
 * 제출 행의 학생 이름 — 명단과 sub 로 이어 붙인다. 셋을 가른다:
 *  - 명단에서 찾았다 → 표시명(비어 있으면 `memberLabel` 이 「이름 없음 + sub 앞 여덟 자」로 — 반 상세 명단과 같은 말)
 *  - 명단에 없다 → **「알 수 없는 학생 + sub 앞 여덟 자」**. 반을 나갔거나 다른 경로로 낸 제출이고, 조인이 안 됐다는 사실을
 *    숨기지 않는다. uuid 만 찍던 종전과 달리 **왜 이름이 없는지**를 말한다.
 *  - 명단 자체를 못 읽었다(로딩·403·장애) → 종전처럼 sub 앞 여덟 자. 여기서 「알 수 없는 학생」이라고 하면
 *    명단에 멀쩡히 있는 학생을 없다고 말하는 것이 된다.
 * @param roster - sub 색인 · 명단을 못 읽었으면 undefined
 * @param studentId - 제출 행의 학생 sub
 * @returns 화면에 그릴 이름
 */
function submitterName(
  roster: ReadonlyMap<string, ClassMemberDto> | undefined,
  studentId: string,
): SubmitterName {
  if (roster === undefined) return { label: shortSub(studentId), subOnly: true };
  const member = roster.get(studentId);
  if (member === undefined) return { label: `알 수 없는 학생 ${shortSub(studentId)}`, subOnly: false };
  return { label: memberLabel(member), subOnly: false };
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

function SubmissionRow({
  submission: s,
  questions,
  roster,
}: {
  submission: SubmissionsViewDto;
  questions: AssignmentQuestionDto[];
  roster: ReadonlyMap<string, ClassMemberDto> | undefined;
}) {
  // 이름이 보여도 sub 는 `title` 로 남긴다 — 교사가 문의를 넣을 때 옮겨 적는 값이 그것이다.
  const name = submitterName(roster, s.studentId);
  return (
    <li data-testid={`submission-row-${s.studentId}`} className="bg-card rounded-xl border px-3 py-2">
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <span
          className={cn(
            'text-pullim-slate-900 min-w-0 flex-1 truncate text-sm font-semibold',
            name.subOnly && 'font-mono',
          )}
          title={s.studentId}
        >
          {name.label}
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
