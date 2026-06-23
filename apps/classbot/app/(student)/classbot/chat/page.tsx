'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ChevronDown, ChevronUp, Send, Eye, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  scopeMeta,
  pickClassbotReply, type ReplyKey,
  type QuickReplyKey, type LessonFlowKey,
  getMyBots, type ClassBot,
} from '@/lib/mock';
import {
  getBotLesson,
  type BotLesson, type LessonConcept, type LessonStep, type LessonQuiz,
} from '@/lib/mock/classbot-lesson';
import { RichText } from '@/components/classbot/rich-text';
import { useLessonActionStore, type LessonRequest } from '@/lib/store/lesson-action';
import { useCurrentUser } from '@/lib/current-user';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';
import { composeFirstGreeting } from '@/lib/mock/classbot-greeting';
import { getDynamicQuickReplies } from '@/lib/mock/classbot-dynamic-replies';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useEnrolledTutors } from '@/lib/store/self-learning';
import { useVisualViewport } from '@/lib/hooks/use-visual-viewport';
import { LiveCompactBar, LiveHeaderMeta } from '@/components/classbot/live-overlay';
import { ChatAttachSheet, ChatVoiceButton } from '@/components/classbot/chat-attach-sheet';
import { LiveBadge } from '@/components/classbot/live-badge';
import { BotIdentityCard } from '@/components/classbot/bot-identity-card';
import { ChatStudyRail } from '@/components/classbot/chat-study-rail';
import { ChatStudyInline } from '@/components/classbot/chat-study-inline';
import { useSetRightRail } from '@/components/shell/right-rail-context';
import { cn } from '@/lib/utils';

/**
 * 메시지 타입 카탈로그 ([04 § 9.8], [08 § 15.1.3]).
 * - text: 기본 버블 (RichText 렌더)
 * - problem-card: 좌측 라이너 + 문제번호 + "풀러 가기" CTA
 * - explain-step: 단계 indent + 수식 mono (단계별 풀이)
 * - lesson-intro: 봇 주도 수업 오프너 (오늘의 개념 + 💡 핵심)
 * - concept: 개념 카드 (요약·핵심요소·자세히 보기 → 챗 상세)
 * - concept-detail: 개념 상세 (학습 팁·핵심 요소·예제 문항) — 챗 버블
 * - example: 예제 단계 카드 (제목 + steps)
 * - quiz: 인라인 객관식 퀴즈 (정답·해설)
 * - summary: 오늘 정리 카드
 */
type MessageKind =
  | 'text' | 'problem-card' | 'explain-step'
  | 'lesson-intro' | 'concept' | 'concept-detail' | 'example' | 'quiz' | 'summary';

type Turn = {
  id: string;
  role: 'student' | 'bot';
  text: string;
  /** epoch ms — 메시지 그루핑/디바이더 계산용 ([04 § 9.8]) */
  at: number;
  /** 메시지 타입 (기본 text) */
  kind?: MessageKind;
  /** 타입별 payload */
  payload?: ProblemCardPayload | ExplainStepPayload
    | LessonIntroPayload | ConceptPayload | ExamplePayload | QuizPayload;
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

type LessonIntroPayload = { topic: string; keyCallout: string };
type ConceptPayload = { concept: LessonConcept };
type ExamplePayload = { title: string; steps: LessonStep[] };
type QuizPayload = { quiz: LessonQuiz };


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
  const enrolledTutors = useEnrolledTutors();
  const myBots = useMemo(() => [...getMyBots().map(b => b.bot), ...enrolledTutors], [enrolledTutors]);
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
    // lg+: 페이지에 확정 높이를 줘 flex 체인을 복구 → 챗 섹션이 남은 높이를 정확히 채우고
    // main(중앙) 스크롤바가 생기지 않는다. 모바일은 h-full + 스크롤 max-h 휴리스틱 유지.
    <div className="flex h-full min-h-0 flex-col gap-3 lg:h-[calc(100dvh-11rem)]">
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
  // 봇 주도 가이드 수업 데이터 (단일 출처)
  const lesson = useMemo(() => getBotLesson(bot.id), [bot.id]);

  // [07 § 4.6.1·4.6.3] 첫 인사 + 봇 주도 수업 오프너 (mount 시 1회만 계산)
  const [turns, setTurns] = useState<Turn[]>(() => {
    const now = Date.now();
    return [
      {
        id: `t0_${bot.id}`,
        role: 'bot',
        text: composeFirstGreeting(bot.greeting, me.name, bot.tone),
        at: now,
      },
      {
        id: `t1_${bot.id}`,
        role: 'bot',
        text: lesson.intro,
        at: now + 1,
        kind: 'lesson-intro',
        payload: { topic: lesson.topic, keyCallout: lesson.keyCallout } satisfies LessonIntroPayload,
      },
    ];
  });
  const [pending, setPending] = useState(false);
  const [value, setValue] = useState('');
  const [showNewMessageBanner, setShowNewMessageBanner] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  // [04 § 9.6] 직전 봇 발화 응답키 — 동적 빠른칩 추천에 사용
  const [lastBotReplyKey, setLastBotReplyKey] = useState<QuickReplyKey | undefined>();
  // 봇 주도 수업 — "다음 개념" 순환 인덱스 (렌더에 직접 쓰이지 않아 ref)
  const conceptIdxRef = useRef(0);
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
      // 즉시 스크롤 — smooth는 긴 콘텐츠에서 애니메이션 도중 onScroll이 sticky를 꺼
      // 자동 추적이 끊긴다. 새 메시지는 바로 바닥에 붙인다.
      scrollToBottom('auto');
    } else {
      setShowNewMessageBanner(true);
    }
  }, [turns, pending]);

  // 수업 액션 소비 — 인라인 런처/우측 레일/챗 버블 dispatch를 대화에 주입(이동 없음)
  const lessonRequest = useLessonActionStore(s => s.request);
  const clearLessonRequest = useLessonActionStore(s => s.clear);
  useEffect(() => {
    if (!lessonRequest || lessonRequest.botId !== bot.id) return;
    stickyRef.current = true; // 주입 시 항상 따라 내려가도록
    const at = Date.now();
    const turn = buildLessonActionTurn(`la${lessonRequest.nonce}`, at, lessonRequest, lesson, conceptIdxRef);
    if (turn) setTurns(t => [...t, turn]);
    clearLessonRequest();
  }, [lessonRequest, bot.id, lesson, clearLessonRequest]);

  function send(text: string, forcedKey?: QuickReplyKey) {
    if (!text.trim() || pending) return;
    const now = Date.now();
    setTurns(t => [...t, { id: `s${now}`, role: 'student', text: text.trim(), at: now }]);
    setPending(true);

    // 로그인 세션이면 본인 명의로 메시지를 영속화한다(plan Phase 3 쓰기 thin-slice).
    // 데모(비로그인)는 mock 대화만 — 서버가 401 로 거른다.
    if (me.isAuthenticated) {
      void persistChatMessage(bot.id, text.trim());
    }

    setTimeout(() => {
      const at = Date.now();
      const richTurn = isLessonFlowKey(forcedKey)
        // 봇 주도 수업 흐름 — getBotLesson 데이터로 구조화 메시지 생성
        ? buildLessonTurn(`b${at}`, at, forcedKey, lesson, conceptIdxRef)
        // 일반 응답 — 톤별 문자열 + 레거시 메시지 타입 매핑
        : buildRichBotTurn(`b${at}`, pickClassbotReply(text, bot.tone, forcedKey), at, forcedKey, bot.id);
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

  // ── 데스크톱 좌측 프로필 레일: 봇 정체성 + 범위/라이브 전체 정보 ──────────────
  const railNode = useMemo(() => (
    <BotIdentityCard
      bot={bot}
      density="comfortable"
      headingLevel="h2"
      showSignatureLiner
      trailing={isLive ? <LiveBadge variant="pill" /> : undefined}
    >
      {/* watched-by-teacher — always visible */}
      <div className="bg-white/10 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs backdrop-blur">
        <Eye className="text-pullim-lemon h-3 w-3" />
        <span className="text-white/90"><strong className="text-pullim-lemon">{bot.teacherName}</strong>이 이 대화를 실시간으로 볼 수 있어요. 시험 기간엔 자동 차단.</span>
      </div>
      {isLive ? (
        /* live lock banner — rail only */
        <div className="bg-pullim-lemon/15 border-pullim-lemon/40 mt-2 rounded-lg border px-3 py-1.5 text-2xs">
          <span className="text-pullim-lemon font-bold">🔒 라이브 정책 적용 중</span>
          <span className="text-white/80 ml-1">— {scope.label} <span className="font-mono text-micro text-white/55">({scope.short})</span>으로 자동 잠금. 종료 후 평시 정책 복귀.</span>
        </div>
      ) : (
        /* scope schedule — rail only */
        <details className="bg-pullim-blue-700/30 mt-2 rounded-lg px-3 py-1.5 text-2xs backdrop-blur">
          <summary className="cursor-pointer list-none flex items-center gap-1.5">
            <span className="bg-pullim-lemon text-pullim-lemon-ink rounded-full px-1.5 py-0.5 text-micro font-bold">{scope.label}</span>
            <span className="text-white/90 font-semibold">지금 봇 범위 — {scope.allow}</span>
            <span className="text-white/60 ml-auto text-micro">시간대별 자동 변동 ↗</span>
          </summary>
          <div className="text-white/80 mt-2 space-y-0.5 leading-relaxed">
            <p>· 18:00~19:00 · 단계 힌트까지 <span className="font-mono text-micro text-white/55">(L4)</span></p>
            <p>· 19:00~22:00 · 개념까지 <span className="font-mono text-micro text-white/55">(L3)</span> ← 현재 학원 시간</p>
            <p>· 22:00 이후 · 답까지 <span className="font-mono text-micro text-white/55">(L5)</span> 자기학습</p>
          </div>
        </details>
      )}
      {isLive && <LiveHeaderMeta bot={bot} />}
    </BotIdentityCard>
  ), [bot, isLive, scope]);

  // ── 데스크톱 우측 레일 (2단 레이아웃): 봇 프로필 + 퀴즈 + 학습 가이드 ──────────
  // 기존 좌측 프로필 레일을 우측으로 합쳐 2단으로 만든다. 챗이 좌측 전체 폭을 차지.
  const rightRail = useMemo(() => (
    <div className="space-y-4 p-3">
      {railNode}
      <ChatStudyRail bot={bot} />
    </div>
  ), [railNode, bot]);
  useSetRightRail(rightRail);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/*
        모바일 전용 봇 메타 헤더 (lg 이상에서 숨김 — 데스크톱은 우측 레일 사용).
        identity ONLY — scope/watched/live 는 레일에만 있어 Playwright strict mode 통과.
        data-slot/data-collapsed 은 BotIdentityCard 가 data-* props 를 포워드하지 않으므로
        wrapper <div> 에 직접 배치.
      */}
      <div
        className="lg:hidden"
        data-slot="bot-meta-header"
        data-collapsed={headerCollapsed ? 'true' : 'false'}
      >
        <BotIdentityCard
          bot={bot}
          density="compact"
          headingLevel="h1"
          collapsed={headerCollapsed}
          showSignatureLiner
          leading={
            <Link href="/classbot" aria-label="클래스봇 홈으로" className="text-pullim-slate-300 hover:text-pullim-lemon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
          trailing={
            <button type="button" onClick={() => setHeaderCollapsed(c => !c)} aria-label={headerCollapsed ? '봇 정보 펼치기' : '봇 정보 접기'} aria-expanded={!headerCollapsed} className="text-pullim-slate-300 hover:bg-white/10 hover:text-white inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              {headerCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      {/*
        챗 메인 — 2단 레이아웃에서 좌측 전체 폭을 차지한다.
        라이브 봇이면 헤더 바로 아래에 컴팩트 라이브 바를 얹어 챗을 위로 끌어올리고,
        섹션 내부 단일 스크롤(flex-1)로 중앙 중첩 스크롤바를 제거한다.
      */}
      <section className="bg-card flex flex-1 min-h-0 flex-col rounded-2xl border">
        <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2.5 text-sm">
          <span className="text-pullim-slate-700 font-bold">봇과 대화</span>
          {isLive && (
            <span className="text-pullim-slate-400 ml-auto">
              개념 질문은 여기서 — 라이브 모더레이션 큐는 “라이브 수업 펼치기 → 선생님에게 질문”
            </span>
          )}
        </header>

        {/* 라이브 진행 중이면 — 컴팩트 바 (펼치면 슬라이드·자막·즉석 퀴즈·질문) */}
        {isLive && <LiveCompactBar bot={bot} />}

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-slot="chat-scroll"
            className="flex max-h-[calc(100dvh-14rem)] min-h-[360px] flex-col gap-3 overflow-y-auto p-4 lg:max-h-none lg:min-h-0 lg:flex-1"
          >
            {/* 챗에 내장된 학습 가이드 + 연습 퀴즈 (학습 요소 강화) */}
            <ChatStudyInline bot={bot} />
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
                className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 pullim-anim-message-mount border-l-2 disabled:opacity-50 inline-flex items-center gap-1 rounded-r-full rounded-l px-3 py-1.5 text-sm font-semibold transition-colors"
              >
                {p.text}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
            <ChatAttachSheet botName={bot.name} />
            <ChatVoiceButton onNotify={msg => toast(msg)} />
            <textarea
              ref={textareaRef}
              name="q"
              value={value}
              rows={1}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={`${bot.name}에게 물어보세요…`}
              style={{ maxHeight: `${TEXTAREA_MAX_PX}px` }}
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 flex-1 resize-none rounded-2xl border px-3.5 py-2.5 text-base leading-relaxed outline-none"
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
        </div>
      </section>
    </div>
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

/* ─── 메시지 타입 dispatch ([08 § 15.1.3]) ─── */

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
    // 봇 과목에 맞는 연습 문제로 안내 (하드코딩 X — 레슨 데이터에서)
    const pq = getBotLesson(botId).practiceQuizzes[0];
    return {
      id, role: 'bot', at, text,
      kind: 'problem-card',
      payload: {
        problemNumber: pq.problemNumber,
        title: pq.title,
        ctaLabel: '풀러 가기',
        ctaHref: `/classbot/assignment/as_prescription/solve?bot=${botId}`,
      } satisfies ProblemCardPayload,
    };
  }
  // 오늘 정리 — 레슨 summary 카드
  if (forcedKey === 'today_summary') {
    return { id, role: 'bot', at, text: getBotLesson(botId).summary, kind: 'summary' };
  }
  // 기본 — text 버블
  return { id, role: 'bot', at, text, kind: 'text' };
}

/* ─── 봇 주도 가이드 수업 — 흐름키 → 구조화 메시지 ─── */

const LESSON_FLOW_KEYS: ReadonlySet<string> = new Set([
  'lesson_concept', 'lesson_example', 'lesson_quiz', 'lesson_next',
]);

function isLessonFlowKey(k?: QuickReplyKey): k is LessonFlowKey {
  return k !== undefined && LESSON_FLOW_KEYS.has(k);
}

/** 흐름키로 getBotLesson 데이터를 구조화 메시지로 변환. "다음 개념"은 idxRef 순환. */
function buildLessonTurn(
  id: string,
  at: number,
  key: LessonFlowKey,
  lesson: BotLesson,
  idxRef: { current: number },
): Turn {
  const concepts = lesson.concepts;
  if (key === 'lesson_next') {
    idxRef.current = (idxRef.current + 1) % Math.max(1, concepts.length);
  }
  if (key === 'lesson_concept' || key === 'lesson_next') {
    const c = concepts[idxRef.current] ?? concepts[0];
    const lead = key === 'lesson_next' ? '다음 개념 가보자' : '이 개념부터 보자';
    return {
      id, role: 'bot', at,
      text: `${lead} — **${c.title}**`,
      kind: 'concept',
      payload: { concept: c } satisfies ConceptPayload,
    };
  }
  if (key === 'lesson_example') {
    return {
      id, role: 'bot', at,
      text: '예제로 같이 적용해보자.',
      kind: 'example',
      payload: { title: lesson.example.title, steps: lesson.example.steps } satisfies ExamplePayload,
    };
  }
  // lesson_quiz
  return {
    id, role: 'bot', at,
    text: '이해 점검 퀴즈야. 직접 풀어봐 👇',
    kind: 'quiz',
    payload: { quiz: lesson.quiz } satisfies QuizPayload,
  };
}

function conceptTurn(id: string, at: number, c: LessonConcept, lead: string): Turn {
  return {
    id, role: 'bot', at,
    text: `${lead} — **${c.title}**`,
    kind: 'concept',
    payload: { concept: c } satisfies ConceptPayload,
  };
}

/** 수업 액션(스토어 dispatch) → 대화 주입용 구조화 메시지 */
function buildLessonActionTurn(
  id: string,
  at: number,
  req: LessonRequest,
  lesson: BotLesson,
  idxRef: { current: number },
): Turn | null {
  const concepts = lesson.concepts;
  const findIdx = (cid?: string) => {
    const i = concepts.findIndex(c => c.id === cid);
    return i >= 0 ? i : idxRef.current;
  };
  switch (req.type) {
    case 'next': {
      idxRef.current = (idxRef.current + 1) % Math.max(1, concepts.length);
      return conceptTurn(id, at, concepts[idxRef.current] ?? concepts[0], '다음 개념 가보자');
    }
    case 'concept': {
      idxRef.current = findIdx(req.conceptId);
      return conceptTurn(id, at, concepts[idxRef.current] ?? concepts[0], '이 개념 보자');
    }
    case 'concept-detail': {
      const c = concepts[findIdx(req.conceptId)] ?? concepts[0];
      return {
        id, role: 'bot', at,
        text: `**${c.title}** 자세히 볼게.`,
        kind: 'concept-detail',
        payload: { concept: c } satisfies ConceptPayload,
      };
    }
    case 'example':
      return {
        id, role: 'bot', at,
        text: '예제로 같이 적용해보자.',
        kind: 'example',
        payload: { title: lesson.example.title, steps: lesson.example.steps } satisfies ExamplePayload,
      };
    case 'quiz':
      return {
        id, role: 'bot', at,
        text: '이해 점검 퀴즈야. 직접 풀어봐 👇',
        kind: 'quiz',
        payload: { quiz: lesson.quiz } satisfies QuizPayload,
      };
  }
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
    <div className="text-pullim-slate-500 my-4 flex items-center justify-center gap-2 text-2xs font-semibold">
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
          style={isStudent ? undefined : { backgroundColor: botSig.hex }}
        >
          {isStudent ? (meName[0] ?? '나') : bot.avatarEmoji}
        </div>
      )}

      <div className={cn('max-w-[88%] sm:max-w-[80%]', isStudent && 'flex flex-col items-end')}>
        {!isStudent && !continuation && (
          <div className="text-pullim-slate-700 mb-1 flex items-baseline gap-1.5 text-sm font-bold">
            <span>{bot.name}</span>
            <span className="text-pullim-slate-400 font-normal">· {formatTime(turn.at)}</span>
          </div>
        )}
        <MessageBody turn={turn} isStudent={isStudent} botLinerHex={botSig.hex} botId={bot.id} />
        {isStudent && (
          <div className="text-pullim-slate-400 mt-1 text-xs">{formatTime(turn.at)}</div>
        )}
      </div>
    </div>
  );
}

/* ─── 메시지 본문 dispatch ([08 § 15.1.3]) ─── */
function MessageBody({ turn, isStudent, botLinerHex, botId }: { turn: Turn; isStudent: boolean; botLinerHex: string; botId: string }) {
  const dispatchLesson = useLessonActionStore(s => s.dispatch);
  // 버블 — 봇은 옅은 회색 + 또렷한 보더 + 시그니처 좌측 라이너, 본문 15px (가독성)
  const baseBubbleClass = cn(
    'rounded-2xl text-[17px] leading-relaxed',
    isStudent
      ? 'bg-pullim-blue-600 text-white rounded-tr-sm px-4 py-3 whitespace-pre-wrap'
      : 'bg-pullim-slate-50 border-pullim-slate-200 border border-l-[3px] text-pullim-slate-800 rounded-tl-sm',
  );
  const linerStyle = isStudent ? undefined : { borderLeftColor: botLinerHex };

  // 학생 메시지 — 평문
  if (isStudent) {
    return <div className={baseBubbleClass}>{turn.text}</div>;
  }

  // 봇 기본 텍스트 — 리치 텍스트 렌더
  if (!turn.kind || turn.kind === 'text') {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3')} style={linerStyle}>
        <RichText text={turn.text} />
      </div>
    );
  }

  // lesson-intro — 봇 주도 수업 오프너
  if (turn.kind === 'lesson-intro' && turn.payload && 'topic' in turn.payload) {
    const { topic, keyCallout } = turn.payload;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <div className="text-pullim-blue-700 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
          <Sparkles className="h-3.5 w-3.5" /> 오늘의 수업 · {topic}
        </div>
        <RichText text={turn.text} />
        <div className="bg-pullim-blue-50 border-l-pullim-blue-400 text-pullim-slate-800 rounded-r-lg border-l-[3px] px-3 py-2.5 text-base">
          <span className="mr-1">💡</span>
          <RichTextInline text={keyCallout} />
        </div>
      </div>
    );
  }

  // concept — 개념 카드 (요약 + 핵심요소 + 자세히 보기 모달)
  if (turn.kind === 'concept' && turn.payload && 'concept' in turn.payload) {
    const { concept } = turn.payload;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <div className="bg-card border-pullim-slate-200 space-y-2 rounded-xl border p-3">
          <p className="text-pullim-slate-900 text-base font-bold">{concept.title}</p>
          <p className="text-pullim-slate-600 text-[15px] leading-relaxed">{concept.summary}</p>
          {concept.formula && (
            <code className="bg-pullim-slate-50 text-pullim-slate-700 block rounded px-2 py-1 font-mono text-xs">
              {concept.formula}
            </code>
          )}
          {concept.coreElements.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {concept.coreElements.map((el, i) => (
                <li key={i} className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {el}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => dispatchLesson(botId, 'concept-detail', concept.id)}
            className="text-pullim-blue-700 hover:text-pullim-blue-800 inline-flex items-center gap-1 text-sm font-bold"
          >
            자세히 보기 (학습 팁·예제 문항) →
          </button>
        </div>
      </div>
    );
  }

  // concept-detail — 개념 상세(학습 팁·핵심 요소·예제 문항)를 챗 버블로
  if (turn.kind === 'concept-detail' && turn.payload && 'concept' in turn.payload) {
    const { concept } = turn.payload;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-3')} style={linerStyle}>
        <RichText text={turn.text} />
        <div className="bg-card border-pullim-slate-200 space-y-3 rounded-xl border p-3">
          <RichText text={concept.detail} />
          {concept.formula && (
            <code className="bg-pullim-slate-50 text-pullim-slate-700 block rounded px-2 py-1.5 font-mono text-sm">
              {concept.formula}
            </code>
          )}
          {concept.tips.length > 0 && (
            <div>
              <div className="text-pullim-blue-700 mb-1.5 text-sm font-bold">💡 학습 팁</div>
              <ul className="space-y-1.5">
                {concept.tips.map((t, i) => (
                  <li key={i} className="bg-pullim-blue-50/60 text-pullim-slate-800 flex gap-2 rounded-lg px-3 py-2 text-[15px]">
                    <span className="text-pullim-blue-600 shrink-0 font-bold">✓</span>
                    <span className="min-w-0 flex-1">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {concept.coreElements.length > 0 && (
            <div>
              <div className="text-pullim-slate-600 mb-1.5 text-sm font-bold">핵심 요소</div>
              <ul className="flex flex-wrap gap-1.5">
                {concept.coreElements.map((el, i) => (
                  <li key={i} className="bg-pullim-slate-100 text-pullim-slate-700 rounded-full px-2.5 py-1 text-sm font-semibold">
                    {el}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {concept.sampleQuestions.length > 0 && (
            <div>
              <div className="text-pullim-slate-600 mb-1.5 text-sm font-bold">예제 문항</div>
              <ol className="space-y-2">
                {concept.sampleQuestions.map((s, i) => (
                  <li key={i} className="bg-pullim-slate-50 rounded-lg p-2.5">
                    <p className="text-pullim-slate-900 text-[15px] font-semibold">
                      <span className="text-pullim-blue-600 mr-1 font-mono">Q{i + 1}.</span>
                      {s.q}
                    </p>
                    {s.a && (
                      <p className="text-pullim-slate-600 mt-1 text-sm">
                        <span className="text-pullim-blue-700 font-bold">정답 ·</span> {s.a}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  // example / explain-step — 단계 풀이 카드
  if ((turn.kind === 'example' || turn.kind === 'explain-step') && turn.payload && 'steps' in turn.payload) {
    const steps = turn.payload.steps;
    const exampleTitle = turn.kind === 'example' && 'title' in turn.payload ? turn.payload.title : undefined;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <div className="bg-card border-pullim-slate-200 rounded-xl border p-3">
          {exampleTitle && (
            <p className="text-pullim-slate-900 mb-2 text-base font-bold">{exampleTitle}</p>
          )}
          <ol className="space-y-2.5">
            {steps.map(s => (
              <li key={s.num} className="flex gap-2.5">
                <span className="bg-pullim-blue-600 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {s.num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 text-[15px] font-bold">{s.label}</div>
                  <div className="text-pullim-slate-600 mt-0.5 text-[15px] leading-relaxed">{s.body}</div>
                  {s.formula && (
                    <code className="bg-pullim-slate-50 text-pullim-slate-700 mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-xs">
                      {s.formula}
                    </code>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // quiz — 인라인 객관식 퀴즈
  if (turn.kind === 'quiz' && turn.payload && 'quiz' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <InlineQuiz quiz={turn.payload.quiz} />
      </div>
    );
  }

  // summary — 오늘 정리 카드
  if (turn.kind === 'summary') {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3')} style={linerStyle}>
        <RichText text={turn.text} />
      </div>
    );
  }

  // problem-card — 좌측 라이너 + 문제번호 + CTA
  if (turn.kind === 'problem-card' && turn.payload && 'ctaHref' in turn.payload) {
    const { problemNumber, title, ctaLabel, ctaHref } = turn.payload as ProblemCardPayload;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2')} style={{ borderLeftColor: '#E6FF4C' }}>
        <RichText text={turn.text} />
        <div className="bg-card border-pullim-slate-200 flex items-center gap-2.5 rounded-lg border p-2.5">
          <span className="text-pullim-lemon-ink bg-pullim-lemon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-2xs font-bold">
            {problemNumber}
          </span>
          <div className="text-pullim-slate-800 min-w-0 flex-1 text-[15px] font-semibold">{title}</div>
          <Link
            href={ctaHref}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
          >
            {ctaLabel} →
          </Link>
        </div>
      </div>
    );
  }

  // fallback — 미지원 타입은 리치 텍스트 처리
  return (
    <div className={cn(baseBubbleClass, 'px-4 py-3')} style={linerStyle}>
      <RichText text={turn.text} />
    </div>
  );
}

/** 한 줄용 인라인 리치텍스트 (블록 래핑 없이) */
function RichTextInline({ text }: { text: string }) {
  return <RichText text={text} className="space-y-0" />;
}

/** 대화 내장 객관식 퀴즈 — 선택·제출·정답/해설 (LiveQuizCard 패턴, blue/danger) */
function InlineQuiz({ quiz }: { quiz: LessonQuiz }) {
  const [selected, setSelected] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && selected === quiz.answerIndex;

  return (
    <div className="bg-card border-pullim-slate-200 rounded-xl border p-3">
      <p className="text-pullim-slate-900 text-base font-bold">{quiz.question}</p>
      <ol role="radiogroup" aria-label="객관식 보기" className="mt-2.5 space-y-1.5">
        {quiz.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = submitted && i === quiz.answerIndex;
          const isWrong = submitted && isSelected && i !== quiz.answerIndex;
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={submitted}
                onClick={() => setSelected(i)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-[15px] font-semibold transition-colors',
                  isCorrect && 'border-pullim-blue-600 bg-pullim-blue-50 text-pullim-blue-700',
                  isWrong && 'border-pullim-danger bg-pullim-danger-bg text-pullim-danger',
                  !submitted && isSelected && 'border-pullim-blue-500 bg-pullim-blue-50',
                  !submitted && !isSelected && 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                )}
              >
                <span className="font-mono">{['①', '②', '③', '④', '⑤'][i] ?? i + 1}</span>
                <span className="min-w-0 flex-1">{opt}</span>
                {isCorrect && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ol>
      {!submitted ? (
        <button
          type="button"
          disabled={selected === undefined}
          onClick={() => setSubmitted(true)}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 mt-2.5 w-full rounded-lg px-3 py-2.5 text-base font-bold text-white transition-colors"
        >
          제출하기
        </button>
      ) : (
        <div className="bg-pullim-slate-50 mt-2.5 rounded-lg p-3 text-[15px]">
          <p className="text-pullim-slate-900 font-bold">{correct ? '🎉 정답이에요!' : '아쉽지만 다시 볼까요?'}</p>
          <p className="text-pullim-slate-600 mt-1 leading-relaxed">{quiz.explain}</p>
        </div>
      )}
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
        <div className="text-pullim-slate-700 mb-1 text-sm font-bold">{bot.name}</div>
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
