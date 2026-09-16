'use client';

import Link from 'next/link';
import { ArrowRight, Bot, KeyRound, School } from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadLoginGate } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useOperatorClasses } from '@/hooks/api/classroom';
import { isUnauthorized } from '@/lib/api/classbot-client';
import { CreateClassroomForm } from './create-classroom-form';
import { JoinCodeBlock } from './join-code-block';
import { toOperatorClass, type OperatorClass } from './operator-class';

/**
 * 반 만들기가 열려 있는가 — **지금은 닫혀 있다.**
 *
 * 정본(pullim-api)에 `POST /classes` 가 아직 없다(완성 설계 § 5 R1 「가장 큰 구멍」 · pullim-api PR 2). 같은 오리진
 * `useCreateClassroom` 이 만드는 반은 이 화면이 읽는 정본 목록에 나타나지 않으므로, 폼을 그대로 두면 교사는
 * 「만들었는데 목록에 없다」를 본다. 그래서 폼(`create-classroom-form.tsx`)은 코드에 남기고 이 상수 하나로 가린다 —
 * 계획 **PR 5b** 가 정본 문으로 폼을 옮기고 이 값을 지운다(상수를 `true` 로 켜는 것이 아니라 상수 자체를 걷는다).
 */
export const CLASS_CREATE_AVAILABLE = false as boolean;

/** 교사에게 그 사실을 말하는 한 줄 — 버튼이 있던 자리에 선다. */
export const CLASS_CREATE_PENDING_NOTICE = '반 만들기는 다음 업데이트에서 열려요';

/**
 * 내 수업방 — 내가 operator 인 반을 정본에서 읽고, 반마다 참여 코드를 새로 낸다.
 *
 * 이 화면이 하는 일은 **참여 코드를 손에 쥐여 주는 것** 하나다(종전과 같다). 달라진 것은 읽는 곳이다 —
 * 같은 오리진 `/api/teacher/classrooms` 가 아니라 pullim-api `GET /classbot/bots?role=teacher`(`useOperatorClasses`).
 * 두 세계의 반 id 를 한 화면에 섞지 않는다: 코드는 정본 반에만 붙고, 같은 오리진 반에 붙은 코드는 학생이
 * 넣어도 안 열린다(학생의 참여도 정본 `POST /enrollments` 다).
 *
 * 카드에서 **내린 것 둘**(계획 PR 5a):
 *  - 학생 명단 — 정본에 `GET /classes/:id/members` 가 없다(PR 2). 같은 오리진 명단을 정본 카드에 붙이면 반 id 가
 *    다른 세계의 것이 된다. 5b 가 정본 문으로 되살린다(반 상세 「명단」 탭).
 *  - 봇 마켓 공유 칸 — 같은 오리진 봇 id 와 게시 상태(`TeacherClassroomItem.isPublished`)를 전제했고 정본 카드에는
 *    둘 다 없다. 마켓 계열은 범위 밖(결정 ①)이라 축을 바꾸지 않고 **`/teacher/marketplace` 「내 봇 공유」로
 *    옮겼다**(`app/(teacher)/teacher/marketplace/publish-bot-block.tsx` · #351 리뷰 S1).
 * 카드에 **더한 것**: 「자세히」 → 반 상세(`/teacher/classroom/[id]`).
 */
export function ClassroomWorkspace() {
  const query = useOperatorClasses();

  /*
    401 은 **고장이 아니다** — `classbotRead` 가 이미 OS 로그인으로 보내는 중이고(`lib/api/classbot-client.ts`),
    RoleGuard 가 비로그인을 먼저 막는다. 그 사이 한 박자 화면은 게이트를 든다(prod-verify 익명 레인이 읽는
    「로그인이 필요해요」 · `tests/e2e/public-and-gates.spec.ts`). 여기서 mock 으로 굴리지 **않는다** — 이 화면이
    건네는 것은 참여 코드이고, 가짜 반에 붙은 코드는 학생이 넣어도 안 열린다.
  */
  // 라벨은 게이트 문장 `${label}를 보려면` 에 들어간다 — 받침 없는 말이어야 「를」이 맞는다(「내 수업방를」 ✗).
  if (query.isError && isUnauthorized(query.error)) return <ReadLoginGate label="수업방 참여 코드" />;

  if (query.isError) {
    return (
      <AlertCard tone="danger" icon={KeyRound} title="수업방을 불러오지 못했어요">
        <p className="text-pullim-slate-700 text-sm" data-testid="classroom-error">
          {query.error.message}
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </AlertCard>
    );
  }

  const rooms = (query.data ?? []).map(toOperatorClass);

  return (
    <>
      <section>
        <SectionHeading
          title={query.isPending ? '내 수업방' : `내 수업방 ${rooms.length}개`}
          description="참여 코드를 새로 내어 학생에게 알려주면 그 반으로 들어와요."
          action={
            CLASS_CREATE_AVAILABLE ? undefined : (
              <p className="text-pullim-slate-500 text-2xs" data-testid="classroom-create-pending">
                {CLASS_CREATE_PENDING_NOTICE}
              </p>
            )
          }
        />

        {query.isPending ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={School}
            title="아직 연 수업방이 없어요"
            description={`${CLASS_CREATE_PENDING_NOTICE}. 반이 생기면 여기서 참여 코드를 내어 학생을 들일 수 있어요.`}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="classroom-list">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </ul>
        )}
      </section>

      {/* 반 만들기 — 정본 문이 열릴 때까지 가린다(`CLASS_CREATE_AVAILABLE`). 참조는 남긴다 — 5b 가 이 폼을 옮긴다. */}
      {CLASS_CREATE_AVAILABLE && <CreateClassroomForm onCreated={() => void query.refetch()} />}
    </>
  );
}

/**
 * 반 한 칸 — 반 정체(이름 · 과목·학년 · 봇) · 참여 코드 · 「자세히」.
 * 코드는 카드 안에서 제 상자를 갖는다. 다른 값과 같은 줄에 두면 그냥 또 하나의 값이 된다.
 */
function RoomCard({ room }: { room: OperatorClass }) {
  return (
    <li className="bg-card rounded-2xl border p-5" data-testid={`classroom-card-${room.id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-pullim-slate-900 min-w-0 truncate text-sm font-bold">{room.name}</h3>
        {!room.isActive && <Chip tone="neutral" className="shrink-0">비활성</Chip>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {room.subject && <Chip tone="info">{room.subject}</Chip>}
        {room.grade && <Chip tone="outline">{room.grade}</Chip>}
        {/* 봇 — bot == class 라 이름이 반 이름과 같다(`operator-class.ts`). 프로필이 없으면 「봇 없음」이 사실이다. */}
        {room.botName ? (
          <Chip tone="outline" data-testid={`classroom-bot-${room.id}`}>
            <Bot aria-hidden />
            <span>
              <span className="sr-only">봇 </span>
              {room.botAvatar ? `${room.botAvatar} ` : ''}
              {room.botName}
            </span>
          </Chip>
        ) : (
          <Chip tone="neutral" data-testid={`classroom-bot-${room.id}`}>
            <Bot aria-hidden />
            봇 없음
          </Chip>
        )}
      </div>

      <div className="border-pullim-blue-200 bg-pullim-blue-50 mt-4 rounded-xl border p-4">
        <JoinCodeBlock classId={room.id} />
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/teacher/classroom/${encodeURIComponent(room.id)}`}
          aria-label={`${room.name} 자세히`}
          data-testid={`classroom-detail-${room.id}`}
          className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          자세히
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}
