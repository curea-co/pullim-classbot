'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ClipboardList, Lock, Plus, School, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { useClassDetail } from '@/hooks/api/classroom';
import { isNotFound, isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import type { AssignmentSummaryDto, ClassDto } from '@/lib/api/classbot-dto';
import { cn } from '@/lib/utils';
import { JoinCodeBlock } from '../join-code-block';
import { KnownBotChip } from '../known-bot-chip';
import { ClassActionsMenu } from '../class-actions-menu';
import { toOperatorClass, type OperatorClass } from '../operator-class';
import { ClassBotTab } from './class-bot-tab';
import { ClassChatTab } from './class-chat-tab';
import { CLASS_TABS, classTabHref, type ClassTabId } from './class-tabs';
import { ClassroomRoster } from './classroom-roster';

/**
 * 반 상세 본문 — 머리(반 이름 · 과목·학년 · 봇 · 참여 코드) + 탭 넷(`./class-tabs.ts` — 명단 · 봇 · 과제 · 대화).
 *
 * 머리는 `GET /bots/:id`(`useOperatorClass`)에서 온다 — 목록 캐시에 기대지 않는다. 남의 반은 정본이 **403** 으로
 * 가르고(`authz.md § 1.5` · `CLASS_OPERATOR_FORBIDDEN`), 없는 반은 404 다. 둘을 한 카드로 뭉개지 않는다 —
 * 「볼 수 없다」와 「없다」는 교사가 다음에 할 일이 다르다. 머리의 **봇 칩과 참여 코드 상자**는 반 상세 문
 * (`GET /classes/:classId` · `useClassDetail` · pullim-api #672)이 주는 `ClassDto` 에서 온다 — 옛 `profile` 로
 * 「봇 없음」을 단정하지 않는다(`known-bot-chip.tsx` · 「봇」 탭과 같은 원천이라 같은 화면에서 반대 말을 하지 않는다).
 * 두 문을 함께 두드리는 이유는 뜻이 갈려서다: `GET /bots/:id` 는 반의 정체(이름·과목·학년)를, `GET /classes/:id` 는
 * 반이 **지금 가리키는 것**(봇 · 살아 있는 코드)을 준다. 계획 PR 5d 전에는 뒤쪽이 이 세션의 캐시뿐이라 새로고침하면
 * 칩이 다시 비었다.
 *
 * 탭은 **링크**다(`?tab=` · replace · 스크롤 유지 — `./class-tabs.ts`): 로컬 `Tabs` 프리미티브(`components/ui/tabs.tsx`)는
 * 상태 기반이라 밖에서 특정 탭으로 보내는 주소(배너의 `?tab=bot` · 관제소의 `?tab=chat&student=`)를 못 받는다.
 * 링크라서 ARIA tabs 역할은 붙이지 않는다 — `role="tab"` 은 방향키 이동·비활성 탭 `tabIndex=-1` 을 약속하는데 링크는
 * 그 약속을 못 지킨다. 대신 `<nav>` + `aria-current="page"` 로 「지금 어느 탭인가」를 정직하게 말한다. 안 보이는 탭의
 * 판은 그리지 않으므로 각 탭의 문은 **그 탭을 열 때** 두드린다.
 *
 * 과제 탭은 `useTeacherAssignments()`(`GET /assignments?audience=teacher` — 내가 operator 인 모든 반)를 받아
 * **화면에서 `classId` 로 거른다.** 반 필터 `&classId=` 는 정본에 이미 있다(pullim-api PR 2) — 옮기는 일은 별건이고
 * 이 화면은 그대로다. 줄을 누르면 과제 상세(`/teacher/assignment/[id]`), 「새 과제 내기」는
 * `/teacher/assignment/new?classId=` 로 **이 반을 들고** 간다.
 *
 * 대화 탭(`./class-chat-tab.tsx` · 계획 PR 7)은 학생별 기록과 신호 배지·확인이다 — 고른 학생은 그 탭이 `?student=` 로
 * 직접 읽는다(관제소가 `?tab=chat&student=` 로 곧장 보낸다).
 */
export function ClassDetail({
  classId,
  tab,
}: {
  classId: string;
  /** 지금 열린 탭 — `page.tsx` 가 `?tab=` 에서 읽어 넘긴다. */
  tab: ClassTabId;
}) {
  const router = useRouter();
  const query = useClassDetail(classId);

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

  const classroom = query.data;
  const room = toOperatorClass(classroom);
  const readOnly = !classroom.isActive;

  return (
    <Shell
      title={room.name}
      description={<RoomFacts room={room} known={classroom} />}
      action={
        <ClassActionsMenu
          classroom={classroom}
          onArchived={() => router.replace('/teacher/classroom')}
          onDeleted={() => router.replace('/teacher/classroom')}
        />
      }
    >
      {/* 참여 코드 — 머리 바로 아래 제 상자. 카드에서와 같은 상자라 교사가 같은 자리에서 같은 일을 한다. */}
      {readOnly ? (
        <section className="border-pullim-slate-200 bg-pullim-slate-50 rounded-2xl border p-5" role="status">
          <p className="text-pullim-slate-900 text-sm font-bold">보관된 수업방이에요</p>
          <p className="text-pullim-slate-600 mt-1 text-xs">기존 명단·과제·제출·대화 기록은 볼 수 있지만 새 참여와 쓰기 동작은 멈춰 있어요. 다시 열면 새 참여 코드가 발급돼요.</p>
        </section>
      ) : (
        <section className="border-pullim-blue-200 bg-pullim-blue-50 rounded-2xl border p-5">
          <JoinCodeBlock classId={room.id} initial={classroom.joinCode} size="lg" />
        </section>
      )}

      <div>
        <nav aria-label="반 상세" className="border-pullim-slate-200 flex gap-1 border-b">
          {CLASS_TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={classTabHref(room.id, t.id)}
                replace
                scroll={false}
                aria-current={active ? 'page' : undefined}
                data-testid={`class-tab-${t.id}`}
                className={cn(
                  '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition-colors',
                  'focus-visible:ring-pullim-blue-400/50 focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'text-pullim-blue-700 border-pullim-blue-600'
                    : 'text-pullim-slate-500 hover:text-pullim-slate-900 border-transparent',
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <section className="pt-5" data-testid={`class-panel-${tab}`}>
          {tab === 'members' ? (
            <ClassroomRoster classId={room.id} classroomName={room.name} readOnly={readOnly} />
          ) : tab === 'bot' ? (
            <ClassBotTab classId={room.id} classroomName={room.name} readOnly={readOnly} />
          ) : tab === 'chat' ? (
            <ClassChatTab classId={room.id} readOnly={readOnly} />
          ) : (
            <ClassAssignments classId={room.id} readOnly={readOnly} />
          )}
        </section>
      </div>
    </Shell>
  );
}

/** 이 화면의 골격 — 뒤로 가기는 늘 내 수업방이다(레일에 없는 화면이라 이 링크가 위치 단서다). */
function Shell({ title, description, action, children }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <TeacherPageShell
      backHref="/teacher/classroom"
      backLabel="내 수업방"
      header={{ eyebrow: { icon: School, text: '반 상세' }, title, description, action }}
    >
      {children}
    </TeacherPageShell>
  );
}

/**
 * 머리의 사실 줄 — 과목·학년(옛 profile)·봇(아는 `ClassDto`)·비활성. 없는 칸은 그리지 않는다(빈 칩은 「값이 비었다」가
 * 아니라 「모른다」로 읽힌다) — 봇도 모르면 칩이 없다.
 */
function RoomFacts({ room, known }: { room: OperatorClass; known: ClassDto | undefined }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="class-facts">
      {room.subject && <Chip tone="info">{room.subject}</Chip>}
      {room.grade && <Chip tone="outline">{room.grade}</Chip>}
      <KnownBotChip known={known} data-testid="class-bot-chip" />
      {!room.isActive && <Chip tone="neutral">비활성</Chip>}
    </span>
  );
}

/** 과제 탭 — 이 반의 과제만. 거르는 자리는 화면이다(머리주석). */
function ClassAssignments({ classId, readOnly = false }: { classId: string; readOnly?: boolean }) {
  const query = useTeacherAssignments();
  const newHref = `/teacher/assignment/new?classId=${encodeURIComponent(classId)}`;

  const heading = (
    <SectionHeading
      title="이 반에 낸 과제"
      description="줄을 누르면 제출 현황으로 가요."
      action={!readOnly ? (
        <Link
          href={newHref}
          data-testid="class-new-assignment"
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" />
          새 과제 내기
        </Link>
      ) : undefined}
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
          action={readOnly ? undefined : { href: newHref, label: '새 과제 내기' }}
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
