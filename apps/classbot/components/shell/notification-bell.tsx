'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import {
  markReadFailureMessage,
  useMarkAllInterventionsRead,
  useMarkInterventionRead,
  useMyInterventions,
  type InterventionInbox,
} from '@/hooks/api/intervention';
import type { InterventionDto } from '@/lib/api/classbot-dto';
import { interventionHref, interventionMeta } from '@/lib/interventions';
import { cn } from '@/lib/utils';

/**
 * 헤더 벨 알림 인박스 — 교사 개입(리마인드·한마디·복습 과제·응원)의 **학생 수신함**.
 *
 * 인박스는 **정본**이다 — `GET /classbot/interventions?audience=student`(`useMyInterventions` · 계획 PR 5c).
 * 서버가 `student_id==sub` 로만 고르므로 이 컴포넌트는 학생 id 를 들지 않는다. 종전에는 로컬 스토어
 * (`lib/store/interventions.ts` · `pullim-interventions` persist)를 읽었고, 그래서 **교사가 쓴 브라우저에서만**
 * 알림이 보였다 — 그 스토어는 이 PR 이 걷었다.
 *
 * 되읽기는 둘이다 — **창으로 돌아올 때**와 **60초마다**(`INBOX_POLL_MS`). 소켓은 없다(이 문에 스트림이 없다).
 * 훅은 **벨에서 한 번만** 부르고 아래로 내린다 — `refetchInterval` 은 옵저버마다 타이머를 세워서, 벨·인박스·목록이
 * 각자 부르면 드롭다운이 열려 있는 동안 60초에 요청이 여러 번 난다.
 *
 * **비로그인은 기다림이 아니다.** `/classbot/onboarding` 은 공개 경로라 로그인 없이도 학생 셸이 서고 이 벨이
 * 걸린다(prod-verify 익명 레인이 그 길을 걷는다). 그때 쿼리는 `enabled:false` 라 v5 에서 영영 `isPending` 이므로,
 * 훅이 갈라 준 `isSignedOut` 을 **기다림보다 먼저** 본다(`hooks/api/intervention.ts` `InterventionInbox`).
 *
 * 배지는 숫자 + `aria-label` 이다(색 단독 신호 금지). 스토어가 아니라 서버를 읽으므로 hydration 게이트는 없다 —
 * 첫 렌더에는 아직 답이 없어 배지가 없고, 답이 오면 선다.
 *
 * `crisis` 는 **교사가 내지 않는다** — 위험 신호에서 서버가 자동으로 만든다(`proc/spec/05 § 3`). 그래도 여기서
 * 그리는 이유는 학생이 그것을 **받기** 때문이고, 학생이 읽는 글자는 진단이 아니라 「선생님 응원」이다
 * (`lib/interventions.ts` `TYPE_META`).
 */

/**
 * 인박스 — 벨 드롭다운의 알맹이(머리줄 + 목록). 항목을 누르면 읽음으로 바꾸고 딥링크로 간다.
 *
 * 벨과 따로 세워 두는 이유 둘: 드롭다운이 닫혀 있는 동안 목록을 그리지 않아도 되고, 「모두 읽음」이 목록과 한 자리에
 * 있어야 눌린 결과가 바로 보인다. 기다림·오류·빈 상태는 각각 다른 말을 한다.
 */
export function NotificationInbox({ inbox }: { inbox: InterventionInbox }) {
  const markAllRead = useMarkAllInterventionsRead();

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-2.5 pt-1 pb-1.5">
        <p className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">알림</p>
        {inbox.unread > 0 && (
          <button
            type="button"
            data-testid="inbox-read-all"
            onClick={() =>
              markAllRead.mutate(undefined, {
                onError: (error) => toast(markReadFailureMessage(error)),
              })
            }
            disabled={markAllRead.isPending}
            className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400 text-2xs inline-flex min-h-6 items-center gap-1 rounded-md px-1 font-bold outline-none focus-visible:ring-2 disabled:opacity-50"
          >
            <CheckCheck className="h-3 w-3" aria-hidden />
            모두 읽음
          </button>
        )}
      </div>
      <InboxList inbox={inbox} />
    </>
  );
}

/**
 * 목록 그 자체 — 비로그인·기다림·오류·빈 상태·줄들.
 *
 * **비로그인을 기다림보다 먼저 본다.** 비활성 쿼리는 영영 「읽는 중」이라 순서가 뒤집히면 익명 방문자가
 * 스피너에 갇힌다(파일 머리주석). 401 도 같은 갈래로 온다 — 그때는 이미 로그인으로 가는 중이다.
 */
function InboxList({ inbox }: { inbox: InterventionInbox }) {
  const markRead = useMarkInterventionRead();

  if (inbox.isSignedOut) {
    return (
      <p data-testid="inbox-signed-out" className="text-pullim-slate-500 px-3 py-6 text-center text-xs">
        로그인하면 알림을 볼 수 있어요
      </p>
    );
  }

  if (inbox.isLoading) {
    return (
      <p data-testid="inbox-loading" className="text-pullim-slate-400 px-3 py-6 text-center text-xs">
        알림을 불러오는 중이에요…
      </p>
    );
  }

  if (inbox.isError) {
    return (
      <p role="alert" data-testid="inbox-error" className="text-pullim-slate-500 px-3 py-6 text-center text-xs">
        알림을 불러오지 못했어요
      </p>
    );
  }

  if (inbox.items.length === 0) {
    return <p className="text-pullim-slate-400 px-3 py-6 text-center text-xs">새 알림이 없어요</p>;
  }

  return (
    <ul className="max-h-80 overflow-y-auto" data-testid="inbox-list">
      {inbox.items.map((item) => (
        <InboxRow
          key={item.id}
          item={item}
          onOpen={() => {
            if (item.readAt !== null) return;
            markRead.mutate(item.id, {
              onError: (error) => toast(markReadFailureMessage(error)),
            });
          }}
        />
      ))}
    </ul>
  );
}

/** 인박스 한 줄 — 유형 이름 · 문구 · 딥링크. 안 읽은 줄은 글자 굵기와 낭독기 글로 함께 말한다. */
function InboxRow({ item, onOpen }: { item: InterventionDto; onOpen: () => void }) {
  const { icon: Icon, label } = interventionMeta(item.type);
  const unread = item.readAt === null;
  return (
    <li>
      <Link
        href={interventionHref(item)}
        onClick={onOpen}
        data-testid={`inbox-item-${item.id}`}
        className="hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400 flex min-h-11 items-start gap-2.5 rounded-lg px-2.5 py-2 outline-none focus-visible:ring-2"
      >
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            unread ? 'bg-pullim-blue-100 text-pullim-blue-600' : 'bg-pullim-slate-100 text-pullim-slate-400',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'text-2xs block font-bold tracking-wider uppercase',
              unread ? 'text-pullim-blue-600' : 'text-pullim-slate-400',
            )}
          >
            {label}
            {unread && <span className="sr-only"> — 읽지 않음</span>}
          </span>
          <span
            className={cn(
              'block text-xs leading-relaxed',
              unread ? 'text-pullim-slate-900 font-semibold' : 'text-pullim-slate-500',
            )}
          >
            {item.message}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** 헤더 벨 — 미읽음 배지 + 드롭다운 인박스(학생 전용 · `app-header.tsx` 가 역할로 가른다). */
export function NotificationBell() {
  // 이 앱에서 인박스 타이머를 거는 **유일한** 자리다(파일 머리주석 · `useMyInterventions` 의 `poll`).
  const inbox = useMyInterventions({ poll: true });
  const unread = inbox.unread;
  const showBadge = unread > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={showBadge ? `알림 — 읽지 않은 알림 ${unread}개` : '알림'}
        className="text-pullim-slate-500 hover:bg-pullim-slate-100 focus-visible:ring-pullim-blue-300 relative inline-flex h-11 w-11 items-center justify-center rounded-xl outline-none focus-visible:ring-2"
      >
        <Bell className="h-[22px] w-[22px]" />
        {showBadge && (
          <span
            aria-hidden
            className="bg-pullim-blue-600 text-micro absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      {/*
        머리줄을 `DropdownMenuLabel`(base-ui `MenuGroupLabel`) 로 두지 않는다 — 그건 `Menu.Group` 안에서만 서고,
        그러면 인박스를 드롭다운 밖에서 홀로 세울 수 없다(테스트가 목록을 곧장 그린다). 이름은 팝업에 직접 단다.
      */}
      <DropdownMenuContent align="end" aria-label="알림" className="w-80 p-1.5">
        <NotificationInbox inbox={inbox} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
