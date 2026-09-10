'use client';

import type { ReactNode } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 대화 표시 프리미티브 — **한 벌의 대화 UI** 를 여러 대화 화면이 나눠 쓰기 위한 표현 계층.
 *
 * 출처: `app/(student)/classbot/chat/page.tsx` 안에만 있던 버블/구분선/입력줄 마크업을
 * 그대로 끌어올린 것이다. 클래스가 한 글자도 바뀌지 않았고, 챗 페이지는 이제 여기 것을
 * 가져다 쓴다 — 그래서 봇 대화(`/classbot/chat`)와 과제 대화
 * (`/classbot/assignment/[id]/chat`)의 말풍선이 서로 어긋날 수 없다.
 *
 * 여기 있는 것은 **표시뿐**이다. 턴 상태·전송·스트리밍·수업 흐름 같은 것은 각 화면이 들고 있고,
 * 이 모듈은 store 도 훅도 읽지 않는다(그래서 두 화면이 서로의 상태를 끌고 오지 않는다).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 3분 이내 같은 화자의 발화는 연속으로 본다(아바타·이름 생략). */
export const CHAT_CONTINUOUS_THRESHOLD_MS = 3 * 60 * 1000;

/** 대화 UI 가 봇에 대해 알아야 하는 전부 — `ClassBot` 전체를 요구하지 않는다. */
export interface ChatBotFace {
  name: string;
  avatarEmoji: string;
  /** 시그니처 컬러 hex — `botSignature(bot).hex`. */
  hex: string;
}

/** "오늘, 5월 18일" / "어제" / "2026년 5월 3일" */
export function formatChatDayLabel(ts: number): string {
  const date = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(date); day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / DAY_MS);
  if (diffDays === 0) return `오늘, ${date.getMonth() + 1}월 ${date.getDate()}일`;
  if (diffDays === 1) return '어제';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** "오후 4:05" */
export function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

export function ChatDateDivider({ ts }: { ts: number }) {
  return (
    <div className="text-pullim-slate-500 my-4 flex items-center justify-center gap-2 text-2xs font-semibold">
      <span className="bg-pullim-slate-100 h-px flex-1 max-w-[60px]" />
      <span>{formatChatDayLabel(ts)}</span>
      <span className="bg-pullim-slate-100 h-px flex-1 max-w-[60px]" />
    </div>
  );
}

/**
 * 말풍선 겉모양 — 봇은 옅은 회색 + 또렷한 보더 + 시그니처 좌측 라이너, 학생은 blue-600 채움.
 * 안쪽 여백은 호출부가 붙인다(카드형 본문이 자기 여백을 쓰기 때문).
 */
export function chatBubbleClass(isStudent: boolean): string {
  return cn(
    'rounded-2xl text-[17px] leading-relaxed',
    isStudent
      ? 'bg-pullim-blue-600 text-white rounded-tr-sm px-4 py-3 whitespace-pre-wrap'
      : 'bg-pullim-slate-50 border-pullim-slate-200 border border-l-[3px] text-pullim-slate-800 rounded-tl-sm',
  );
}

/** 봇이 쓰는 중 — 점 세 개. */
export function ChatTypingDots({ hex }: { hex: string }) {
  return (
    <div aria-hidden className="flex items-center gap-1">
      {[0, 220, 440].map(delay => (
        <span
          key={delay}
          className="pullim-anim-typing-dot h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: hex, animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * 말풍선 한 줄의 겉틀 — 아바타 · 이름 · 시각 · 좌우 정렬.
 * 본문(`children`)은 화면마다 다르므로 그대로 받는다.
 */
export function ChatBubbleFrame({
  isStudent,
  bot,
  meName,
  at,
  continuation = false,
  children,
}: {
  isStudent: boolean;
  bot: ChatBotFace;
  meName: string;
  at: number;
  continuation?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('pullim-anim-message-mount flex gap-2.5', isStudent && 'flex-row-reverse')}>
      {continuation ? (
        // 연속 발화 — 아바타 자리 들여쓰기만
        <span aria-hidden className="h-8 w-8 shrink-0" />
      ) : (
        <div
          aria-hidden
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            isStudent ? 'bg-pullim-slate-200 text-pullim-slate-700 text-sm font-bold' : 'text-lg',
          )}
          style={isStudent ? undefined : { backgroundColor: bot.hex }}
        >
          {isStudent ? (meName[0] ?? '나') : bot.avatarEmoji}
        </div>
      )}

      <div className={cn('max-w-[88%] sm:max-w-[80%]', isStudent && 'flex flex-col items-end')}>
        {!isStudent && !continuation && (
          <div className="text-pullim-slate-700 mb-1 flex items-baseline gap-1.5 text-sm font-bold">
            <span>{bot.name}</span>
            <span className="text-pullim-slate-400 font-normal">· {formatChatTime(at)}</span>
          </div>
        )}
        {children}
        {isStudent && (
          <div className="text-pullim-slate-400 mt-1 text-xs">{formatChatTime(at)}</div>
        )}
      </div>
    </div>
  );
}

/** 봇 응답 대기 버블 — M9 wave bar 1회 + 타이핑 점. */
export function ChatPendingBubble({ bot }: { bot: ChatBotFace }) {
  return (
    <div className="pullim-anim-message-mount flex gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: bot.hex }}
      >
        {bot.avatarEmoji}
      </div>
      <div>
        <div className="text-pullim-slate-700 mb-1 text-sm font-bold">{bot.name}</div>
        <div
          className="bg-card border-pullim-slate-100 relative overflow-hidden rounded-2xl rounded-tl-sm border border-l-[3px] px-4 py-3"
          style={{ borderLeftColor: bot.hex }}
        >
          {/* M9 응답 wave bar — 봇 응답 시작 직전 1회 ([08 § 12 M9]) */}
          <div
            aria-hidden
            className="pullim-anim-wave-bar absolute top-0 left-0 h-[3px] w-full"
            style={{ backgroundColor: bot.hex }}
          />
          <ChatTypingDots hex={bot.hex} />
        </div>
      </div>
    </div>
  );
}

/** 입력 줄 textarea 최대 높이(px). */
export const CHAT_TEXTAREA_MAX_PX = 96;

/**
 * 입력 줄 — textarea(자동 높이) + 보내기.
 * 첨부·음성 같은 화면별 진입점은 `leading` 으로 앞에 끼워 넣는다.
 */
export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  leading,
  textareaRef,
  onKeyDown,
  sendLabel = '질문 보내기',
}: {
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  disabled?: boolean;
  leading?: ReactNode;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  sendLabel?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-1.5">
      {leading}
      <textarea
        ref={textareaRef}
        name="q"
        value={value}
        rows={1}
        onChange={e => {
          // 입력 길이에 맞춰 높이를 늘린다(최대 CHAT_TEXTAREA_MAX_PX).
          const el = e.currentTarget;
          onValueChange(el.value);
          el.style.height = 'auto';
          el.style.height = `${Math.min(el.scrollHeight, CHAT_TEXTAREA_MAX_PX)}px`;
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{ maxHeight: `${CHAT_TEXTAREA_MAX_PX}px` }}
        className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 flex-1 resize-none rounded-2xl border px-3.5 py-2.5 text-base leading-relaxed outline-none"
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label={sendLabel}
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
