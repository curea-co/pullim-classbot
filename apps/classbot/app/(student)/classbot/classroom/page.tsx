'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap, KeyRound, Target } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { JoinCodeForm } from '@/components/classbot/home/join-code-form';
import { useMyRooms, type RoomSlot } from '@/components/classbot/home/my-rooms';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyClassrooms } from '@/hooks/api/classroom';
import { ApiClientError } from '@/lib/api/client-fetch';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';

/**
 * 내 수업방 — 참여한 반 목록 + **언제나 열려 있는 참여 코드 입구**.
 *
 * 왜 이 화면이 따로 있나: 참여 코드 입력칸이 홈 hero 에만 있으면 **한 번 참여한 뒤로
 * 사라진다.** 「학생은 여러 선생님의 수업방에 참여할 수 있다」가 화면으로는 불가능해지는
 * 자리라, 참여 여부와 무관하게 늘 같은 곳에 입구를 둔다.
 *
 * 목록은 서버(`GET /api/me/classrooms`)가 진실이고, 데모 코드로 들어온 로컬 방은
 * 그 뒤에 붙는다(`useMyRooms`).
 */
export default function StudentClassroomPage() {
  const { rooms, isLoading } = useMyRooms();
  const { error, refetch } = useMyClassrooms();
  const leaveClass = useClassEnrollmentStore((s) => s.leave);

  // 401 은 「로그인도 개발용 신원도 없는 데모」다 — 그 경우 로컬 방만 보여주면 되고
  // 화면을 에러로 덮지 않는다. 그 밖의 실패만 다시 시도 카드를 띄운다.
  const isError = error instanceof ApiClientError && error.status !== 401;

  return (
    <div className="space-y-4">
      <BackLink href="/classbot">클래스봇 홈</BackLink>

      <PageHeader
        eyebrow={{ icon: GraduationCap, text: '내 수업방' }}
        title={
          <>
            참여 중인 수업방 <span className="text-pullim-blue-600">{rooms.length}</span>곳
          </>
        }
        description="선생님께 받은 참여 코드로 여러 반에 참여할 수 있어요."
        action={
          <Link
            href="/classbot/assignment"
            aria-label="받은 과제로 가기"
            className="bg-card hover:bg-pullim-slate-50/50 text-pullim-slate-700 inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:ring-pullim-blue-400/50 focus-visible:outline-none focus-visible:ring-2"
          >
            <Target className="h-3.5 w-3.5" />
            받은 과제
          </Link>
        }
      />

      {/* ─── 코드로 참여하기 — 참여 개수와 무관하게 늘 여기 있다 ─── */}
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading
          title={
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="text-pullim-blue-600 h-4 w-4" />
              코드로 참여하기
            </span>
          }
          description="선생님이 알려 준 6자리 코드를 넣어 주세요. 대소문자와 붙임표(-)는 가려 읽지 않아요."
        />
        <JoinCodeForm />
      </section>

      {/* ─── 참여 중인 수업방 ─── */}
      <SectionHeading title="참여 중인 수업방" />

      {isError ? (
        <ReadErrorState onRetry={() => void refetch()} />
      ) : isLoading && rooms.length === 0 ? (
        <RoomListSkeleton />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="아직 참여한 수업방이 없어요"
          description="선생님께 받은 참여 코드를 위에 넣으면 그 반의 과제를 받아요."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rooms.map((room) => (
            <RoomCard
              // 방 목록의 key 는 봇이 아니라 **반**이다 — 같은 봇을 쓰는 반이 둘이면
              // 봇 id 는 겹친다(서버 계약이 classroomId·botId 를 따로 둔 이유).
              key={room.enrollment.classroomId}
              room={room}
              onLeave={room.source === 'local' ? () => leaveClass(room.bot.id) : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** `2026-09-02T…` → `9월 2일 참여`. 시간대에 기대지 않으려고 문자열에서 바로 읽는다. */
function joinedLabel(assignedAt: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(assignedAt);
  return m ? `${Number(m[2])}월 ${Number(m[3])}일 참여` : null;
}

function RoomCard({ room, onLeave }: { room: RoomSlot; onLeave?: () => void }) {
  const { bot, enrollment } = room;
  const sig = botSignature(bot);
  const joined = joinedLabel(enrollment.assignedAt);

  return (
    <li>
      <article className="bg-card h-full rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: sig.hex }}
          >
            {bot.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-pullim-slate-900 truncate text-sm font-bold tracking-tight">
              {enrollment.classroomLabel}
            </h3>
            <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">
              {bot.name} · {enrollment.assignedBy}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {bot.subject && (
                <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-1.5 py-0.5 text-2xs font-semibold">
                  {bot.subject}
                </span>
              )}
              {bot.grade && (
                <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-1.5 py-0.5 text-2xs font-semibold">
                  {bot.grade}
                </span>
              )}
              {enrollment.via && (
                <span className="text-pullim-slate-400 truncate text-2xs">{enrollment.via}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-pullim-slate-400 text-2xs">{joined ?? ''}</span>
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              aria-label={`${enrollment.classroomLabel} 나가기`}
              className="text-pullim-slate-400 hover:text-pullim-slate-600 focus-visible:ring-pullim-blue-400/50 min-h-11 shrink-0 rounded-lg px-2 text-2xs font-medium underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2"
            >
              나가기
            </button>
          ) : (
            <Link
              href="/classbot/assignment"
              aria-label={`${enrollment.classroomLabel}의 과제 보러 가기`}
              className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-2xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              과제 보기
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </article>
    </li>
  );
}

function RoomListSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}
