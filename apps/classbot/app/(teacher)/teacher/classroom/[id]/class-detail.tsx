'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bot, ClipboardList, Lock, Plus, School, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { useOperatorClass } from '@/hooks/api/classroom';
import { isNotFound, isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import type { AssignmentSummaryDto } from '@/lib/api/classbot-dto';
import { JoinCodeBlock } from '../join-code-block';
import { toOperatorClass, type OperatorClass } from '../operator-class';

/**
 * 반 상세 본문 — 머리(반 이름 · 과목·학년 · 봇 · 참여 코드) + 탭 「과제」 하나(`./page.tsx` 머리주석 — 나머지 탭은
 * 5b·PR 7).
 *
 * 머리는 `GET /bots/:id`(`useOperatorClass`)에서 온다 — 목록 캐시에 기대지 않는다. 남의 반은 정본이 **403** 으로
 * 가르고(`authz.md § 1.5` · `CLASS_OPERATOR_FORBIDDEN`), 없는 반은 404 다. 둘을 한 카드로 뭉개지 않는다 —
 * 「볼 수 없다」와 「없다」는 교사가 다음에 할 일이 다르다.
 *
 * 과제 탭은 `useTeacherAssignments()`(`GET /assignments?audience=teacher` — 내가 operator 인 모든 반)를 받아
 * **화면에서 `classId` 로 거른다.** 반 필터 `&classId=` 는 pullim-api PR 2 가 DTO 에 더한다(완성 설계 § 5 R11) —
 * 그 문이 열리면 거르는 자리가 서버로 옮겨 갈 뿐 이 화면은 그대로다. 줄을 누르면 과제 상세(`/teacher/assignment/[id]`),
 * 「새 과제 내기」는 `/teacher/assignment/new?classId=` 로 **이 반을 들고** 간다 — 그 폼이 `classId` 를 읽는 것은
 * 계획 PR 6(과제 내기 정본화)의 몫이다.
 */
export function ClassDetail({ classId }: { classId: string }) {
  const query = useOperatorClass(classId);

  if (query.isPending) {
    return (
      <Shell title="반 상세">
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (query.isError) {
    // 401 은 고장이 아니다 — `classbotRead` 가 이미 로그인으로 보내는 중이다. 그 사이 화면은 게이트를 든다.
    if (isUnauthorized(query.error)) {
      return (
        <Shell title="반 상세">
          <ReadLoginGate label="반 상세" />
        </Shell>
      );
    }
    if (statusOf(query.error) === 403) {
      return (
        <Shell title="반 상세">
          <EmptyState
            icon={Lock}
            title="이 반은 볼 수 없어요"
            description="이 반의 운영 교사만 볼 수 있어요. 내 수업방 목록에서 반을 골라 주세요."
            action={{ href: '/teacher/classroom', label: '내 수업방' }}
          />
        </Shell>
      );
    }
    if (isNotFound(query.error)) {
      return (
        <Shell title="반 상세">
          <EmptyState
            icon={SearchX}
            title="없는 반이에요"
            description="주소가 바뀌었거나 반이 닫혔을 수 있어요."
            action={{ href: '/teacher/classroom', label: '내 수업방' }}
          />
        </Shell>
      );
    }
    return (
      <Shell title="반 상세">
        <ReadErrorState onRetry={() => void query.refetch()} />
      </Shell>
    );
  }

  const room = toOperatorClass(query.data);

  return (
    <Shell title={room.name} description={<RoomFacts room={room} />}>
      {/* 참여 코드 — 머리 바로 아래 제 상자. 카드에서와 같은 상자라 교사가 같은 자리에서 같은 일을 한다. */}
      <section className="border-pullim-blue-200 bg-pullim-blue-50 rounded-2xl border p-5">
        <JoinCodeBlock classId={room.id} size="lg" />
      </section>

      {/*
        탭 — 지금은 「과제」 하나다(`./page.tsx`). 로컬 `Tabs` 프리미티브(`components/ui/tabs.tsx`)를 쓰지 않는
        이유는 탭이 하나인 동안 전환이 없어서다 — 5b 가 명단·봇 탭을 더하는 날 그 프리미티브로 갈아탄다.
        그래도 역할(tablist·tab·tabpanel)은 지금부터 붙인다 — 낭독기에 「탭 하나짜리 화면」이라고 정확히 말하려고.
      */}
      <div>
        <div role="tablist" aria-label="반 상세" className="border-pullim-slate-200 flex gap-1 border-b">
          <button
            type="button"
            role="tab"
            id="class-tab-assignments"
            aria-selected="true"
            aria-controls="class-panel-assignments"
            className="text-pullim-blue-700 border-pullim-blue-600 -mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-bold"
          >
            <ClipboardList aria-hidden className="h-4 w-4" />
            과제
          </button>
        </div>
        <section
          role="tabpanel"
          id="class-panel-assignments"
          aria-labelledby="class-tab-assignments"
          className="pt-5"
        >
          <ClassAssignments classId={room.id} />
        </section>
      </div>
    </Shell>
  );
}

/** 이 화면의 골격 — 뒤로 가기는 늘 내 수업방이다(레일에 없는 화면이라 이 링크가 위치 단서다). */
function Shell({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <TeacherPageShell
      backHref="/teacher/classroom"
      backLabel="내 수업방"
      header={{ eyebrow: { icon: School, text: '반 상세' }, title, description }}
    >
      {children}
    </TeacherPageShell>
  );
}

/** 머리의 사실 줄 — 과목·학년·봇. 없는 칸은 그리지 않는다(빈 칩은 「값이 비었다」가 아니라 「모른다」로 읽힌다). */
function RoomFacts({ room }: { room: OperatorClass }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="class-facts">
      {room.subject && <Chip tone="info">{room.subject}</Chip>}
      {room.grade && <Chip tone="outline">{room.grade}</Chip>}
      {room.botName ? (
        <Chip tone="outline">
          <Bot aria-hidden />
          <span>
            <span className="sr-only">봇 </span>
            {room.botAvatar ? `${room.botAvatar} ` : ''}
            {room.botName}
          </span>
        </Chip>
      ) : (
        <Chip tone="neutral">
          <Bot aria-hidden />
          봇 없음
        </Chip>
      )}
      {!room.isActive && <Chip tone="neutral">비활성</Chip>}
    </span>
  );
}

/** 과제 탭 — 이 반의 과제만. 거르는 자리는 화면이다(머리주석). */
function ClassAssignments({ classId }: { classId: string }) {
  const query = useTeacherAssignments();
  const newHref = `/teacher/assignment/new?classId=${encodeURIComponent(classId)}`;

  const heading = (
    <SectionHeading
      title="이 반에 낸 과제"
      description="줄을 누르면 제출 현황으로 가요."
      action={
        <Link
          href={newHref}
          data-testid="class-new-assignment"
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" />
          새 과제 내기
        </Link>
      }
    />
  );

  if (query.isPending) {
    return (
      <>
        {heading}
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (query.isError) {
    // 401 은 위 머리가 이미 게이트로 섰거나 로그인으로 가는 중이다 — 여기서 또 말하지 않는다.
    if (isUnauthorized(query.error)) return heading;
    return (
      <>
        {heading}
        <ReadErrorState onRetry={() => void query.refetch()} />
      </>
    );
  }

  const rows = query.data.filter((a) => a.classId === classId);

  if (rows.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          icon={ClipboardList}
          title="이 반에 낸 과제가 없어요"
          description="새 과제를 내면 여기 모여요."
          action={{ href: newHref, label: '새 과제 내기' }}
        />
      </>
    );
  }

  return (
    <>
      {heading}
      <ul className="space-y-2" data-testid="class-assignment-list">
        {rows.map((a) => (
          <AssignmentRow key={a.id} assignment={a} />
        ))}
      </ul>
    </>
  );
}

/** 과제 한 줄 — 제목 · 문항 수 · 마감. 상세는 과제 상세 화면(계획 PR 6)이 답한다. */
function AssignmentRow({ assignment: a }: { assignment: AssignmentSummaryDto }) {
  return (
    <li data-testid={`class-assignment-${a.id}`}>
      <Link
        href={`/teacher/assignment/${a.id}`}
        className="bg-card hover:border-pullim-blue-300 focus-visible:ring-pullim-blue-400/50 flex items-center gap-4 rounded-2xl border p-4 transition-colors outline-none focus-visible:ring-2"
      >
        <span className="min-w-0 flex-1">
          <span className="text-pullim-slate-900 block truncate text-sm font-bold">{a.title}</span>
          <span className="text-pullim-slate-500 mt-0.5 block truncate text-2xs">
            {a.questionCount}문항{a.subject ? ` · ${a.subject}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="text-pullim-slate-500 block text-micro font-semibold tracking-wider uppercase">마감</span>
          <span className="text-pullim-slate-900 font-mono text-sm font-bold">{a.dueLabel}</span>
        </span>
      </Link>
    </li>
  );
}
