'use client';

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Send, Sparkles, Check, Compass, GraduationCap, MessageCircleQuestion } from 'lucide-react';
import { toast } from 'sonner';
import {
  pickClassbotReply, type ReplyKey,
  type QuickReplyKey, type LessonFlowKey,
  type ClassBot,
  LESSON_FLOW_KEYS,
} from '@/lib/mock';
import { useModeBots } from '@/lib/store/mode-bots';
import { useStudentMode } from '@/lib/store/student-mode';
import {
  getBotLesson, getSelfExplain,
  type BotLesson, type LessonConcept, type LessonStep, type LessonQuiz, type SelfExplainPrompt,
} from '@/lib/mock/classbot-lesson';
import { InlineWorkedExample } from '@/components/classbot/inline-worked-example';
import {
  CONFIDENCE_OPTIONS, getCalibrationFeedback, CALIB_TONE_CLASS, type Confidence,
} from '@/lib/tokens/quiz-calibration';
import { RichText } from '@/components/classbot/rich-text';
import { useLessonActionStore, type LessonRequest } from '@/lib/store/lesson-action';
import { useCurrentUser } from '@/lib/current-user';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';
import { composeFirstGreeting } from '@/lib/mock/classbot-greeting';
import { getDynamicQuickReplies, quickReplyChipKind } from '@/lib/mock/classbot-dynamic-replies';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useVisualViewport } from '@/lib/hooks/use-visual-viewport';
import { LiveCompactBar } from '@/components/classbot/live-overlay';
import { ChatAttachSheet, ChatVoiceButton } from '@/components/classbot/chat-attach-sheet';
import { LiveBadge } from '@/components/classbot/live-badge';
import { BotIdentityCard } from '@/components/classbot/bot-identity-card';
import { ChatStudyInline } from '@/components/classbot/chat-study-inline';
import { ContextAnchor } from '@/components/classbot/context-anchor';
import { SessionGoalBanner } from '@/components/classbot/session-goal-banner';
import { EmptyState } from '@/components/classbot/empty-state';
import { useLessonProgressStore, type LessonPhase } from '@/lib/store/lesson-progress';
import { useSessionGoalStore, useSessionProgressLive, type SessionStep } from '@/lib/store/session-goal';
import { todayKey } from '@/lib/store/today-key';
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
  | 'lesson-intro' | 'concept' | 'concept-detail' | 'example' | 'quiz' | 'summary' | 'self-explain';

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
    | LessonIntroPayload | ConceptPayload | ExamplePayload | QuizPayload | SummaryPayload
    | SelfExplainPayload;
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
/**
 * summary 버블 달성도(B7 finding#2).
 * freeze 된 pre-hydration done snapshot 은 배너와 어긋날 수 있어 제거 — 대신 goalKey 만 싣고,
 * summary 분기에서 hydration-게이트 라이브 store(useSessionProgressLive)를 직접 읽는다.
 * summary turn 은 "오늘 정리" 1회뿐이라 모든 버블이 구독하는 perf 문제(plan 경고)는 재현되지 않는다.
 */
type SummaryPayload = {
  goalKey: string;
  nextLine?: string;
};
/** 자기설명 프롬프트 payload (B4). */
type SelfExplainPayload = { prompt: SelfExplainPrompt };


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
  const askParam = searchParams.get('ask'); // 회고 '질문' → 약점 맥락 prefill
  // 모드별 봇만 노출 (spec §2) — class: 교사 배정 봇, self: 자기 등록 튜터. 두 소스를 섞지 않는다.
  const { mode, hydrated } = useStudentMode();
  const myBots = useModeBots();
  const initialBotId = botParam && myBots.some(b => b.id === botParam) ? botParam : (myBots[0]?.id ?? 'cb_001');
  const [selectedBotId, setSelectedBotId] = useState<string>(initialBotId);
  const bot = myBots.find(b => b.id === selectedBotId) ?? myBots[0];
  const activeLive = useLiveStore(s => s.active);

  // selectedBotId / ?bot= 정규화
  useEffect(() => {
    // 1) 외부 링크가 유효한 봇을 지정 → 반영
    if (botParam && botParam !== selectedBotId && myBots.some(b => b.id === botParam)) {
      setSelectedBotId(botParam);
      return;
    }
    // 2) 모드 전환·나가기로 현재 봇이 목록에서 사라지면 첫 봇으로 정규화 + URL 동기화
    //    (보이는 봇 = myBots[0] 인데 selectedBotId/?bot= 가 옛 봇에 남는 split 방지)
    if (myBots.length > 0 && !myBots.some(b => b.id === selectedBotId)) {
      const next = myBots[0].id;
      setSelectedBotId(next);
      if (botParam !== next) router.replace(`/classbot/chat?bot=${next}`, { scroll: false });
    }
  }, [botParam, myBots, selectedBotId, router]);

  function handleBotChange(nextId: string) {
    setSelectedBotId(nextId);
    // URL 동기화 — 다른 탭에서 라이브 알림이 와도 정확한 봇이 보이도록
    router.replace(`/classbot/chat?bot=${nextId}`, { scroll: false });
  }

  // persist(mode·enrollment) hydration 전에는 모드/봇이 빈 상태로 평가됨 → 잘못된 빈 상태·CTA 플래시 방지.
  if (!hydrated) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-pullim-slate-500 text-sm">불러오는 중…</div>
      </div>
    );
  }

  // 대화할 봇이 없을 때 — 모드별로 다른 빈 상태 (spec: self 전용 surface를 class 모드에 노출 금지)
  if (!bot) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        {mode === 'class' ? (
          <EmptyState
            icon={GraduationCap}
            title="아직 참여한 클래스가 없어요"
            description="선생님께 받은 참여 코드로 클래스에 참여하면 봇과 대화할 수 있어요."
            action={{ href: '/classbot', label: '참여 코드 입력하기' }}
          />
        ) : (
          <EmptyState
            icon={Compass}
            title="아직 등록한 튜터가 없어요"
            description="봇 마켓에서 과목 튜터를 골라 대화를 시작해 보세요."
            action={{ href: '/classbot/discover', label: '봇 마켓 둘러보기' }}
          />
        )}
      </div>
    );
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
      <ChatPanel key={bot.id} bot={bot} initialAsk={botParam === bot.id ? (askParam ?? undefined) : undefined} />
    </div>
  );
}

const STICKY_THRESHOLD = 80;
const TEXTAREA_MAX_PX = 96;

function ChatPanel({ bot, initialAsk }: { bot: ClassBot; initialAsk?: string }) {
  const botSig = botSignature(bot);
  const isLive = useLiveStore(s => Boolean(s.active[bot.id]));
  const { keyboardOpen } = useVisualViewport();
  const me = useCurrentUser();
  // A5: prefers-reduced-motion → 칩 stagger 무력화
  const reduced = useReducedMotion();
  // A5: 스크린리더 announce 텍스트는 격리된 SrLiveRegion 이 자체 state 로 들고,
  // ChatPanel 은 imperative setter 를 ref 로 받아 호출한다 → turns.map 리렌더 회피.
  const announceRef = useRef<((text: string) => void) | null>(null);
  // 봇 주도 가이드 수업 데이터 (단일 출처)
  const lesson = useMemo(() => getBotLesson(bot.id), [bot.id]);

  // A6 컨텍스트 앵커 — 마지막 본 개념(비스크롤 헤더에 위치 표시 + 1탭 재진입)
  const [activeConceptId, setActiveConceptId] = useState<string | undefined>(undefined);
  const activeConcept = useMemo(
    () => lesson.concepts.find(c => c.id === activeConceptId),
    [lesson, activeConceptId],
  );
  // A6 앵커 jump 용 dispatch (MessageBody/InlineQuiz 외 ChatPanel 스코프에도 구독)
  const dispatchLesson = useLessonActionStore(s => s.dispatch);
  // B7 세션 목표 키 — per-user × per-bot × per-day(오늘 스코프 → 매일 자연 reset).
  // todayKey()는 같은 날엔 안정적이라 memo deps 에 둘 필요 없다(날이 바뀌면 remount/재계산으로 갱신).
  const goalKey = useMemo(() => `${me.id}::${bot.id}::${todayKey()}`, [me.id, bot.id]);

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
  const [value, setValue] = useState(initialAsk ?? '');
  // composer는 URL ask 상태를 따른다 — ask 변경 시 새 prefill 반영, ask 제거 시 초기화(stale 방지).
  useEffect(() => {
    setValue(initialAsk ?? '');
  }, [initialAsk]);
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

  // A5: aria-live 미러링 — 단일 소스. 마지막 bot turn 만 감지해 1회 announce(중복 방지).
  // pending(타이핑 점)은 announce 안 함. send()/lessonRequest 양쪽에서 부르지 않고 여기로 통합.
  useEffect(() => {
    const last = turns[turns.length - 1];
    if (last?.role === 'bot') {
      announceRef.current?.(plainAnnounceText(last));
    }
  }, [turns]);

  // 수업 액션 소비 — 인라인 런처/우측 레일/챗 버블 dispatch를 대화에 주입(이동 없음)
  const lessonRequest = useLessonActionStore(s => s.request);
  const clearLessonRequest = useLessonActionStore(s => s.clear);
  useEffect(() => {
    if (!lessonRequest || lessonRequest.botId !== bot.id) return;
    stickyRef.current = true; // 주입 시 항상 따라 내려가도록
    const at = Date.now();
    const turn = buildLessonActionTurn(`la${lessonRequest.nonce}`, at, lessonRequest, lesson, conceptIdxRef);
    if (turn) {
      setTurns(t => [...t, turn]);
      // 진행 마킹(A1·B7) + 컨텍스트 앵커 갱신(A6) — getState() 직접 호출은 deps 불필요.
      // 키는 비로그인→로그인 per-user 키 오염 방지 위해 effect 내부에서 인라인 계산.
      const phase = kindToLessonPhase(turn.kind);
      if (phase) useLessonProgressStore.getState().markPhase(me.id, bot.id, phase);
      const step = kindToSessionStep(turn.kind);
      if (step) useSessionGoalStore.getState().mark(`${me.id}::${bot.id}::${todayKey()}`, step);
      if ((turn.kind === 'concept' || turn.kind === 'concept-detail') && turn.payload && 'concept' in turn.payload) {
        setActiveConceptId(turn.payload.concept.id);
      }
    }
    clearLessonRequest();
  }, [lessonRequest, bot.id, lesson, clearLessonRequest, me.id]);

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

      // 진행 마킹(A1·B7) + 컨텍스트 앵커 갱신(A6).
      const phase = kindToLessonPhase(richTurn.kind);
      if (phase) useLessonProgressStore.getState().markPhase(me.id, bot.id, phase);
      const step = kindToSessionStep(richTurn.kind);
      if (step) useSessionGoalStore.getState().mark(goalKey, step);
      if ((richTurn.kind === 'concept' || richTurn.kind === 'concept-detail') && richTurn.payload && 'concept' in richTurn.payload) {
        setActiveConceptId(richTurn.payload.concept.id);
      }
      // summary 버블: freeze 된 pre-hydration snapshot 대신 goalKey 만 실어 보낸다(B7 finding#2).
      // 렌더 시 MessageBody summary 분기가 hydration-게이트 라이브 store 를 읽어 배너와 항상 일치.
      if (richTurn.kind === 'summary') {
        richTurn.payload = { goalKey, nextLine: lesson.nextLine } satisfies SummaryPayload;
      }

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
    // A5: textarea 재포커스는 데스크톱 한정. 모바일 재포커스는 가상 키보드/--keyboard-offset
    // 재트리거로 회귀를 부르므로(mobile-and-focus) keyboardOpen 아닐 때 + pointer:fine 에서만.
    const isDesktop =
      !keyboardOpen &&
      (typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function' ||
        window.matchMedia('(pointer:fine)').matches);
    if (isDesktop) {
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  // B3: 예제 reveal·확신도 삽입 등 버블 내부 높이 변화는 turns/pending 변화가 아니라
  // 자동추적 effect(deps=[turns,pending])가 안 돈다 → 카드가 onReveal 로 알리면
  // stickyRef.current(바닥 근처) 일 때만 즉시 바닥 추적(useCallback 으로 자식 리렌더 최소화).
  const handleCardReveal = useCallback(() => {
    if (stickyRef.current) scrollToBottom('auto');
    // scrollToBottom/stickyRef 는 ref/stable closure 라 deps 불필요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A6 앵커 탭 — 마지막 본 개념을 챗에 재주입(이동 없음, 자동스크롤은 lessonRequest effect 가 처리)
  function handleAnchorJump() {
    if (!activeConceptId) return;
    dispatchLesson(bot.id, 'concept', activeConceptId);
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/*
        봇 메타 헤더 (lg 이상에서 숨김).
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
        챗 메인 — lg+ 는 2단 [챗 | 오늘의 학습 가이드 레일], 모바일은 단일 컬럼(가이드는 챗 상단 인라인).
        라이브 봇이면 헤더 바로 아래에 컴팩트 라이브 바를 얹어 챗을 위로 끌어올리고,
        섹션 내부 단일 스크롤(flex-1)로 중앙 중첩 스크롤바를 제거한다.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="bg-card flex flex-1 min-h-0 min-w-0 flex-col rounded-2xl border">
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

        {/*
          고정 헤더형 표시물 — chat-scroll div 가 아니라 비스크롤 레이어(scroll div 위 형제).
          scrollHeight/scrollTop 측정 체인에서 분리 → chat-scroll-and-input.spec 좌표 단언 무영향.
          순서(위→아래): B7 세션 목표 배너 → A6 컨텍스트 앵커.
        */}
        <div className="space-y-2 px-4 pt-3">
          <SessionGoalBanner bot={bot} goalKey={goalKey} />
          <ContextAnchor concept={activeConcept} botSigHex={botSig.hex} onJump={handleAnchorJump} />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-slot="chat-scroll"
            className="flex max-h-[calc(100dvh-14rem)] min-h-[360px] flex-col gap-3 overflow-y-auto p-4 lg:max-h-none lg:min-h-0 lg:flex-1"
          >
            {/* 챗 내장 학습 가이드 — 모바일 전용(lg+ 는 우측 레일). */}
            <div className="lg:hidden">
              <ChatStudyInline bot={bot} userId={me.id} />
            </div>
            {turns.map((t, i) => (
              <RenderTurn key={t.id} turn={t} bot={bot} prev={turns[i - 1]} meName={me.name} onCardReveal={handleCardReveal} />
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

        {/* A5: 격리된 sr-only live region — 자체 state 로 announce 텍스트를 들어 ChatPanel 리렌더 회피. */}
        <SrLiveRegion announceRef={announceRef} />

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
          {/*
            동적 빠른 칩 — M7 stagger(60ms, A5 reduced-motion 시 0ms).
            A7: 모든 칩은 좌측 라이너를 가진다(DS). guide(수업 단계 — 시그니처색 라이너) vs ask(자유 질문 — 중립 slate 라이너) 색으로 구분.
          */}
          <div className="flex flex-wrap gap-1.5">
            {dynamicQuickReplies.map((p, i) => {
              const kind = quickReplyChipKind(p.expectedReplyKey);
              const Icon = kind === 'guide' ? GraduationCap : MessageCircleQuestion;
              const animationDelay = reduced ? '0ms' : `${i * 60}ms`;
              const commonClass =
                'pullim-anim-message-mount disabled:opacity-50 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400 focus-visible:ring-offset-1';
              return (
                <button
                  key={p.text}
                  type="button"
                  onClick={() => send(p.text, p.expectedReplyKey)}
                  disabled={pending}
                  title={kind === 'guide' ? '수업 단계' : '자유 질문'}
                  style={
                    kind === 'guide'
                      ? { borderLeftColor: botSig.hex, animationDelay }
                      : { animationDelay }
                  }
                  className={cn(
                    commonClass,
                    // DS: 모든 빠른 칩은 좌측 라이너를 가진다. guide=시그니처색, ask=중립 slate 로 색 구분.
                    kind === 'guide'
                      ? 'bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 border-l-2 rounded-r-full rounded-l'
                      : 'border border-l-2 border-pullim-slate-200 border-l-pullim-slate-300 bg-white text-pullim-slate-700 hover:bg-pullim-slate-50 rounded-r-full rounded-l',
                  )}
                >
                  <Icon aria-hidden className="h-3.5 w-3.5" />
                  <span>{p.text}</span>
                </button>
              );
            })}
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

      {/* 오늘의 학습 가이드 — lg+ 우측 레일(독립 스크롤). 모바일은 챗 상단 인라인 유지. */}
      <aside
        data-slot="chat-study-rail"
        className="hidden min-h-0 lg:block lg:overflow-y-auto"
      >
        <ChatStudyInline bot={bot} userId={me.id} />
      </aside>
      </div>
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
        // 자기주도 출시: 데모 과제(as_prescription) 제거됨 → 튜터 학습 커리큘럼으로 연결.
        ctaLabel: '학습하러 가기',
        ctaHref: `/classbot/learn/${botId}`,
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

// A7: 흐름키 런타임 목록은 chat.ts 의 LESSON_FLOW_KEYS 단일 출처에서 파생(중복 Set 제거).
const LESSON_FLOW_KEY_SET: ReadonlySet<string> = new Set(LESSON_FLOW_KEYS);

function isLessonFlowKey(k?: QuickReplyKey): k is LessonFlowKey {
  return k !== undefined && LESSON_FLOW_KEY_SET.has(k);
}

/* ─── 진행 마킹 매핑(A1·B7) — turn.kind → 레슨 위상 / 세션 단계 ─── */

/** turn.kind → A1 LessonPhase(없으면 undefined — 마킹 안 함). */
function kindToLessonPhase(kind?: MessageKind): LessonPhase | undefined {
  switch (kind) {
    case 'concept':
    case 'concept-detail':
      return 'concept';
    case 'example':
      return 'example';
    case 'quiz':
      return 'quiz';
    case 'summary':
      return 'summary';
    default:
      return undefined;
  }
}

/** turn.kind → B7 SessionStep(summary 는 step 아님 → undefined). */
function kindToSessionStep(kind?: MessageKind): SessionStep | undefined {
  switch (kind) {
    case 'concept':
    case 'concept-detail':
      return 'concept';
    case 'example':
      return 'example';
    case 'quiz':
      return 'quiz';
    default:
      return undefined;
  }
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
      text: '예제야. 처음 단계는 내가, 뒷 단계는 네가 직접 채워봐 👇',
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
        text: '예제야. 처음 단계는 내가, 뒷 단계는 네가 직접 채워봐 👇',
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
    case 'self-explain': {
      // selfExplains 에서 conceptId 매핑(미지정/미발견 → 첫 프롬프트). 비면 주입 안 함.
      const list = lesson.selfExplains;
      const prompt = !list || list.length === 0
        ? undefined
        : (req.conceptId ? list.find(s => s.conceptId === req.conceptId) ?? list[0] : list[0]);
      if (!prompt) return null;
      return {
        id, role: 'bot', at,
        text: '네 말로 한번 설명해볼래? 아래에 적어줘 👇',
        kind: 'self-explain',
        payload: { prompt } satisfies SelfExplainPayload,
      };
    }
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

function RenderTurn({ turn, bot, prev, meName, onCardReveal }: { turn: Turn; bot: ClassBot; prev: Turn | undefined; meName: string; onCardReveal: () => void }) {
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
      <Bubble turn={turn} bot={bot} continuation={isContinuation} meName={meName} onCardReveal={onCardReveal} />
    </>
  );
}

function Bubble({ turn, bot, continuation = false, meName, onCardReveal }: { turn: Turn; bot: ClassBot; continuation?: boolean; meName: string; onCardReveal: () => void }) {
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
        <MessageBody turn={turn} isStudent={isStudent} botLinerHex={botSig.hex} botId={bot.id} scope={bot.scope} onCardReveal={onCardReveal} />
        {isStudent && (
          <div className="text-pullim-slate-400 mt-1 text-xs">{formatTime(turn.at)}</div>
        )}
      </div>
    </div>
  );
}

/* ─── 메시지 본문 dispatch ([08 § 15.1.3]) ─── */
function MessageBody({ turn, isStudent, botLinerHex, botId, scope, onCardReveal }: { turn: Turn; isStudent: boolean; botLinerHex: string; botId: string; scope: number; onCardReveal: () => void }) {
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

  // example — 점진 스캐폴딩(fading worked example, B3). reveal 로 높이 변하면 onCardReveal 로 바닥추적.
  if (turn.kind === 'example' && turn.payload && 'steps' in turn.payload && 'title' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <InlineWorkedExample title={turn.payload.title} steps={turn.payload.steps} onReveal={onCardReveal} />
      </div>
    );
  }

  // explain-step — 단계 풀이 카드(정적 ol, 스캐폴딩 불필요)
  if (turn.kind === 'explain-step' && turn.payload && 'steps' in turn.payload) {
    const steps = turn.payload.steps;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <div className="bg-card border-pullim-slate-200 rounded-xl border p-3">
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

  // quiz — 인라인 객관식 퀴즈 (힌트 사다리 + 확신도 보정 + 오답 처방)
  if (turn.kind === 'quiz' && turn.payload && 'quiz' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <InlineQuiz quiz={turn.payload.quiz} botId={botId} scope={scope} onCardReveal={onCardReveal} />
      </div>
    );
  }

  // self-explain — 자기설명 프롬프트 카드 (B4)
  if (turn.kind === 'self-explain' && turn.payload && 'prompt' in turn.payload) {
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-2.5')} style={linerStyle}>
        <RichText text={turn.text} />
        <SelfExplainCard prompt={turn.payload.prompt} botId={botId} onCardReveal={onCardReveal} />
      </div>
    );
  }

  // summary — 오늘 정리 카드 + 달성도(B7 finding#2).
  // done 은 freeze snapshot 이 아니라 SummaryBubble 이 hydration-게이트 라이브 store 에서 읽는다 →
  // 배너와 항상 일치. 구독은 summary 분기(전용 컴포넌트)에만 들어가 다른 버블 리렌더 없음.
  if (turn.kind === 'summary') {
    const goalKey = turn.payload && 'goalKey' in turn.payload ? turn.payload.goalKey : undefined;
    const nextLine = turn.payload && 'nextLine' in turn.payload ? turn.payload.nextLine : undefined;
    return (
      <div className={cn(baseBubbleClass, 'px-4 py-3 space-y-3')} style={linerStyle}>
        <RichText text={turn.text} />
        {goalKey && <SummaryProgress goalKey={goalKey} nextLine={nextLine} />}
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

/**
 * summary 버블 달성도 — 배너와 동일한 hydration-게이트 라이브 store 를 읽어 항상 일치(B7 finding#2).
 * summary turn 은 "오늘 정리" 1회뿐이라 이 구독이 다른 버블 리렌더를 유발하지 않는다.
 * SSR/첫 페인트는 useSessionProgressLive 가 0/false 를 강제 → 배너와 하이드레이션 일치.
 */
function SummaryProgress({ goalKey, nextLine }: { goalKey: string; nextLine?: string }) {
  const progress = useSessionProgressLive(goalKey);
  const doneCount = [progress.concept, progress.example, progress.quiz].filter(Boolean).length;
  const allDone = doneCount === 3;
  return (
    <div className="border-pullim-slate-200 space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-pullim-slate-600 text-sm font-bold">오늘 목표 달성도</span>
        <span className="text-pullim-slate-700 text-sm font-semibold">{doneCount}/3 완료</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label={`오늘 목표 ${doneCount}/3 완료`}
        className="bg-pullim-slate-100 h-2 w-full overflow-hidden rounded-full"
      >
        <span
          className="bg-pullim-blue-600 block h-full rounded-full"
          style={{ width: `${(doneCount / 3) * 100}%` }}
        />
      </div>
      {allDone && (
        <p className="text-pullim-blue-700 text-sm font-bold">🎯 오늘 목표 달성!</p>
      )}
      {nextLine && (
        <div className="bg-pullim-blue-50 text-pullim-slate-800 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px]">
          <ArrowRight aria-hidden className="text-pullim-blue-600 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="text-pullim-blue-700 mr-1 font-bold">다음 한 걸음 ·</span>
            {nextLine}
          </span>
        </div>
      )}
    </div>
  );
}

/** 한 줄용 인라인 리치텍스트 (블록 래핑 없이) */
function RichTextInline({ text }: { text: string }) {
  return <RichText text={text} className="space-y-0" />;
}

/**
 * 대화 내장 객관식 퀴즈 — 단계적 힌트 사다리 + 오답 처방.
 * - 힌트: 봇 scope L레벨이 공개 깊이 제한 (L3=1 / L4=2 / L5=전부). "답은 직접" 페르소나.
 * - 오답: 그 보기가 왜 함정인지(distractor 피드백) + 처방(개념 다시 보기=챗 주입 / 다시 풀기).
 * 색 규약: blue/slate + 위험빨강만 (green/amber 금지).
 */
function InlineQuiz({ quiz, botId, scope, onCardReveal }: { quiz: LessonQuiz; botId: string; scope: number; onCardReveal: () => void }) {
  const dispatchLesson = useLessonActionStore(s => s.dispatch);
  const [selected, setSelected] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  // B5: 확신도 — optional 메타인지 레이어. 제출 게이트에 넣지 않는다(기존 흐름 보존).
  const [confidence, setConfidence] = useState<Confidence | undefined>();
  const correct = submitted && selected === quiz.answerIndex;
  // scope L레벨 → 힌트 공개 깊이 (L3 개념까지=1, L4 단계까지=2, L5 답까지=전부)
  const maxHints = scope >= 5 ? quiz.hints.length : Math.min(scope >= 4 ? 2 : 1, quiz.hints.length);

  // A5: 마운트 시 첫 보기 button 에 키보드 포커스(퀴즈는 항상 사용자 액션 후 주입 — 초기 페이지
  // 로드 greeting/lesson-intro 와 동시 mount 되지 않음). preventScroll:true 필수 —
  // false 면 chat-scroll scrollTop 강제 이동 → new-message-banner 불변식 파괴.
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  function reset() {
    setSelected(undefined);
    setSubmitted(false);
    setHintCount(0);
    setConfidence(undefined);
  }

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
                ref={i === 0 ? firstOptionRef : undefined}
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

      {/* 단계적 힌트 사다리 (제출 전) */}
      {!submitted && quiz.hints.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {quiz.hints.slice(0, hintCount).map((h, i) => (
            <div
              key={i}
              className="bg-pullim-blue-50 border-l-pullim-blue-400 text-pullim-slate-800 rounded-r-lg border-l-[3px] px-3 py-2 text-[15px] leading-relaxed"
            >
              <span className="text-pullim-blue-700 font-bold">힌트 {i + 1} · </span>
              {h}
            </div>
          ))}
          {hintCount < maxHints ? (
            <button
              type="button"
              onClick={() => setHintCount(c => c + 1)}
              className="border-pullim-blue-200 text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-bold transition-colors"
            >
              💡 {hintCount === 0 ? '힌트 보기' : '힌트 더 보기'} ({hintCount}/{maxHints})
            </button>
          ) : (
            <p className="text-pullim-slate-400 text-xs">
              {scope >= 5
                ? '힌트를 다 봤어. 이제 직접 골라봐!'
                : `지금은 힌트 ${maxHints}개까지 (L${scope}) — 나머지는 직접 도전!`}
            </p>
          )}
        </div>
      )}

      {/* B5: 확신도 — 보기 선택 후 제출 전 노출. toggle-button 그룹(가짜 radiogroup 금지). optional. */}
      {!submitted && selected !== undefined && (
        <div className="mt-2.5">
          <p className="text-pullim-slate-600 mb-1.5 text-sm font-bold">얼마나 확신해? (선택)</p>
          <div role="group" aria-label="확신도" className="flex flex-wrap gap-1.5">
            {CONFIDENCE_OPTIONS.map(opt => {
              const on = confidence === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setConfidence(prev => (prev === opt.value ? undefined : opt.value))}
                  className={cn(
                    'focus-visible:ring-pullim-blue-400 inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2',
                    on
                      ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                      : 'border-pullim-slate-200 bg-white text-pullim-slate-700 hover:border-pullim-slate-400',
                  )}
                >
                  <span aria-hidden>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          type="button"
          disabled={selected === undefined}
          onClick={() => { setSubmitted(true); onCardReveal(); }}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 mt-2.5 w-full rounded-lg px-3 py-2.5 text-base font-bold text-white transition-colors"
        >
          제출하기
        </button>
      ) : (
        <div className="mt-2.5 space-y-2">
          {/* B5: 확신도 보정 배너 — confidence 선택 시만. wrong+sure 도 danger 아닌 neutral 코칭. */}
          {confidence && (() => {
            const fb = getCalibrationFeedback(correct, confidence);
            const optEmoji = CONFIDENCE_OPTIONS.find(o => o.value === confidence)?.emoji ?? '';
            return (
              <div className={cn('rounded-lg p-3 text-[15px]', CALIB_TONE_CLASS[fb.tone])}>
                <p className="font-bold">{optEmoji} {fb.title}</p>
                <p className="text-pullim-slate-700 mt-1 leading-relaxed">{fb.body}</p>
              </div>
            );
          })()}
          {/* 판정 + 처방 피드백 */}
          {correct ? (
            <div className="bg-pullim-blue-50 rounded-lg p-3 text-[15px]">
              <p className="text-pullim-blue-700 font-bold">🎉 정답이에요!</p>
              <p className="text-pullim-slate-700 mt-1 leading-relaxed">{quiz.explain}</p>
            </div>
          ) : (
            <div className="bg-pullim-danger-bg rounded-lg p-3 text-[15px]">
              <p className="text-pullim-danger font-bold">아쉽지만 다시 볼까요?</p>
              <p className="text-pullim-slate-700 mt-1 leading-relaxed">{quiz.optionFeedback[selected ?? 0]}</p>
              <p className="text-pullim-slate-600 mt-1.5 text-sm leading-relaxed">
                <span className="text-pullim-blue-700 font-bold">정답 · </span>
                {quiz.explain}
              </p>
            </div>
          )}
          {/* 처방 액션 */}
          <div className="flex flex-wrap gap-1.5">
            {!correct && quiz.relatedConceptId && (
              <button
                type="button"
                onClick={() => dispatchLesson(botId, 'concept-detail', quiz.relatedConceptId)}
                className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors"
              >
                📘 개념 다시 보기
              </button>
            )}
            {!correct && (
              <button
                type="button"
                onClick={reset}
                className="bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
              >
                ↻ 다시 풀기
              </button>
            )}
            {correct && (
              <button
                type="button"
                onClick={() => dispatchLesson(botId, 'next')}
                className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors"
              >
                다음 개념 →
              </button>
            )}
            {correct && (
              <button
                type="button"
                onClick={() => dispatchLesson(botId, 'self-explain', quiz.relatedConceptId)}
                className="border-pullim-blue-200 text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-bold transition-colors"
              >
                🗣 내 말로 설명
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 자기설명 카드 (B4) ─── */

type ExplainGrade = 'strong' | 'partial' | 'weak';

/**
 * 자기설명 채점 — 키워드 부분일치 비율(대소문자 무시).
 * ratio ≥0.6 'strong' / ≥0.3 'partial' / else 'weak'. 빈 문자열·키워드 0개 → 'weak'.
 * 순수함수 — 단위 테스트용 export.
 */
export function scoreExplanation(value: string, keywords: string[]): ExplainGrade {
  const text = value.trim().toLowerCase();
  if (!text || keywords.length === 0) return 'weak';
  const hits = keywords.filter(k => text.includes(k.trim().toLowerCase())).length;
  const ratio = hits / keywords.length;
  if (ratio >= 0.6) return 'strong';
  if (ratio >= 0.3) return 'partial';
  return 'weak';
}

/**
 * 자기설명 카드 — textarea 입력 → 제출 → 등급별 피드백 + 모범답안 + 처방.
 * 색: strong/partial=blue, weak=slate (빨강 미사용). InlineQuiz 와 동형.
 */
function SelfExplainCard({ prompt, botId, onCardReveal }: { prompt: SelfExplainPrompt; botId: string; onCardReveal: () => void }) {
  const dispatchLesson = useLessonActionStore(s => s.dispatch);
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const grade = submitted ? scoreExplanation(value, prompt.keywords) : null;
  const feedbackText =
    grade === 'strong' ? prompt.feedbackStrong
    : grade === 'partial' ? prompt.feedbackPartial
    : grade === 'weak' ? prompt.feedbackWeak
    : '';
  const positive = grade === 'strong' || grade === 'partial';

  function reset() {
    setValue('');
    setSubmitted(false);
  }

  return (
    <div className="bg-card border-pullim-slate-200 rounded-xl border p-3">
      <p className="text-pullim-slate-900 text-base font-bold">{prompt.prompt}</p>
      <textarea
        value={value}
        rows={3}
        onChange={e => setValue(e.target.value)}
        disabled={submitted}
        aria-label="자기설명 입력"
        placeholder="배운 걸 네 말로 적어봐…"
        className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 mt-2.5 w-full resize-none rounded-lg border px-3 py-2 text-[15px] leading-relaxed outline-none disabled:opacity-70"
      />
      {!submitted ? (
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => { setSubmitted(true); onCardReveal(); }}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-50 mt-2.5 w-full rounded-lg px-3 py-2.5 text-base font-bold text-white transition-colors"
        >
          설명 제출하기
        </button>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div
            aria-live="polite"
            className={cn(
              'rounded-lg p-3 text-[15px] leading-relaxed',
              positive ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-slate-50 text-pullim-slate-700',
            )}
          >
            <p className="font-bold">{feedbackText}</p>
          </div>
          <div className="bg-pullim-slate-50 text-pullim-slate-700 rounded-lg p-3 text-sm leading-relaxed">
            <span className="text-pullim-blue-700 font-bold">모범 답안 · </span>
            {prompt.sampleAnswer}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!positive ? (
              <>
                <button
                  type="button"
                  onClick={() => dispatchLesson(botId, 'concept-detail', prompt.conceptId)}
                  className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors"
                >
                  📘 개념 다시 보기
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
                >
                  ↻ 다시 쓰기
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => dispatchLesson(botId, 'next')}
                className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors"
              >
                다음 개념 →
              </button>
            )}
          </div>
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

/* ─── A5 스크린리더 접근성 ─── */

/**
 * 봇 turn → 스크린리더 announce 문구. 짧게 truncate(전문 금지 — SR 이 본문 DOM 도 읽으므로
 * live region 에 전문을 또 넣으면 이중 낭독·장황). 카드류는 종류만, 텍스트 turn 은 1줄 요약.
 * quiz-runner.tsx:146 의 role=status 규약과 정렬(짧은 상태 문구).
 */
export function plainAnnounceText(turn: Turn): string {
  switch (turn.kind) {
    case 'quiz':
      return '퀴즈가 도착했어요';
    case 'concept':
    case 'concept-detail':
      return '개념 설명이 도착했어요';
    case 'example':
    case 'explain-step':
      return '예제가 도착했어요';
    case 'summary':
      return '오늘 정리가 도착했어요';
    case 'self-explain':
      return '자기설명 요청이 도착했어요';
    case 'problem-card':
      return '문제 카드가 도착했어요';
    default: {
      // text/lesson-intro 등 — 마크다운 strip 후 첫 줄/1문장 요약(truncate).
      const plain = stripMarkdown(turn.text);
      const firstLine = plain.split('\n')[0]?.trim() ?? '';
      const sentence = firstLine.split(/(?<=[.!?。？！])\s/)[0] ?? firstLine;
      const summary = sentence.length > 60 ? `${sentence.slice(0, 60)}…` : sentence;
      return summary ? `새 메시지: ${summary}` : '새 메시지가 도착했어요';
    }
  }
}

/** 간이 마크다운 strip — bold/italic/code/link 마커 제거(announce 용 평문화). */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>]/g, '')
    .trim();
}

/**
 * 격리된 sr-only live region (A5). announce 텍스트를 자체 state 로 들고,
 * 부모(ChatPanel)는 announceRef.current 로 setter 만 받아 호출 → ChatPanel/turns.map 리렌더 회피.
 * quiz-runner.tsx:146 의 role=status·aria-live=polite·aria-atomic 패턴. 항상 mount.
 */
function SrLiveRegion({ announceRef }: { announceRef: React.MutableRefObject<((text: string) => void) | null> }) {
  // seq: announce 마다 단조 증가. 같은 문구가 연속 와도 렌더 문자열이 달라지도록
  // 안 보이는 trailing NBSP 를 toggle → SR 이 DOM 변화를 감지해 재낭독.
  const [{ text, seq }, setState] = useState({ text: '', seq: 0 });
  const announce = useCallback((next: string) => setState(prev => ({ text: next, seq: prev.seq + 1 })), []);
  // 부모가 호출할 imperative setter 를 ref 에 등록(mount/unmount 생명주기 동기화).
  useEffect(() => {
    announceRef.current = announce;
    return () => {
      if (announceRef.current === announce) announceRef.current = null;
    };
  }, [announceRef, announce]);
  // 가시/낭독 내용은 메시지 그대로, 보이지 않는 NBSP 만 toggle 되어 연속 동일 문구도 재낭독.
  const rendered = text ? text + ' '.repeat(seq % 2) : text;
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {rendered}
    </div>
  );
}
