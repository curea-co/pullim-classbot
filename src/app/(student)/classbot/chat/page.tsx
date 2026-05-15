'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, Send, Shield, Eye, Sparkles } from 'lucide-react';
import {
  scopeMeta, currentPersona,
  pickClassbotReply, type ReplyKey,
  getMyBots, type ClassBot,
} from '@/lib/mock';
import { aiTierMeta } from '@/lib/tokens/tier';
import { cn } from '@/lib/utils';

type Turn = {
  id: string;
  role: 'student' | 'bot';
  text: string;
};

export default function ClassbotChatPage() {
  const myBots = useMemo(() => getMyBots().map(b => b.bot), []);
  const [selectedBotId, setSelectedBotId] = useState<string>(myBots[0]?.id ?? 'cb_001');
  const bot = myBots.find(b => b.id === selectedBotId) ?? myBots[0];

  return (
    <div className="space-y-3">
      {/* 봇 선택 chip strip */}
      {myBots.length > 1 && (
        <section className="bg-card rounded-xl border p-2">
          <ul className="flex gap-1.5 overflow-x-auto">
            {myBots.map(b => {
              const isActive = b.id === bot.id;
              return (
                <li key={b.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBotId(b.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors',
                      isActive
                        ? 'bg-pullim-blue-600 text-white'
                        : 'bg-pullim-slate-50 text-pullim-slate-700 hover:bg-pullim-slate-100',
                    )}
                  >
                    <span className="text-base leading-none">{b.avatarEmoji}</span>
                    <span>{b.name}</span>
                    {b.isLive && (
                      <span className="bg-pullim-danger inline-block h-1.5 w-1.5 rounded-full" aria-label="라이브" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 봇별 채팅 — key로 unmount/remount 시 state reset */}
      <ChatPanel key={bot.id} bot={bot} />
    </div>
  );
}

const STICKY_THRESHOLD = 80;
const TEXTAREA_MAX_PX = 96;

function ChatPanel({ bot }: { bot: ClassBot }) {
  const scope = scopeMeta[bot.scope];
  const tier = aiTierMeta.T2;

  const [turns, setTurns] = useState<Turn[]>(() => [
    { id: `t0_${bot.id}`, role: 'bot', text: bot.greeting },
  ]);
  const [pending, setPending] = useState(false);
  const [value, setValue] = useState('');
  const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickyRef = useRef<boolean>(true);

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isSticky = distanceFromBottom < STICKY_THRESHOLD;
    stickyRef.current = isSticky;
    if (isSticky) setShowNewMessageBanner(false);
  }

  useEffect(() => {
    if (stickyRef.current) {
      scrollToBottom('smooth');
    } else {
      setShowNewMessageBanner(true);
    }
  }, [turns, pending]);

  function send(text: string, forcedKey?: ReplyKey) {
    if (!text.trim() || pending) return;
    setTurns(t => [...t, { id: `s${Date.now()}`, role: 'student', text: text.trim() }]);
    setPending(true);

    const reply = pickClassbotReply(text, bot.tone, forcedKey);
    setTimeout(() => {
      setTurns(t => [...t, { id: `b${Date.now()}`, role: 'bot', text: reply }]);
      setPending(false);
    }, 900);
  }

  function submit() {
    if (!value.trim() || pending) return;
    send(value);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function handleTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    setValue(el.value);
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_PX)}px`;
  }

  const isSendDisabled = pending || !value.trim();

  return (
    <>
      <header className="from-pullim-slate-900 to-pullim-blue-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <Link
            href="/classbot"
            className="text-pullim-slate-400 hover:text-pullim-lemon mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="클래스봇 홈으로"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="bg-pullim-blue-500 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ring-2 ring-white/15">
            {bot.avatarEmoji}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-pullim-blue-200 text-[10px] font-bold tracking-wider uppercase">
              {bot.organization}
            </div>
            <h1 className="text-base font-bold tracking-tight">
              {bot.name} <span className="text-pullim-slate-400 text-xs font-normal">— {bot.teacherName}의 디지털 분신</span>
            </h1>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
              <span className="bg-white/10 rounded-full px-2 py-0.5 font-bold">
                {bot.subject} · {bot.grade}
              </span>
              <span className="bg-white/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold">
                <Shield className="text-pullim-lemon h-2.5 w-2.5" />
                <span className="font-mono">{scope.short}</span>
                <span className="text-white/80">{scope.label}</span>
              </span>
              <span
                className="rounded-sm px-1.5 py-0.5 font-mono font-bold"
                style={{ background: tier.bg, color: tier.color }}
              >
                {bot.tone} 톤 · T2
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
          <Eye className="text-pullim-lemon h-3 w-3" />
          <span className="text-white/90">
            <strong className="text-pullim-lemon">{bot.teacherName}</strong>이 이 대화를 실시간으로 볼 수 있어요. 시험 기간엔 자동 차단.
          </span>
        </div>
      </header>

      <section className="bg-card flex flex-col rounded-2xl border mt-3">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-slot="chat-scroll"
            className="flex max-h-[520px] min-h-[360px] flex-col gap-3 overflow-y-auto p-4"
          >
            {turns.map(t => <Bubble key={t.id} turn={t} bot={bot} />)}
            {pending && <PendingBubble bot={bot} />}
          </div>

          {showNewMessageBanner && (
            <button
              type="button"
              onClick={() => {
                scrollToBottom('smooth');
                setShowNewMessageBanner(false);
              }}
              aria-label="새 메시지로 이동"
              data-slot="new-message-banner"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg"
            >
              <span>새 메시지</span>
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="border-t p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {bot.quickPrompts.map(p => (
              <button
                key={p.text}
                type="button"
                onClick={() => send(p.text, p.expectedReplyKey)}
                disabled={pending}
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 disabled:opacity-50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              >
                {p.text}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              name="q"
              value={value}
              rows={1}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={`${bot.name}에게 물어보세요…`}
              style={{ maxHeight: `${TEXTAREA_MAX_PX}px` }}
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 flex-1 resize-none rounded-2xl border px-3.5 py-2 text-sm leading-relaxed outline-none"
            />
            <button
              type="submit"
              disabled={isSendDisabled}
              aria-label="질문 보내기"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <p className="text-pullim-slate-400 text-center text-[10px]">
            <Sparkles className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            Scope L{bot.scope}({scope.label}) — {scope.allow}
          </p>
        </div>
      </section>
    </>
  );
}

function Bubble({ turn, bot }: { turn: Turn; bot: ClassBot }) {
  const isStudent = turn.role === 'student';
  return (
    <div className={cn('flex gap-2', isStudent && 'flex-row-reverse')}>
      <div
        aria-hidden
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isStudent ? 'bg-pullim-slate-200 text-pullim-slate-700 text-xs font-bold' : 'bg-pullim-blue-600 text-base',
        )}
      >
        {isStudent ? currentPersona.name[0] : bot.avatarEmoji}
      </div>

      <div className={cn('max-w-[82%]', isStudent && 'flex flex-col items-end')}>
        {!isStudent && (
          <div className="text-pullim-blue-700 mb-1 text-[10px] font-bold">{bot.name}</div>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isStudent
              ? 'bg-pullim-blue-600 text-white rounded-tr-sm'
              : 'bg-pullim-slate-50 text-pullim-slate-800 rounded-tl-sm',
          )}
        >
          {turn.text}
        </div>
      </div>
    </div>
  );
}

function PendingBubble({ bot }: { bot: ClassBot }) {
  return (
    <div className="flex gap-2">
      <div className="bg-pullim-blue-600 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base">
        {bot.avatarEmoji}
      </div>
      <div>
        <div className="text-pullim-blue-700 mb-1 text-[10px] font-bold">{bot.name}</div>
        <div className="bg-pullim-slate-50 flex items-center gap-1 rounded-2xl rounded-tl-sm px-4 py-3">
          <span className="bg-pullim-slate-400 h-1.5 w-1.5 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
          <span className="bg-pullim-slate-400 h-1.5 w-1.5 animate-bounce rounded-full" style={{ animationDelay: '120ms' }} />
          <span className="bg-pullim-slate-400 h-1.5 w-1.5 animate-bounce rounded-full" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
}
