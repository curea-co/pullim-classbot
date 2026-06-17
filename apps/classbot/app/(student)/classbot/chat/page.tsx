'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ChevronDown, ChevronUp, Send, Shield, Eye } from 'lucide-react';
import {
  scopeMeta,
  pickClassbotReply, type ReplyKey,
  getMyBots, type ClassBot,
} from '@/lib/mock';
import { useCurrentUser } from '@/lib/current-user';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';
import { composeFirstGreeting } from '@/lib/mock/classbot-greeting';
import { getDynamicQuickReplies } from '@/lib/mock/classbot-dynamic-replies';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useVisualViewport } from '@/lib/hooks/use-visual-viewport';
import { LiveOverlay, LiveHeaderMeta } from '@/components/classbot/live-overlay';
import { ChatAttachSheet, ChatVoiceButton } from '@/components/classbot/chat-attach-sheet';
import { LiveBadge } from '@/components/classbot/live-badge';
import { cn } from '@/lib/utils';

/**
 * 메시지 타입 6종 카탈로그 ([04 § 9.8], [08 § 15.1.3]).
 * - text: 기본 버블
 * - problem-card: 라임 좌측 라이너 + 문제번호 + "풀러 가기" CTA (과제·퀴즈 인라인)
 * - explain-step: 1️⃣2️⃣3️⃣ 단계 indent + 수식 mono (단계별 풀이)
 * - reference-link / image / audio: 스캐폴드 — v2에서 본격 구현
 */
type MessageKind = 'text' | 'problem-card' | 'explain-step' | 'reference-link' | 'image' | 'audio';

type Turn = {
  id: string;
  role: 'student' | 'bot';
  text: string;
  /** epoch ms — 메시지 그루핑/디바이더 계산용 ([04 § 9.8]) */
  at: number;
  /** 메시지 타입 (기본 text) */
  kind?: MessageKind;
  /** 타입별 payload */
  payload?: ProblemCardPayload | ExplainStepPayload | ReferenceLinkPayload | ImagePayload | AudioPayload;
};

type ProblemCardPayload = {
  problemNumber: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
};

type ExplainStepPayload = {
  steps: { num: number; label: string; body: string; formula?: string }[];
};

type ReferenceLinkPayload = {
  domain: string;
  title: string;
  summary: string;
  thumbUrl?: string;
};

type ImagePayload = {
  url: string;
  alt: string;
};

type AudioPayload = {
  url: string;
  durationSec: number;
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
    <div className="flex h-full min-h-0 flex-col gap-3">
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
                      <LiveBadge variant="dot" aria-label="라이브 진행 중" />
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
  const me = useCurrentUser();

  // [07 § 4.6.1·4.6.3] 첫 인사 = 시간대 prefix + 봇 시그니처 인사 (mount 시 1회만 계산)
  const [turns, setTurns] = useState<Turn[]>(() => [{
    id: `t0_${bot.id}`,
    role: 'bot',
    text: composeFirstGreeting(bot.greeting, me.name, bot.tone),
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

    // 로그인 세션이면 본인 명의로 메시지를 영속화한다(plan Phase 3 쓰기 thin-slice).
    // 데모(비로그인)는 mock 대화만 — 서버가 401 로 거른다.
    if (me.isAuthenticated) {
      void persistChatMessage(bot.id, text.trim());
    }

    const reply = pickClassbotReply(text, bot.tone, forcedKey);
    setTimeout(() => {
      const at = Date.now();
      // [08 § 15.1.3] 시연용 메시지 타입 mapping — forcedKey 기반
      const richTurn = buildRichBotTurn(`b${at}`, reply, at, forcedKey, bot.id);
      setTurns(t => [...t, richTurn]);
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
        ChatPanel은 key={bot.id}로 봇 전환 시 remount — M6 cross-fade ([08 § 15.2]).
      */}
      <header
        data-slot="bot-meta-header"
        data-collapsed={headerCollapsed ? 'true' : 'false'}
        className="from-pullim-slate-900 to-pullim-blue-900 pullim-anim-bot-switch relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-xl"
      >
        {/* M6 시그니처 라이너 swipe — 봇 전환 시 좌→우 240ms */}
        <span
          aria-hidden
          className="pullim-anim-liner-swipe absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: botSig.hex }}
        />
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
              'pullim-anim-bot-breath pullim-anim-bot-blink flex shrink-0 items-center justify-center rounded-2xl ring-2 ring-white/15 transition-all',
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

      <section className="bg-card flex flex-col rounded-2xl border flex-1 min-h-0">
        <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2 text-[11px]">
          <span className="text-pullim-slate-700 font-bold">봇과 대화</span>
          {isLive && (
            <span className="text-pullim-slate-400 ml-auto">
              개념 질문은 여기서 — 라이브 모더레이션 큐는 위쪽 “선생님에게 질문”
            </span>
          )}
        </header>
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-slot="chat-scroll"
            className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto p-4"
          >
            {turns.map((t, i) => (
              <RenderTurn key={t.id} turn={t} bot={bot} prev={turns[i - 1]} meName={me.name} />
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

/* ─── 채팅 영속화 (plan Phase 3 쓰기 thin-slice) ─── */

/**
 * 학생 메시지를 본인 명의로 서버에 저장한다(fire-and-forget).
 * 명의는 서버가 JWT claim 에서 결정 — 클라이언트는 botId/text 만 보낸다.
 * @param botId - 대상 봇 id
 * @param text - 메시지 본문
 */
async function persistChatMessage(botId: string, text: string): Promise<void> {
  try {
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ botId, text }),
    });
  } catch {
    // 영속화 실패는 데모 대화를 막지 않는다(조용히 무시).
  }
}

/* ─── 메시지 타입 dispatch ([08 § 15.1.3] 6종 카탈로그) ─── */

function buildRichBotTurn(id: string, text: string, at: number, forcedKey: ReplyKey | undefined, botId: string): Turn {
  // 시연용 — forcedKey 기반으로 다른 타입 매핑. v2에서 LLM tool-calling으로 대체.
  if (forcedKey === 'extremum') {
    return {
      id, role: 'bot', at, text,
      kind: 'explain-step',
      payload: {
        steps: [
          { num: 1, label: '도함수 계산', body: '먼저 f(x)를 미분해서 도함수를 구해.', formula: "f'(x) = …" },
          { num: 2, label: '임계점 탐색', body: "f'(x) = 0 인 x를 찾아 — 그게 극값 후보야." },
          { num: 3, label: '부호 변화 표', body: '+ → − 면 극대, − → + 면 극소. 부호 안 바뀌면 극값 X.' },
        ],
      } satisfies ExplainStepPayload,
    };
  }
  if (forcedKey === 'exam_prep') {
    return {
      id, role: 'bot', at, text,
      kind: 'problem-card',
      payload: {
        problemNumber: 'Q-12',
        title: '극값 판정 — 부호 변화 표 5문항',
        ctaLabel: '풀러 가기',
        ctaHref: `/classbot/assignment/as_prescription/solve?bot=${botId}`,
      } satisfies ProblemCardPayload,
    };
  }
  // 기본 — text 버블
  return { id, role: 'bot', at, text, kind: 'text' };
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

function RenderTurn({ turn, bot, prev, meName }: { turn: Turn; bot: ClassBot; prev: Turn | undefined; meName: string }) {
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
      <Bubble turn={turn} bot={bot} continuation={isContinuation} meName={meName} />
    </>
  );
}

function Bubble({ turn, bot, continuation = false, meName }: { turn: Turn; bot: ClassBot; continuation?: boolean; meName: string }) {
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
          {isStudent ? (meName[0] ?? '나') : bot.avatarEmoji}
        </div>
      )}

      <div className={cn('max-w-[82%]', isStudent && 'flex flex-col items-end')}>
        {!isStudent && !continuation && (
          <div className="text-pullim-slate-700 mb-1 flex items-baseline gap-1.5 text-[10px] font-bold">
            <span>{bot.name}</span>
            <span className="text-pullim-slate-400 font-normal">· {formatTime(turn.at)}</span>
          </div>
        )}
        <MessageBody turn={turn} isStudent={isStudent} botLinerHex={botSig.hex} />
        {isStudent && (
          <div className="text-pullim-slate-400 mt-1 text-[10px]">{formatTime(turn.at)}</div>
        )}
      </div>
    </div>
  );
}

/* ─── 메시지 본문 6종 dispatch ([08 § 15.1.3]) ─── */
function MessageBody({ turn, isStudent, botLinerHex }: { turn: Turn; isStudent: boolean; botLinerHex: string }) {
  const baseBubbleClass = cn(
    'rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
    isStudent
      ? 'bg-pullim-blue-600 text-white rounded-tr-sm px-3.5 py-2.5'
      : 'bg-card border-pullim-slate-100 border border-l-[3px] text-pullim-slate-800 rounded-tl-sm',
  );
  const linerStyle = isStudent ? undefined : { borderLeftColor: botLinerHex };

  // 사용자 메시지는 항상 text — 다른 타입은 봇 전용
  if (isStudent || !turn.kind || turn.kind === 'text') {
    return (
      <div className={cn(baseBubbleClass, !isStudent && 'px-3.5 py-2.5')} style={linerStyle}>
        {turn.text}
      </div>
    );
  }

  // explain-step — 1️⃣2️⃣3️⃣ 단계 (수식 mono)
  if (turn.kind === 'explain-step' && turn.payload && 'steps' in turn.payload) {
    const { steps } = turn.payload;
    return (
      <div className={cn(baseBubbleClass, 'px-3.5 py-3 space-y-3')} style={linerStyle}>
        <p>{turn.text}</p>
        <ol className="space-y-2 border-t border-pullim-slate-100 pt-2">
          {steps.map(s => (
            <li key={s.num} className="flex gap-2">
              <span className="bg-pullim-blue-50 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">{s.num}</span>
              <div className="min-w-0 flex-1">
                <div className="text-pullim-slate-900 text-[12px] font-bold">{s.label}</div>
                <div className="text-pullim-slate-600 mt-0.5 text-[12px]">{s.body}</div>
                {s.formula && (
                  <code className="bg-pullim-slate-50 text-pullim-slate-700 mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {s.formula}
                  </code>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // problem-card — lime 좌측 라이너 + 문제번호 큰 숫자 + CTA
  if (turn.kind === 'problem-card' && turn.payload && 'ctaHref' in turn.payload) {
    const { problemNumber, title, ctaLabel, ctaHref } = turn.payload as ProblemCardPayload;
    return (
      <div className={cn(baseBubbleClass, 'px-3.5 py-3 space-y-2')} style={{ borderLeftColor: '#E6FF4C' }}>
        <p>{turn.text}</p>
        <div className="bg-pullim-slate-50 flex items-center gap-2.5 rounded-lg p-2.5">
          <span className="text-pullim-lemon-ink bg-pullim-lemon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold">
            {problemNumber}
          </span>
          <div className="min-w-0 flex-1 text-[12px] font-semibold text-pullim-slate-800">{title}</div>
          <Link
            href={ctaHref}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
          >
            {ctaLabel} →
          </Link>
        </div>
      </div>
    );
  }

  // image / reference-link / audio — 스캐폴드 (v2)
  if (turn.kind === 'image' && turn.payload && 'url' in turn.payload && 'alt' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'overflow-hidden p-0')} style={linerStyle}>
        <img src={(turn.payload as ImagePayload).url} alt={(turn.payload as ImagePayload).alt} className="block w-full" />
        {turn.text && <p className="px-3.5 py-2">{turn.text}</p>}
      </div>
    );
  }
  if (turn.kind === 'reference-link' && turn.payload && 'domain' in turn.payload) {
    const { domain, title, summary, thumbUrl } = turn.payload as ReferenceLinkPayload;
    return (
      <div className={cn(baseBubbleClass, 'px-3.5 py-3 space-y-2')} style={linerStyle}>
        <p>{turn.text}</p>
        <div className="bg-pullim-slate-50 flex gap-2 rounded-lg p-2">
          {thumbUrl && <img src={thumbUrl} alt="" className="aspect-video w-24 rounded object-cover" />}
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-400 text-[10px]">{domain}</div>
            <div className="text-pullim-slate-900 text-[12px] font-bold">{title}</div>
            <p className="text-pullim-slate-500 mt-0.5 line-clamp-1 text-[11px]">{summary}</p>
          </div>
        </div>
      </div>
    );
  }
  if (turn.kind === 'audio' && turn.payload && 'durationSec' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'flex items-center gap-2 px-3.5 py-3')} style={linerStyle}>
        <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-7 w-7 items-center justify-center rounded-full text-[11px]">▶</span>
        <div className="min-w-0 flex-1 text-[12px] text-pullim-slate-700">{turn.text}</div>
        <span className="text-pullim-slate-400 font-mono text-[10px]">{(turn.payload as AudioPayload).durationSec}s</span>
      </div>
    );
  }

  // fallback — 미지원 타입은 text 처리
  return (
    <div className={cn(baseBubbleClass, 'px-3.5 py-2.5')} style={linerStyle}>
      {turn.text}
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
          className="bg-card border-pullim-slate-100 relative overflow-hidden rounded-2xl rounded-tl-sm border border-l-[3px] px-4 py-3"
          style={{ borderLeftColor: botSig.hex }}
        >
          {/* M9 응답 wave bar — 봇 응답 시작 직전 1회 ([08 § 12 M9]) */}
          <div
            aria-hidden
            className="pullim-anim-wave-bar absolute top-0 left-0 h-[3px] w-full"
            style={{ backgroundColor: botSig.hex }}
          />
          <div className="flex items-center gap-1">
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
    </div>
  );
}
