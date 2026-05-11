'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Shield, Eye, Sparkles } from 'lucide-react';
import {
  scopeMeta, currentPersona, classRoster,
  classbotChatGreeting, classbotQuickPrompts, pickClassbotReply,
  getMyBots, hasTodayCheckIn, type ClassBot,
} from '@/lib/mock';
import { aiTierMeta } from '@/lib/tokens/tier';
import { CheckInPrompt } from '@/components/classbot/check-in-prompt';
import { cn } from '@/lib/utils';

/** localStorage flag — 오늘자 키 (자정 넘으면 자동 갱신) */
function todayKey(): string {
  const d = new Date();
  return `checkin-skipped-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

type Turn = {
  id: string;
  role: 'student' | 'bot';
  text: string;
};

/** 봇별 첫 인사 — 정체성 차이를 한 줄로 보여줌 */
function greetingFor(bot: ClassBot): string {
  if (bot.id === 'cb_001') return classbotChatGreeting;
  if (bot.id === 'cb_002') {
    return '서연 안녕하세요. 영어 누나예요. 오늘 빈칸 추론 7유형 진행 중인데, 막힌 문장 있으면 가져와봐요. ' +
      'Scope L4라서 풀이 단계까지는 잡아줄 수 있어요.';
  }
  if (bot.id === 'cb_003') {
    return '서연. 과학 쌤이다. 학교 1학년 때 통합과학 진도 복습용으로 남겨놨어. ' +
      'Scope L3 — 개념 설명까진 해줄게. 답은 직접 풀어.';
  }
  return `안녕! ${bot.name}이에요. 무엇을 도와줄까요?`;
}

export default function ClassbotChatPage() {
  const myBots = useMemo(() => getMyBots().map(b => b.bot), []);
  const [selectedBotId, setSelectedBotId] = useState<string>(myBots[0]?.id ?? 'cb_001');
  const bot = myBots.find(b => b.id === selectedBotId) ?? myBots[0];

  // 체크인 인터셉트 — 오늘 체크인 미완료 + 스킵 flag 없으면 모달
  const [showCheckIn, setShowCheckIn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const me = classRoster.find(s => s.name === currentPersona.name);
    if (!me) return;
    const skipped = window.localStorage.getItem(todayKey()) === '1';
    if (skipped) return;
    if (!hasTodayCheckIn(me.id)) {
      setShowCheckIn(true);
    }
  }, []);

  function dismissCheckIn() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(todayKey(), '1');
    }
    setShowCheckIn(false);
  }

  return (
    <div className="space-y-3">
      {showCheckIn && <CheckInPrompt onSkip={dismissCheckIn} />}

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

function ChatPanel({ bot }: { bot: ClassBot }) {
  const scope = scopeMeta[bot.scope];
  const tier = aiTierMeta.T2;

  const [turns, setTurns] = useState<Turn[]>(() => [
    { id: `t0_${bot.id}`, role: 'bot', text: greetingFor(bot) },
  ]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  function send(text: string) {
    if (!text.trim() || pending) return;
    setTurns(t => [...t, { id: `s${Date.now()}`, role: 'student', text: text.trim() }]);
    setPending(true);

    const reply = pickClassbotReply(text);
    setTimeout(() => {
      setTurns(t => [...t, { id: `b${Date.now()}`, role: 'bot', text: reply }]);
      setPending(false);
    }, 900);
  }

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
        <div ref={scrollRef} className="flex max-h-[520px] min-h-[360px] flex-col gap-3 overflow-y-auto p-4">
          {turns.map(t => <Bubble key={t.id} turn={t} bot={bot} />)}
          {pending && <PendingBubble bot={bot} />}
        </div>

        <div className="border-t p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {classbotQuickPrompts.map(p => (
              <button
                key={p.text}
                type="button"
                onClick={() => send(p.text)}
                disabled={pending}
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 disabled:opacity-50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              >
                {p.text}
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
              send(input.value);
              input.value = '';
            }}
            className="flex items-center gap-2"
          >
            <input
              name="q"
              placeholder={`${bot.name}에게 물어보세요…`}
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 flex-1 rounded-full border px-3.5 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              aria-label="질문 보내기"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 flex h-9 w-9 items-center justify-center rounded-full text-white"
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
