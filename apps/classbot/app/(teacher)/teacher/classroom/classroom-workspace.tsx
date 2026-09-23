'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, School, X } from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadLoginGate } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useClasses, type ClassLifecycleState } from '@/hooks/api/classroom';
import { isUnauthorized } from '@/lib/api/classbot-client';
import { formatJoinCode, joinCodeLife } from '@/lib/join-code-format';
import { classTabHref } from './[id]/class-tabs';
import { CreateClassroomForm, type CreatedClassroom } from './create-classroom-form';
import { JoinCodeBlock } from './join-code-block';
import { KnownBotChip } from './known-bot-chip';
import { ClassActionsMenu } from './class-actions-menu';
import type { ClassDto } from '@/lib/api/classbot-dto';

/**
 * 내 수업방 — 내가 operator 인 반을 정본에서 읽고, 반을 만들고, 반마다 참여 코드를 낸다.
 *
 * 읽는 곳은 pullim-api `GET /classbot/bots?role=teacher`(`useOperatorClasses`), 만드는 곳은 `POST /classbot/classes`
 * (`useCreateClassroom` · 계획 PR 5b — 5a 때 `CLASS_CREATE_AVAILABLE=false` 뒤에 가려 뒀던 폼을 정본 문으로 옮기고
 * 그 상수를 걷었다). 두 세계의 반 id 를 한 화면에 섞지 않는다: 코드는 정본 반에만 붙고, 학생의 참여도 정본
 * `POST /enrollments` 다.
 *
 * 반을 만들면 **첫 코드가 함께 온다**(한 트랜잭션). 배너가 그 코드와 닫히는 시각을 크게 들고, 「봇 붙이러 가기」가
 * 새 반 상세의 「봇」 탭(`?tab=bot`)으로 간다 — 교사가 지금 할 일은 코드를 건네는 것이고 다음 할 일은 봇을 붙이는
 * 것이다. 목록이 다시 그려지면 그 반의 카드도 같은 코드로 선다(`useClassDetail` → `JoinCodeBlock.initial`).
 *
 * 카드의 봇 칩은 **반 상세 문이 준 `ClassDto`** 로 그린다(`useClassDetail` · `known-bot-chip.tsx` — 모른다 · 없다 ·
 * 이 봇). 계획 PR 5d 전에는 이 자리가 **이 세션이 만들거나 고친 반만 아는** 캐시라 새로고침하면 칩이 다시
 * 비었다 — 이제 묻는다(pullim-api #672).
 *
 * 그래서 카드마다 반 상세를 한 번씩 읽는다(목록 한 번 + 반 N 번).
 * *(`[2026-09-19 정정]` 종전에는 「목록 문에는 `classes.bot_id` 가 실리지 않아 `POST /classes` 로 만든 반이
 * 봇을 붙인 뒤에도 늘 「봇 없음」이 된다 · 목록 문이 그것을 싣게 되는 날 이 N 번은 없어진다」고 적었다.
 * **그날이 왔다** — pullim-api #679 가 카드에 `botId` 를 싣고, 봇 이름(`name`)과 아바타(`profile.avatarEmoji`)
 * 까지 함께 준다. 그래서 **이 N 번은 이제 없앨 수 있다 — 별건이다.** 칩 셋(모른다·없다·이 봇)을 카드 한 장에서
 * 짓는 모양으로 다시 잡는 일이라 이 PR 의 범위 밖이다.)*
 * 붙이고 떼는 자리는 반 상세 「봇」 탭. 카드에 **없는 것**(계획 PR 5a 그대로): 명단(반 상세 「명단」 탭) ·
 * 봇 마켓 공유 칸(`/teacher/marketplace` 「내 봇 공유」 · 결정 ①).
 */
export function ClassroomWorkspace() {
  const active = useClasses('active');
  const archived = useClasses('archived');
  const [state, setState] = useState<ClassLifecycleState>('active');
  const [created, setCreated] = useState<CreatedClassroom | null>(null);
  const [notice, setNotice] = useState('');
  const listRef = useRef<HTMLElement>(null);
  const query = state === 'active' ? active : archived;

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

  const rooms = query.data ?? [];

  function focusList(message: string) {
    listRef.current?.focus();
    setNotice('');
    requestAnimationFrame(() => setNotice(message));
  }

  return (
    <>
      {created && <CreatedBanner created={created} onDismiss={() => setCreated(null)} />}

      <section ref={listRef} tabIndex={-1} aria-label="내 수업방" className="scroll-mt-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50">
        <SectionHeading
          title={query.isPending ? '내 수업방' : `${state === 'active' ? '운영 중' : '지난 수업방'} ${rooms.length}개`}
          description="참여 코드를 새로 내어 학생에게 알려주면 그 반으로 들어와요."
        />

        <p className="sr-only" role="status">{notice}</p>
        <div role="tablist" aria-label="수업방 상태" className="bg-pullim-slate-100 mb-4 inline-flex rounded-xl p-1">
          {(['active', 'archived'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={state === value}
              onClick={() => setState(value)}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 ${state === value ? 'bg-card text-pullim-slate-900 shadow-sm' : 'text-pullim-slate-500'}`}
            >
              {value === 'active' ? `운영 중 ${active.data?.length ?? 0}` : `지난 수업방 ${archived.data?.length ?? 0}`}
            </button>
          ))}
        </div>

        {query.isPending ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={School}
            title={state === 'active' ? '아직 연 수업방이 없어요' : '보관한 수업방이 없어요'}
            description={state === 'active' ? '아래에서 반을 만들면 참여 코드가 나와요. 그 코드를 학생에게 알려 주면 반으로 들어와요.' : '수업이 끝난 반을 보관하면 기존 기록을 유지한 채 여기에 모여요.'}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="classroom-list">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onChanged={focusList} />
            ))}
          </ul>
        )}
      </section>

      <CreateClassroomForm onCreated={setCreated} />
    </>
  );
}

/**
 * 막 만든 반 — 코드가 주인공이다. 목록이 다시 읽히기 전 한 박자를 이 배너가 잇고, 다시 읽힌 뒤에도 교사가 닫을 때까지
 * 남는다(카드로 눈을 옮기지 않고 여기서 바로 부르게). 다음 할 일(봇 붙이기)로 가는 길은 새 반의 「봇」 탭이다.
 */
function CreatedBanner({ created, onDismiss }: { created: CreatedClassroom; onDismiss: () => void }) {
  const life = joinCodeLife(created.joinCode.expiresAt);
  return (
    <AlertCard tone="info" icon={CheckCircle2} title={`「${created.name}」 반을 만들었어요`}>
      <div className="flex flex-wrap items-end justify-between gap-3" data-testid="classroom-created">
        <div>
          <p className="text-pullim-slate-500 text-2xs font-bold">첫 참여 코드</p>
          <p
            className="text-pullim-slate-900 mt-0.5 font-mono text-3xl font-bold tracking-widest"
            data-testid="classroom-created-code"
          >
            {formatJoinCode(created.joinCode.code)}
          </p>
          {life.state === 'open' && (
            <p className="text-pullim-slate-500 mt-1 text-2xs" data-testid="classroom-created-life">
              {life.label} 쓸 수 있어요
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={classTabHref(created.classId, 'bot')}
            data-testid="classroom-created-detail"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            봇 붙이러 가기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss} aria-label="배너 닫기">
            <X />
          </Button>
        </div>
      </div>
    </AlertCard>
  );
}

/**
 * 반 한 칸 — 반 정체(이름 · 과목·학년 · 봇) · 참여 코드 · 「자세히」.
 * 코드는 카드 안에서 제 상자를 갖는다. 다른 값과 같은 줄에 두면 그냥 또 하나의 값이 된다.
 */
function RoomCard({ room, onChanged }: { room: ClassDto; onChanged: (message: string) => void }) {
  return (
    <li className="bg-card rounded-2xl border p-5" data-testid={`classroom-card-${room.id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-pullim-slate-900 min-w-0 truncate text-sm font-bold">{room.name}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {!room.isActive && <Chip tone="neutral">보관됨</Chip>}
          <ClassActionsMenu
            classroom={room}
            onArchived={() => onChanged(`「${room.name}」 반을 보관했어요.`)}
            onDeleted={() => onChanged(`「${room.name}」 반을 영구 삭제했어요.`)}
            onRestored={() => onChanged(`「${room.name}」 반을 다시 열었어요.`)}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {room.subject && <Chip tone="info">{room.subject}</Chip>}
        {room.grade && <Chip tone="outline">{room.grade}</Chip>}
        <KnownBotChip known={room} data-testid={`classroom-bot-${room.id}`} />
      </div>

      {room.isActive ? (
        <div className="border-pullim-blue-200 bg-pullim-blue-50 mt-4 rounded-xl border p-4">
          <JoinCodeBlock classId={room.id} initial={room.joinCode} />
        </div>
      ) : (
        <p className="bg-pullim-slate-50 text-pullim-slate-600 mt-4 rounded-xl p-4 text-xs">
          새 참여·과제·대화가 멈췄어요. 기존 기록은 상세에서 볼 수 있어요.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Link
          href={classTabHref(room.id, 'members')}
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
