'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Radio, Mic, MessageCircle, Lock, History } from 'lucide-react';
import { type ClassBot, scopeMeta, getLiveContent, currentPersona } from '@/lib/mock';
import { useLiveStore, type PendingQuestion } from '@/lib/store/live';
import { LiveQuizCard } from './live-quiz-card';
import { cn } from '@/lib/utils';

/**
 * 학생 라이브 세션 화면 — liveStore 활성 봇만 진입 가능.
 * 비활성 봇은 "라이브 진행 중 아님" 빈 상태.
 *
 * 데이터 소스:
 *  - liveStore.active[botId] — 시작 시각·슬라이드·질문 큐
 *  - liveContents[botId] — 봇별 transcript·슬라이드 메타 mock
 */

export function LiveSessionPanel({ bot }: { bot: ClassBot }) {
  const session = useLiveStore(s => s.active[bot.id]);
  if (!session) return <LiveInactiveState bot={bot} />;
  return <LiveActiveSession bot={bot} />;
}

/* ─── 비활성 빈 상태 ─── */
function LiveInactiveState({ bot }: { bot: ClassBot }) {
  return (
    <div className="space-y-3 pb-20">
      <Link href="/classbot" className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs">
        <ArrowLeft className="h-3 w-3" />
        홈으로
      </Link>
      <section className="bg-card mt-3 rounded-2xl border p-8 text-center">
        <div className="bg-pullim-slate-100 mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl">
          {bot.avatarEmoji}
        </div>
        <h1 className="text-pullim-slate-900 mt-3 text-base font-bold">{bot.name} 라이브 진행 중이 아니에요</h1>
        <p className="text-pullim-slate-500 mt-1 text-xs">
          선생님이 라이브 수업을 시작하면 여기로 자동 진입할 수 있어요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/classbot/chat"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold text-white"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            봇 채팅으로 가기
          </Link>
          <Link
            href="/classbot/replay"
            className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold"
          >
            <History className="h-3.5 w-3.5" />
            지난 리플레이
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─── 활성 라이브 진행 ─── */
function LiveActiveSession({ bot }: { bot: ClassBot }) {
  const session = useLiveStore(s => s.active[bot.id])!;
  const scope = scopeMeta[bot.scope];
  const content = getLiveContent(bot.id);

  return (
    <div className="space-y-3 pb-20">
      <header className="bg-gradient-to-br from-pullim-blue-700 to-pullim-blue-900 text-white relative overflow-hidden rounded-2xl p-4">
        <Link href="/classbot" className="text-white/80 hover:text-white inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" />
          홈으로
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span className="bg-white/20 backdrop-blur flex h-12 w-12 items-center justify-center rounded-xl text-2xl">
            {bot.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
                LIVE
              </span>
              <ElapsedTime startedAt={session.startedAt} />
            </div>
            <h1 className="mt-1 text-lg font-bold leading-tight">{bot.currentLesson?.title ?? content?.slideTitle}</h1>
            <p className="text-white/80 text-[11px]">
              {bot.name} · {bot.teacherName} · {bot.currentLesson?.studentCount}명 참여
            </p>
          </div>
        </div>
        <div className="bg-white/10 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
          <Lock className="text-pullim-lemon h-3 w-3" />
          <span className="text-white/90">
            라이브 동안 봇은 <strong className="text-pullim-lemon font-mono">{scope.short}</strong>({scope.label})로 자동 잠겨요.
          </span>
        </div>
      </header>

      <SlideAudioArea content={content} currentSlide={session.currentSlide} />
      <TranscriptStream botId={bot.id} startedAt={session.startedAt} />
      <LiveQuizCard />
      <StudentQuestionPanel botId={bot.id} />

      <section className="bg-card rounded-2xl border p-3 text-center text-[11px]">
        <p className="text-pullim-slate-600">
          개념 질문은 봇에게 직접도 가능 —{' '}
          <Link href="/classbot/chat" className="text-pullim-blue-600 font-bold underline">봇 채팅 열기 →</Link>
        </p>
      </section>
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsedMin, setElapsedMin] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedMin(Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000));
    }, 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span className="text-white/80 text-[11px]">{elapsedMin}분 진행 중</span>;
}

/* ─── 영역 1: 슬라이드 + 음성 ─── */
function SlideAudioArea({ content, currentSlide }: { content?: ReturnType<typeof getLiveContent>; currentSlide: number }) {
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
            <p className="text-pullim-slate-500 mt-1 text-[11px] font-mono">{content.slideSubtitle}</p>
          </div>
        </div>
        <span className="bg-pullim-danger absolute top-2 left-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
          <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
          LIVE
        </span>
      </div>
      <div className="bg-pullim-slate-900 text-white flex items-center gap-2 px-3 py-2 text-xs">
        <Mic className="text-pullim-blue-400 h-3.5 w-3.5 animate-pulse" />
        <span className="text-white/90 font-bold">{content.micLabel}</span>
        <span className="text-white/50 ml-auto font-mono text-[10px]">live · 음성+슬라이드 only</span>
      </div>
    </section>
  );
}

/* ─── 영역 2: 실시간 transcript stream ─── */
function TranscriptStream({ botId, startedAt }: { botId: string; startedAt: string }) {
  const content = getLiveContent(botId);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  if (!content) return null;

  const elapsedSec = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const visible = content.transcript.filter(t => t.atSec <= elapsedSec).slice(-30);
  const currentLineIdx = visible.length - 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visible.length]);

  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2">
        <Radio className="text-pullim-danger h-3.5 w-3.5 animate-pulse" />
        <h2 className="text-pullim-slate-900 text-xs font-bold">실시간 자막</h2>
        <span className="text-pullim-slate-400 ml-auto text-[10px]">STT · 1~3s 지연</span>
      </header>
      <div ref={scrollRef} className="max-h-48 space-y-1.5 overflow-y-auto p-3 text-[12px] leading-relaxed">
        {visible.length === 0 ? (
          <p className="text-pullim-slate-400 text-center py-4 text-[11px]">자막 대기 중… (선생님 발화 시작 곧)</p>
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

/* ─── 영역 3: 학생 질문 submit — liveStore 큐로 push ─── */
function StudentQuestionPanel({ botId }: { botId: string }) {
  const [text, setText] = useState('');
  const submit = useLiveStore(s => s.submitQuestion);
  const session = useLiveStore(s => s.active[botId]);
  const studentName = currentPersona.name;
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
        <span className="text-pullim-slate-400 ml-auto text-[10px]">{studentName} 이름으로 전달돼요</span>
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
          aria-label="질문 보내기"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {myQuestions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {myQuestions.map(q => <QuestionStatusItem key={q.id} q={q} />)}
        </ul>
      )}
      <p className="text-pullim-slate-400 mt-2 text-[10px]">
        교사가 검토한 뒤 "전체 공유"하면 다른 학생에게도 보이고, "비공개"면 선생님과 1:1.
      </p>
    </section>
  );
}

function QuestionStatusItem({ q }: { q: PendingQuestion }) {
  return (
    <li
      className={cn(
        'rounded-lg border px-2.5 py-1.5 text-[11px]',
        q.status === 'pending' && 'border-pullim-lemon bg-pullim-lemon/10 text-pullim-slate-800',
        q.status === 'shared'  && 'border-pullim-blue-300 bg-pullim-blue-50 text-pullim-blue-800',
        q.status === 'hidden'  && 'border-pullim-slate-200 bg-pullim-slate-50 text-pullim-slate-500',
      )}
    >
      <div className="font-bold">"{q.text}"</div>
      <div className="mt-0.5 text-[10px]">
        {q.status === 'pending' && '🟡 교사 검토 중…'}
        {q.status === 'shared'  && '🔵 전체 공유됨! 곧 답변 받으실 거예요.'}
        {q.status === 'hidden'  && '⚪ 비공개로 처리됨 (선생님 1:1 답변)'}
      </div>
    </li>
  );
}
