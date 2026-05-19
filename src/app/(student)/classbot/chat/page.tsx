'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ChevronDown, ChevronUp, Send, Shield, Eye } from 'lucide-react';
import {
  scopeMeta, currentPersona,
  pickClassbotReply, type ReplyKey,
  getMyBots, type ClassBot,
} from '@/lib/mock';
import { composeFirstGreeting } from '@/lib/mock/classbot-greeting';
import { getDynamicQuickReplies } from '@/lib/mock/classbot-dynamic-replies';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useVisualViewport } from '@/lib/hooks/use-visual-viewport';
import { LiveOverlay, LiveHeaderMeta } from '@/components/classbot/live-overlay';
import { ChatAttachSheet, ChatVoiceButton } from '@/components/classbot/chat-attach-sheet';
import { cn } from '@/lib/utils';

type Turn = {
  id: string;
  role: 'student' | 'bot';
  text: string;
  /** epoch ms — 메시지 그루핑/디바이더 계산용 ([04 § 9.8]) */
  at: number;
};

export default function ClassbotChatPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-500 text-sm">불러오는 중…</div>}>
      <ClassbotChatPageInner />
    </Suspense>
  );
}

function ClassbotChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const botParam = searchParams.get('bot');
  const myBots = useMemo(() => getMyBots().map(b => b.bot), []);
  const initialBotId = botParam && myBots.some(b => b.id === botParam) ? botParam : (myBots[0]?.id ?? 'cb_001');
  const [selectedBotId, setSelectedBotId] = useState<string>(initialBotId);
  const bot = myBots.find(b => b.id === selectedBotId) ?? myBots[0];
  const activeLive = useLiveStore(s => s.active);

  // ?bot= 쿼리와 selectedBotId 동기화 — 외부 링크가 봇 지정 시 반영
  useEffect(() => {
    if (botParam && botParam !== selectedBotId && myBots.some(b => b.id === botParam)) {
      setSelectedBotId(botParam);
    }
  }, [botParam, myBots, selectedBotId]);

  function handleBotChange(nextId: string) {
    setSelectedBotId(nextId);
    // URL 동기화 — 다른 탭에서 라이브 알림이 와도 정확한 봇이 보이도록
    router.replace(`/classbot/chat?bot=${nextId}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      {/* 봇 선택 chip strip */}
      {myBots.length > 1 && (
        <section className="bg-card rounded-xl border p-2">
          <ul className="flex gap-1.5 overflow-x-auto">
            {myBots.map(b => {
              const isActive = b.id === bot.id;
              const isLiveNow = Boolean(activeLive[b.id]);
              const sig = botSignature(b);
              // [04 § 9.4] 활성 봇은 시그니처 컬러 배경 + 흰 글자 (brand.600 단색 X)
              return (
                <li key={b.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleBotChange(b.id)}
                    aria-pressed={isActive}
                    style={isActive ? { backgroundColor: sig.hex, color: sig.kind === 'math' ? '#5C6B0A' : '#FFFFFF' } : undefined}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors',
                      !isActive && 'bg-pullim-slate-50 text-pullim-slate-700 hover:bg-pullim-slate-100',
                    )}
                  >
                    <span className="text-base leading-none">{b.avatarEmoji}</span>
                    <span>{b.name}</span>
                    {isLiveNow && (
                      <span className="bg-pullim-danger pullim-anim-live-pulse inline-block h-1.5 w-1.5 rounded-full" aria-label="라이브 진행 중" />
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
  const botSig = botSignature(bot);
  const isLive = useLiveStore(s => Boolean(s.active[bot.id]));
  const { keyboardOpen } = useVisualViewport();

  // [07 § 4.6.1·4.6.3] 첫 인사 = 시간대 prefix + 봇 시그니처 인사 (mount 시 1회만 계산)
  const [turns, setTurns] = useState<Turn[]>(() => [{
    id: `t0_${bot.id}`,
    role: 'bot',
    text: composeFirstGreeting(bot.greeting, currentPersona.name, bot.tone),
    at: Date.now(),
  }]);
  const [pending, setPending] = useState(false);
  const [value, setValue] = useState('');
  const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  // [04 § 9.6] 직전 봇 발화 ReplyKey — 동적 빠른칩 추천에 사용
  const [lastBotReplyKey, setLastBotReplyKey] = useState<ReplyKey | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickyRef = useRef<boolean>(true);

  // [04 § 9.5] 모바일 키보드 열림 시 봇 메타카드 자동 collapse
  useEffect(() => {
    if (keyboardOpen) setHeaderCollapsed(true);
  }, [keyboardOpen]);

  // [04 § 9.6] 동적 빠른 칩 — turns·lastBotReplyKey·시간대 기반
  const dynamicQuickReplies = useMemo(
    () => getDynamicQuickReplies({ bot, turnCount: turns.length, lastBotReplyKey }),
    [bot, turns.length, lastBotReplyKey],
  );

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
    const now = Date.now();
    setTurns(t => [...t, { id: `s${now}`, role: 'student', text: text.trim(), at: now }]);
    setPending(true);

    const reply = pickClassbotReply(text, bot.tone, forcedKey);
    setTimeout(() => {
      const at = Date.now();
      setTurns(t => [...t, { id: `b${at}`, role: 'bot', text: reply, at }]);
      // [04 § 9.6] forcedKey가 있을 때만 후속 칩 추천 가능 (free text는 키 미지정)
      setLastBotReplyKey(forcedKey);
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
      {/*
        봇 메타 헤더 — collapse 토글 ([04 § 9.3], [08 § 15.5]).
        collapsed: 56px 정도, 아바타 + 이름 + 범위 라벨 + ⌃
        expanded: 모든 메타 (조직·교사·톤·시청·범위 시간표·라이브 안내)
        키보드 열림 시 자동 collapse (위 useEffect), 명시 토글로 expand.
      */}
      <header
        data-slot="bot-meta-header"
        data-collapsed={headerCollapsed ? 'true' : 'false'}
        className="from-pullim-slate-900 to-pullim-blue-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-xl"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/classbot"
            className="text-pullim-slate-400 hover:text-pullim-lemon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="클래스봇 홈으로"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl ring-2 ring-white/15 transition-all',
              headerCollapsed ? 'h-8 w-8 text-lg' : 'h-12 w-12 text-2xl',
            )}
            style={{ backgroundColor: botSig.hex }}
          >
            {bot.avatarEmoji}
          </div>

          <div className="min-w-0 flex-1">
            {!headerCollapsed && (
              <div className="text-pullim-blue-200 text-[10px] font-bold tracking-wider uppercase">
                {bot.organization}
              </div>
            )}
            <h1 className="text-sm font-bold tracking-tight truncate">
              {bot.name}
              {!headerCollapsed && (
                <span className="text-pullim-slate-400 text-xs font-normal"> — {bot.teacherName}의 디지털 분신</span>
              )}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
              {!headerCollapsed && (
                <span className="bg-white/10 rounded-full px-2 py-0.5 font-bold">
                  {bot.subject} · {bot.grade}
                </span>
              )}
              {/* 범위 라벨 — 한글 우선, 코드는 괄호 ([07 § 5.3]) */}
              <span className="bg-white/10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold">
                <Shield className="text-pullim-lemon h-2.5 w-2.5" />
                <span className="text-white/95">{scope.label}</span>
                <span className="text-white/55 font-mono text-[9px]">({scope.short})</span>
              </span>
              {!headerCollapsed && (
                <span className="bg-pullim-lemon/15 text-pullim-lemon border-pullim-lemon/30 rounded-full border px-2 py-0.5 font-bold">
                  {bot.tone} 톤
                </span>
              )}
            </div>
            {!headerCollapsed && <LiveHeaderMeta bot={bot} />}
          </div>

          <button
            type="button"
            onClick={() => setHeaderCollapsed(c => !c)}
            aria-label={headerCollapsed ? '봇 정보 펼치기' : '봇 정보 접기'}
            aria-expanded={!headerCollapsed}
            className="text-pullim-slate-300 hover:bg-white/10 hover:text-white inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          >
            {headerCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {!headerCollapsed && (
          <>
            <div className="bg-white/10 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
              <Eye className="text-pullim-lemon h-3 w-3" />
              <span className="text-white/90">
                <strong className="text-pullim-lemon">{bot.teacherName}</strong>이 이 대화를 실시간으로 볼 수 있어요. 시험 기간엔 자동 차단.
              </span>
            </div>

            {/* 현재 범위 + 시간대별 자동 스위치 안내 — 라이브 중엔 잠금 안내로 대체 */}
            {!isLive && (
              <details className="bg-pullim-blue-700/30 mt-2 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
                <summary className="cursor-pointer list-none flex items-center gap-1.5">
                  <span className="bg-pullim-lemon text-pullim-lemon-ink rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {scope.label}
                  </span>
                  <span className="text-white/90 font-semibold">지금 봇 범위 — {scope.allow}</span>
                  <span className="text-white/60 ml-auto text-[10px]">시간대별 자동 변동 ↗</span>
                </summary>
                <div className="text-white/80 mt-2 space-y-0.5 leading-relaxed">
                  <p>· 18:00~19:00 · 단계 힌트까지 <span className="font-mono text-[10px] text-white/55">(L4)</span></p>
                  <p>· 19:00~22:00 · 개념까지 <span className="font-mono text-[10px] text-white/55">(L3)</span> ← 현재 학원 시간</p>
                  <p>· 22:00 이후 · 답까지 <span className="font-mono text-[10px] text-white/55">(L5)</span> 자기학습</p>
                </div>
              </details>
            )}
            {isLive && (
              <div className="bg-pullim-lemon/15 border-pullim-lemon/40 mt-2 rounded-lg border px-3 py-1.5 text-[11px]">
                <span className="text-pullim-lemon font-bold">🔒 라이브 정책 적용 중</span>
                <span className="text-white/80 ml-1">— {scope.label} <span className="font-mono text-[10px] text-white/55">({scope.short})</span>으로 자동 잠금. 종료 후 평시 정책 복귀.</span>
              </div>
            )}
          </>
        )}
      </header>

      {/* 라이브 진행 중인 봇이면 chat 위에 라이브 오버레이 — 슬라이드 · 자막 · 퀴즈 · 질문 큐 */}
      {isLive && (
        <div className="mt-3">
          <LiveOverlay bot={bot} />
        </div>
      )}

      <section className="bg-card flex flex-col rounded-2xl border mt-3">
        <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2 text-[11px]">
          <span className="text-pullim-slate-700 font-bold">봇과 대화</span>
          {isLive && (
            <span className="text-pullim-slate-400 ml-auto">
              개념 질문은 여기서 — 라이브 모더레이션 큐는 위쪽 "선생님에게 질문"
            </span>
          )}
        </header>
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-slot="chat-scroll"
            className="flex max-h-[520px] min-h-[360px] flex-col gap-3 overflow-y-auto p-4"
          >
            {turns.map((t, i) => (
              <RenderTurn key={t.id} turn={t} bot={bot} prev={turns[i - 1]} />
            ))}
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

        {/*
          입력 영역 — 모바일 키보드 열림 시 sticky로 viewport 키보드 위에 고정 ([04 § 9.5]).
          --keyboard-offset CSS 변수는 useVisualViewport hook이 동적으로 갱신.
          빠른 칩은 동적 추천 ([04 § 9.6]), 첨부/음성 진입점 ([04 § 9.7]).
        */}
        <div
          data-slot="chat-input-area"
          className="bg-card sticky border-t p-3 space-y-2 z-10"
          style={{ bottom: 'var(--keyboard-offset, 0px)' }}
        >
          {/* 동적 빠른 칩 — M7 stagger (60ms 시차) */}
          <div className="flex flex-wrap gap-1.5">
            {dynamicQuickReplies.map((p, i) => (
              <button
                key={p.text}
                type="button"
                onClick={() => send(p.text, p.expectedReplyKey)}
                disabled={pending}
                style={{
                  borderLeftColor: botSig.hex,
                  animationDelay: `${i * 60}ms`,
                }}
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 pullim-anim-message-mount border-l-2 disabled:opacity-50 inline-flex items-center gap-1 rounded-r-full rounded-l px-2.5 py-1 text-[11px] font-semibold transition-colors"
              >
                {p.text}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
            <ChatAttachSheet botName={bot.name} />
            <ChatVoiceButton onNotify={msg => {
              setNotice(msg);
              setTimeout(() => setNotice(null), 3000);
            }} />
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
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {notice && (
            <p role="status" className="text-pullim-slate-500 text-center text-[11px]">{notice}</p>
          )}
        </div>
      </section>
    </>
  );
}

/* ─── 메시지 렌더 + 그루핑 디바이더 ([04 § 9.8]) ─── */

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTINUOUS_THRESHOLD_MS = 3 * 60 * 1000; // 3분 이내 같은 봇이면 연속 발화

function formatDayLabel(ts: number): string {
  const date = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(date); day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / DAY_MS);
  if (diffDays === 0) return `오늘, ${date.getMonth() + 1}월 ${date.getDate()}일`;
  if (diffDays === 1) return '어제';
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

function DateDivider({ ts }: { ts: number }) {
  return (
    <div className="text-pullim-slate-500 my-4 flex items-center justify-center gap-2 text-[11px] font-semibold">
      <span className="bg-pullim-slate-100 h-px flex-1 max-w-[60px]" />
      <span>{formatDayLabel(ts)}</span>
      <span className="bg-pullim-slate-100 h-px flex-1 max-w-[60px]" />
    </div>
  );
}

function RenderTurn({ turn, bot, prev }: { turn: Turn; bot: ClassBot; prev: Turn | undefined }) {
  // 일자가 바뀌면 디바이더 노출 (첫 메시지도 포함)
  const showDivider = !prev
    || new Date(prev.at).toDateString() !== new Date(turn.at).toDateString();
  // 같은 봇 3분 이내 연속 발화면 아바타·이름 생략 + 들여쓰기
  const isContinuation =
    !!prev
    && prev.role === turn.role
    && turn.role === 'bot'
    && turn.at - prev.at <= CONTINUOUS_THRESHOLD_MS;

  return (
    <>
      {showDivider && <DateDivider ts={turn.at} />}
      <Bubble turn={turn} bot={bot} continuation={isContinuation} />
    </>
  );
}

function Bubble({ turn, bot, continuation = false }: { turn: Turn; bot: ClassBot; continuation?: boolean }) {
  const isStudent = turn.role === 'student';
  const botSig = botSignature(bot);
  return (
    <div className={cn('pullim-anim-message-mount flex gap-2', isStudent && 'flex-row-reverse')}>
      {continuation ? (
        // 연속 발화 — 아바타 자리 들여쓰기만 (32px 가량)
        <span aria-hidden className="h-7 w-7 shrink-0" />
      ) : (
        <div
          aria-hidden
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            isStudent ? 'bg-pullim-slate-200 text-pullim-slate-700 text-xs font-bold' : 'text-base',
          )}
          style={isStudent ? undefined : { backgroundColor: botSig.hex }}
        >
          {isStudent ? currentPersona.name[0] : bot.avatarEmoji}
        </div>
      )}

      <div className={cn('max-w-[82%]', isStudent && 'flex flex-col items-end')}>
        {!isStudent && !continuation && (
          <div className="text-pullim-slate-700 mb-1 flex items-baseline gap-1.5 text-[10px] font-bold">
            <span>{bot.name}</span>
            <span className="text-pullim-slate-400 font-normal">· {formatTime(turn.at)}</span>
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isStudent
              ? 'bg-pullim-blue-600 text-white rounded-tr-sm'
              : 'bg-card border-pullim-slate-100 border border-l-[3px] text-pullim-slate-800 rounded-tl-sm',
          )}
          style={isStudent ? undefined : { borderLeftColor: botSig.hex }}
        >
          {turn.text}
        </div>
        {isStudent && (
          <div className="text-pullim-slate-400 mt-1 text-[10px]">{formatTime(turn.at)}</div>
        )}
      </div>
    </div>
  );
}

function PendingBubble({ bot }: { bot: ClassBot }) {
  const botSig = botSignature(bot);
  return (
    <div className="pullim-anim-message-mount flex gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: botSig.hex }}
      >
        {bot.avatarEmoji}
      </div>
      <div>
        <div className="text-pullim-slate-700 mb-1 text-[10px] font-bold">{bot.name}</div>
        <div
          className="bg-card border-pullim-slate-100 flex items-center gap-1 rounded-2xl rounded-tl-sm border border-l-[3px] px-4 py-3"
          style={{ borderLeftColor: botSig.hex }}
        >
          <span
            className="pullim-anim-typing-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: botSig.hex, animationDelay: '0ms' }}
          />
          <span
            className="pullim-anim-typing-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: botSig.hex, animationDelay: '220ms' }}
          />
          <span
            className="pullim-anim-typing-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: botSig.hex, animationDelay: '440ms' }}
          />
        </div>
      </div>
    </div>
  );
}
