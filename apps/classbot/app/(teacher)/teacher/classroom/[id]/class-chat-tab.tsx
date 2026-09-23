'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, MessageSquare, SearchX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/classbot/empty-state';
import { MemberTranscript } from '@/components/classbot/monitoring/member-transcript';
import { SeverityChip, SignalKindChips, UnackedChip } from '@/components/classbot/monitoring/signal-badges';
import { ReadErrorState } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassMembers } from '@/hooks/api/classroom';
import { useAckSignal, useClassSignals, useMemberChat, useStudentSignals } from '@/hooks/api/monitoring';
import { isNotFound, isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import {
  buildMonitorRows,
  memberLabel,
  relativeTimeLabel,
  toSignalMark,
  toTranscriptRow,
  type MonitorStudentRow,
} from '@/lib/risk-signals';
import { cn } from '@/lib/utils';
import { classTabHref } from './class-tabs';

/**
 * 반 상세 「대화」 탭 — 왼쪽은 학생 목록(신호 배지), 오른쪽은 고른 학생의 대화 기록(신호 칩 · 확인). 완성 설계 § 6.2 ·
 * § 7 「교사가 보는 것」 · `proc/spec/05 § 3`. 계획 PR 7.
 *
 * **고른 학생은 URL 이 정한다**(`?student=` · `useSearchParams`). 목록에서 누르면 `router.replace` 로 주소를 바꾸고 화면은
 * 그 주소를 읽는다 — 관제소가 `?tab=chat&student=` 로 곧장 보내는 것과 같은 길이고, 새로고침·뒤로 가기·링크 공유에서
 * 선택이 살아남는다. 상태를 따로 들지 않아 주소와 화면이 어긋날 자리가 없다.
 *
 * 왼쪽은 **명단 ∪ 신호 집계**다(`buildMonitorRows`) — 명단(`GET /classes/:id/members`)에 없는데 신호가 있는 옛 멤버도
 * 줄을 갖는다(기록은 남고 열람 문도 열려 있다 · api.md § 3.8). 순서는 미확인 많은 학생이 위다.
 * 오른쪽은 `GET …/chat?studentId=` + `GET …/signals?studentId=` — 학생을 고를 때만 읽는다.
 *
 * 401 은 여기서 말하지 않는다 — 반 머리(`class-detail.tsx`)가 게이트를 들거나 로그인으로 가는 중이다. 403·404 도
 * 머리가 먼저 가른다(남의 반 · 없는 반). 그래서 이 탭의 오류는 대개 일시 장애다 — 다시 시도 하나로 답한다.
 */
export function ClassChatTab({ classId, readOnly = false }: { classId: string; readOnly?: boolean }) {
  const members = useClassMembers(classId);
  const signals = useClassSignals(classId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('student');

  const rows = useMemo(
    () => buildMonitorRows(members.data ?? [], signals.data?.summary ?? []),
    [members.data, signals.data],
  );
  const selected = rows.find((r) => r.studentId === selectedId) ?? null;
  const selectedName = selected?.name ?? (selectedId ? memberLabel(null, selectedId) : '');

  function selectStudent(studentId: string) {
    router.replace(classTabHref(classId, 'chat', studentId), { scroll: false });
  }

  const heading = (
    <SectionHeading
      title="학생별 대화"
      description="학생을 고르면 그 학생이 봇과 나눈 기록과 잡힌 신호가 보여요."
    />
  );

  if (members.isPending || signals.isPending) {
    return (
      <>
        {heading}
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  const error = members.isError ? members.error : signals.isError ? signals.error : null;
  if (error !== null) {
    if (isUnauthorized(error)) return heading;
    return (
      <>
        {heading}
        <ReadErrorState
          onRetry={() => {
            void members.refetch();
            void signals.refetch();
          }}
        />
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          icon={Users}
          title="아직 들어온 학생이 없어요"
          description="학생이 참여 코드로 들어와 봇과 이야기하면 여기 보여요."
        />
      </>
    );
  }

  // 「n분 전」의 기준은 **데이터를 읽은 시각**(react-query `dataUpdatedAt`)이다 — 렌더 안에서 시계를 읽지 않는다.
  // 화면이 열려 있는 동안은 창 포커스마다 다시 읽히므로 라벨도 그때 함께 움직인다.
  const now = Math.max(members.dataUpdatedAt, signals.dataUpdatedAt);

  return (
    <div data-testid="class-chat-tab">
      {heading}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <StudentList rows={rows} selectedId={selectedId} onSelect={selectStudent} now={now} />
        {selectedId === null ? (
          <EmptyState
            icon={MessageSquare}
            title="학생을 골라 주세요"
            description="왼쪽 목록에서 학생을 누르면 대화 기록이 열려요."
            className="self-start"
          />
        ) : (
          <TranscriptPanel key={selectedId} classId={classId} studentId={selectedId} studentName={selectedName} readOnly={readOnly} />
        )}
      </div>
    </div>
  );
}

/**
 * 왼쪽 학생 목록 — 줄마다 이름 · 종류별 건수 · 세기 · 미확인. 관제소 표(`signal-student-table.tsx`)와 같은 배지를 쓰되
 * 좁은 열에 맞춰 세로로 쌓는다. 누르면 주소가 바뀌고(`?student=`) 오른쪽이 따라온다(`aria-pressed`).
 */
function StudentList({
  rows,
  selectedId,
  onSelect,
  now,
}: {
  rows: MonitorStudentRow[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
  now: number;
}) {
  return (
    <ul className="bg-card self-start rounded-2xl border p-2" aria-label="학생 목록" data-testid="chat-student-list">
      {rows.map((row) => {
        const active = row.studentId === selectedId;
        return (
          <li key={row.studentId}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(row.studentId)}
              data-testid={`chat-student-${row.studentId}`}
              className={cn(
                'focus-visible:ring-pullim-blue-400/50 flex w-full flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                active ? 'bg-pullim-blue-50' : 'hover:bg-pullim-slate-50',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn('h-5 w-1 shrink-0 rounded-full', row.badge?.high ? 'bg-pullim-danger' : 'bg-transparent')}
                />
                <span className={cn('truncate text-sm font-bold', active ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                  {row.name}
                </span>
                {!row.enrolled && (
                  <Chip tone="outline" className="py-[5px] px-2">
                    나간 학생
                  </Chip>
                )}
                <span className="text-pullim-slate-400 ml-auto shrink-0 font-mono text-micro">
                  {row.lastActiveAt ? relativeTimeLabel(row.lastActiveAt, now) : ''}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-1 pl-3">
                <SignalKindChips badge={row.badge} />
                {row.badge && (
                  <>
                    <SeverityChip severity={row.badge.maxSeverity} high={row.badge.high} />
                    <UnackedChip unacked={row.badge.unacked} />
                  </>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 확인 실패 → 교사가 읽는 한 줄. 404 는 「없는 신호 또는 남의 반 신호」 — 서버가 둘을 가르지 않는다. */
export function ackFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 401:
      return '로그인이 필요해요.';
    case 404:
      return '이미 없는 신호예요.';
    default:
      return '확인을 남기지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

/** 오른쪽 — 고른 학생의 기록 + 신호. `key={studentId}` 로 학생이 바뀌면 통째로 다시 선다. */
function TranscriptPanel({ classId, studentId, studentName, readOnly = false }: { classId: string; studentId: string; studentName: string; readOnly?: boolean }) {
  const chat = useMemberChat(classId, studentId);
  const signals = useStudentSignals(classId, studentId);
  const ack = useAckSignal(classId);
  const [pendingAckIds, setPendingAckIds] = useState<ReadonlySet<string>>(() => new Set());

  const rows = useMemo(() => (chat.data ?? []).map(toTranscriptRow), [chat.data]);
  const marks = useMemo(() => (signals.data?.signals ?? []).map(toSignalMark), [signals.data]);

  function handleAck(signalId: string) {
    if (readOnly) return;
    setPendingAckIds((cur) => new Set(cur).add(signalId));
    ack.mutate(
      { signalId, studentId },
      {
        onError: (error) => toast.error(ackFailureMessage(error)),
        onSettled: () =>
          setPendingAckIds((cur) => {
            const next = new Set(cur);
            next.delete(signalId);
            return next;
          }),
      },
    );
  }

  if (chat.isPending || signals.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" data-testid="transcript-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  const error = chat.isError ? chat.error : signals.isError ? signals.error : null;
  if (error !== null) {
    if (isUnauthorized(error)) return null;
    if (statusOf(error) === 403) {
      return (
        <EmptyState icon={Lock} title="이 대화는 볼 수 없어요" description="이 반의 운영 교사만 볼 수 있어요." />
      );
    }
    // 반 머리가 없는 반(404)을 이미 걸렀으므로 여기 404 는 「이 반 학생이 아니다」(`CLASS_MEMBER_NOT_FOUND`)다.
    if (isNotFound(error)) {
      return (
        <EmptyState
          icon={SearchX}
          title="이 반에 기록이 없는 학생이에요"
          description="이 반에 들어온 적이 없는 학생은 대화를 볼 수 없어요."
        />
      );
    }
    return (
      <ReadErrorState
        onRetry={() => {
          void chat.refetch();
          void signals.refetch();
        }}
      />
    );
  }

  return (
    <MemberTranscript
      studentName={studentName}
      rows={rows}
      marks={marks}
      onAck={handleAck}
      pendingAckIds={pendingAckIds}
      readOnly={readOnly}
    />
  );
}
