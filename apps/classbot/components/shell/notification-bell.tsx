'use client';

import Link from 'next/link';
import { Bell, ClipboardList, MessageCircle, RotateCcw, Heart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  useMyInterventions, useUnreadCount, useInterventionStore, useInterventionRecipientId,
  type InterventionEvent, type InterventionType,
} from '@/lib/store/interventions';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { cn } from '@/lib/utils';

/**
 * 헤더 벨 알림 인박스 — 교사 개입(리마인드·코멘트·재발사·응원)의 학생 수신함.
 * spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §5.
 * 배지는 숫자+aria-label(색 단독 신호 금지), persist 스토어라 hydration 후에만 배지 렌더.
 */

const TYPE_META: Record<InterventionType, { icon: LucideIcon; label: string }> = {
  remind: { icon: ClipboardList, label: '과제 리마인드' },
  comment: { icon: MessageCircle, label: '선생님 한마디' },
  requiz: { icon: RotateCcw, label: '복습 과제' },
  crisis: { icon: Heart, label: '선생님 응원' },
};

/** 이벤트 → 딥링크. remind/requiz→과제, comment→결과, crisis→챗. */
function hrefFor(e: InterventionEvent): string {
  if (e.type === 'comment' && e.assignmentId) return `/classbot/assignment/${e.assignmentId}/result`;
  if ((e.type === 'remind' || e.type === 'requiz') && e.assignmentId) {
    return `/classbot/assignment/${e.assignmentId}`;
  }
  // crisis — 해당 봇의 챗으로 정규화(chat 페이지 ?bot= 규약, Codex #187 R2)
  return `/classbot/chat?bot=${e.botId}`;
}

/** 인박스 목록 — 벨 드롭다운 내부. 항목 클릭 시 읽음 처리 후 딥링크 이동. */
export function NotificationInbox({ studentId }: { studentId: string }) {
  const items = useMyInterventions(studentId);
  const markRead = useInterventionStore((s) => s.markRead);

  if (items.length === 0) {
    return (
      <p className="text-pullim-slate-400 px-3 py-6 text-center text-xs">새 알림이 없어요</p>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto">
      {items.map((e) => {
        const { icon: Icon, label } = TYPE_META[e.type];
        const unread = e.readAt === null;
        return (
          <li key={e.id}>
            <Link
              href={hrefFor(e)}
              onClick={() => markRead(e.id)}
              className="hover:bg-pullim-slate-50 flex min-h-11 items-start gap-2.5 rounded-lg px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400"
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
                    'block text-2xs font-bold uppercase tracking-wider',
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
                  {e.message}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** 헤더 벨 — 미읽음 배지 + 드롭다운 인박스 (학생 전용). 수신자 = 데모는 roster 폴백, 인증은 본인 id. */
export function NotificationBell() {
  const recipientId = useInterventionRecipientId();
  const hydrated = useStoresHydrated(useInterventionStore);
  const unread = useUnreadCount(recipientId);
  const showBadge = hydrated && unread > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={showBadge ? `알림 — 읽지 않은 알림 ${unread}개` : '알림'}
        className="text-pullim-slate-500 hover:bg-pullim-slate-100 relative inline-flex h-11 w-11 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
      >
        <Bell className="h-[22px] w-[22px]" />
        {showBadge && (
          <span
            aria-hidden
            className="bg-pullim-blue-600 absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-1.5">
        {/* Base UI: MenuGroupLabel 은 Menu.Group 내부에서만 렌더 가능 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-pullim-slate-500 px-2.5 pt-1 pb-1.5 text-2xs font-bold uppercase tracking-wider">
            알림
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <NotificationInbox studentId={recipientId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
