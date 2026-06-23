'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Radio, Mic, MessageCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { type ClassBot, getLiveContent } from '@/lib/mock';
import { useCurrentUser } from '@/lib/current-user';
import { useLiveStore, type PendingQuestion } from '@/lib/store/live';
import { LiveQuizCard } from './live-quiz-card';
import { cn } from '@/lib/utils';

/**
 * 라이브 컴팩트 바 — 챗 상단에 얇게 얹히는 접이식 라이브 요약 ([04 § 9.x] 챗 우선 레이아웃).
 * - 기본 접힘: LIVE 뱃지 · 슬라이드 위치 · 실시간 자막 한 줄 ticker 만 노출해 챗을 위로 끌어올린다.
 * - 펼치면 슬라이드·자막 전체·즉석 퀴즈·선생님 질문 패널이 모두 보인다 (중첩 스크롤 없이 패널 내부 스크롤).
 */
export function LiveCompactBar({ bot }: { bot: ClassBot }) {
  const session = useLiveStore(s => s.active[bot.id]);
  const [expanded, setExpanded] = useState(false);
  const content = getLiveContent(bot.id);
  if (!session) return null;

  return (
    <div
      className="border-pullim-slate-100 border-b"
      data-slot="live-compact-bar"
      data-expanded={expanded ? 'true' : 'false'}
    >
      {/* 요약 행 — 항상 노출 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="bg-pullim-danger inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-bold tracking-wider text-white uppercase">
          <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
          LIVE
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-900 truncate text-2xs font-bold">
            {content ? `슬라이드 ${session.currentSlide}/${content.slideTotal} · ${content.slideTitle}` : '라이브 진행 중'}
          </div>
          <LiveCaptionTicker botId={bot.id} startedAt={session.startedAt} />
        </div>
        <span className="bg-pullim-blue-50 text-pullim-blue-700 hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold sm:inline-flex">
          <Zap className="h-3 w-3" />
          즉석 퀴즈
        </span>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-controls="live-expanded-panel"
          className="text-pullim-slate-600 hover:bg-pullim-slate-100 hover:text-pullim-slate-900 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-2xs font-bold transition-colors"
        >
          {expanded ? '접기' : '라이브 수업 펼치기'}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 펼침 패널 — 슬라이드·자막·즉석 퀴즈·선생님 질문 전체 */}
      {expanded && (
        <div
          id="live-expanded-panel"
          className="bg-pullim-slate-50/50 max-h-[55vh] space-y-3 overflow-y-auto p-3"
        >
          <SlideAudioArea botId={bot.id} currentSlide={session.currentSlide} />
          <TranscriptStream botId={bot.id} startedAt={session.startedAt} />
          <LiveQuizCard />
          <StudentQuestionPanel botId={bot.id} />
        </div>
      )}
    </div>
  );
}

/** 컴팩트 바용 — 최신 자막 한 줄 ticker (2초 간격 갱신) */
function LiveCaptionTicker({ botId, startedAt }: { botId: string; startedAt: string }) {
  const content = getLiveContent(botId);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);
  if (!content) return null;
  const elapsedSec = now === null ? 0 : Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const visible = content.transcript.filter(t => t.atSec <= elapsedSec);
  const last = visible[visible.length - 1];
  return (
    <p className="text-pullim-slate-500 truncate text-micro">
      <Radio className="text-pullim-danger mr-1 inline-block h-2.5 w-2.5 align-[-1px]" aria-hidden />
      {last ? last.text : '자막 대기 중… (선생님 발화 시작 곧)'}
    </p>
  );
}

/** 헤더에 표시할 라이브 진행 메타 (경과 시간) */
export function LiveHeaderMeta({ bot }: { bot: ClassBot }) {
  const session = useLiveStore(s => s.active[bot.id]);
  if (!session) return null;
  return (
    <div className="bg-pullim-danger/15 border-pullim-danger/40 mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-micro font-bold">
      <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-white uppercase tracking-wider">
        <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
        LIVE
      </span>
      <ElapsedTime startedAt={session.startedAt} />
      <span className="text-pullim-lemon">· 스코프 자동 잠금</span>
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  // SSR/CSR 시간 mismatch 방지 — 마운트 후에만 계산
  const [elapsedMin, setElapsedMin] = useState<number | null>(null);
  useEffect(() => {
    setElapsedMin(Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
    const id = setInterval(() => {
      setElapsedMin(Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
    }, 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (elapsedMin === null) return <span className="text-white/90">진행 중</span>;
  return <span className="text-white/90">{elapsedMin}분 진행 중</span>;
}

function SlideAudioArea({ botId, currentSlide }: { botId: string; currentSlide: number }) {
  const content = getLiveContent(botId);
  if (!content) {
    return (
      <section className="bg-card rounded-2xl border p-6 text-center">
        <p className="text-pullim-slate-500 text-sm">이 봇의 라이브 콘텐츠가 아직 준비되지 않았어요.</p>
      </section>
    );
  }
  return (
    <section className="bg-card rounded-2xl border overflow-hidden">
      <div className="bg-pullim-slate-100 aspect-[16/10] relative flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white border-pullim-slate-200 mx-auto inline-block rounded-lg border px-5 py-4 shadow-sm">
            <p className="text-pullim-blue-700 mb-2 text-xs font-bold uppercase tracking-wider">
              슬라이드 {currentSlide} / {content.slideTotal}
            </p>
            <p className="text-pullim-slate-900 text-sm font-bold">{content.slideTitle}</p>
            <p className="text-pullim-slate-500 mt-1 text-2xs font-mono">{content.slideSubtitle}</p>
          </div>
        </div>
        <span className="bg-pullim-danger absolute top-2 left-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-bold tracking-wider text-white uppercase">
          <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
          LIVE
        </span>
      </div>
      <div className="bg-pullim-slate-900 text-white flex items-center gap-2 px-3 py-2 text-xs">
        <Mic className="text-pullim-blue-400 h-3.5 w-3.5 animate-pulse" />
        <span className="text-white/90 font-bold">{content.micLabel}</span>
        <span className="text-white/50 ml-auto font-mono text-micro">live · 음성+슬라이드</span>
      </div>
    </section>
  );
}

function TranscriptStream({ botId, startedAt }: { botId: string; startedAt: string }) {
  const content = getLiveContent(botId);
  // SSR 시점엔 now=null → 자막 빈 상태. 마운트 후 실제 시각으로 계산.
  const [now, setNow] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = now === null ? 0 : Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const visible = content ? content.transcript.filter(t => t.atSec <= elapsedSec).slice(-30) : [];

  // hooks 룰: early return 보다 위에 위치 — content 없으면 visible.length=0 으로 no-op scroll.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visible.length]);

  if (!content) return null;

  const currentLineIdx = visible.length - 1;

  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2">
        <Radio className="text-pullim-danger h-3.5 w-3.5 animate-pulse" />
        <h2 className="text-pullim-slate-900 text-xs font-bold">실시간 자막</h2>
        <span className="text-pullim-slate-400 ml-auto text-micro">STT · 1~3s 지연</span>
      </header>
      <div ref={scrollRef} className="max-h-48 space-y-1.5 overflow-y-auto p-3 text-xs leading-relaxed">
        {visible.length === 0 ? (
          <p className="text-pullim-slate-400 text-center py-4 text-2xs">자막 대기 중… (선생님 발화 시작 곧)</p>
        ) : visible.map((l, i) => (
          <p
            key={`${l.atSec}-${i}`}
            className={cn(
              'transition-colors',
              i === currentLineIdx ? 'text-pullim-slate-900 font-medium' : 'text-pullim-slate-500',
              l.speaker === 'bot' && 'text-pullim-blue-700 font-medium',
            )}
          >
            {l.text}
          </p>
        ))}
      </div>
    </section>
  );
}

function StudentQuestionPanel({ botId }: { botId: string }) {
  const [text, setText] = useState('');
  const submit = useLiveStore(s => s.submitQuestion);
  const session = useLiveStore(s => s.active[botId]);
  const studentName = useCurrentUser().name;
  const myQuestions = (session?.pendingQuestions ?? []).filter(q => q.studentName === studentName);

  function handleSubmit() {
    const t = text.trim();
    if (!t) return;
    submit(botId, studentName, t);
    setText('');
  }

  return (
    <section className="bg-card rounded-2xl border p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <MessageCircle className="text-pullim-blue-500 h-3.5 w-3.5" />
        <h2 className="text-pullim-slate-900 text-xs font-bold">선생님에게 질문</h2>
        <span className="text-pullim-slate-400 ml-auto text-micro">{studentName} 이름으로 전달돼요</span>
      </header>
      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 120))}
          placeholder="궁금한 점을 짧게 (최대 120자)"
          className="border-pullim-slate-200 focus:border-pullim-blue-500 flex-1 rounded-lg border px-3 py-2 text-xs outline-none"
          aria-label="질문 입력"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-40 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
          aria-label="선생님에게 질문 보내기"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {myQuestions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {myQuestions.map(q => <QuestionStatusItem key={q.id} q={q} />)}
        </ul>
      )}
      <p className="text-pullim-slate-400 mt-2 text-micro">
        교사가 검토한 뒤 “전체 공유”하면 다른 학생에게도 보이고, “비공개”면 선생님과 1:1.
      </p>
    </section>
  );
}

function QuestionStatusItem({ q }: { q: PendingQuestion }) {
  return (
    <li
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-2xs',
        q.status === 'pending' && 'border-pullim-lemon bg-pullim-lemon/10 text-pullim-slate-800',
        q.status === 'shared'  && 'border-pullim-blue-300 bg-pullim-blue-50 text-pullim-blue-800',
        q.status === 'hidden'  && 'border-pullim-slate-200 bg-pullim-slate-50 text-pullim-slate-500',
      )}
    >
      <div className="font-bold">“{q.text}”</div>
      <div className="mt-0.5 text-micro">
        {q.status === 'pending' && '🟡 교사 검토 중…'}
        {q.status === 'shared'  && '🔵 전체 공유됨! 곧 답변 받으실 거예요.'}
        {q.status === 'hidden'  && '⚪ 비공개로 처리됨 (선생님 1:1 답변)'}
      </div>
    </li>
  );
}
