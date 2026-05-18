'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Radio, Mic, Users, MessageCircle, Eye, Lock } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { scopeMeta } from '@/lib/mock';
import { LiveQuizCard } from './live-quiz-card';
import { cn } from '@/lib/utils';

/**
 * 라이브 세션 통합 화면 — 학생 시점 (2026-05-18 신규).
 *
 * 4 영역:
 *  1. 슬라이드 + 음성 status (D1: 음성+슬라이드 only)
 *  2. 실시간 transcript (STT simulated stream)
 *  3. 학생 질문 submit (D2: 학생명 + 교사 모더레이션 후 broadcast)
 *  4. 즉석 퀴즈 (LiveQuizCard 재사용)
 *
 * + 라이브 봇 채팅 보조 (간략)
 */

type TranscriptLine = { id: number; speaker: 'teacher' | 'bot'; text: string };

// 시뮬레이션 — 실 환경에선 STT WebSocket
const TRANSCRIPT_SCRIPT: Omit<TranscriptLine, 'id'>[] = [
  { speaker: 'teacher', text: '오늘은 도함수 활용 중에서 극값 판정을 다뤄볼게요.' },
  { speaker: 'teacher', text: '먼저 f\'(x) = 0인 x를 찾는 것부터 시작합니다.' },
  { speaker: 'teacher', text: '여기서 부호가 바뀌면 극값이고, 안 바뀌면 극값이 아니에요.' },
  { speaker: 'bot',     text: '[봇 정리] + → − 면 극대, − → + 면 극소.' },
  { speaker: 'teacher', text: '슬라이드 12를 봐주세요. 예시 함수가 있죠.' },
  { speaker: 'teacher', text: '여러분이 직접 부호 변화 표를 그려보세요. 3분 드립니다.' },
  { speaker: 'bot',     text: '[봇] 시간 안내 — 3분 타이머 시작.' },
  { speaker: 'teacher', text: '하윤 학생이 좋은 질문을 줬어요. 전체에 공유합니다.' },
  { speaker: 'teacher', text: '"f\'(x)=0이면 무조건 극값인가요?" — 좋은 의문이죠.' },
  { speaker: 'teacher', text: '답은 No. 부호 변화가 핵심이에요.' },
];

type StudentQuestion = {
  id: string;
  text: string;
  status: 'pending' | 'shared' | 'hidden';
  submittedAt: number;
};

export function LiveSessionPanel({ bot }: { bot: ClassBot }) {
  const scope = scopeMeta[bot.scope];

  return (
    <div className="space-y-3 pb-20">
      {/* 헤더 */}
      <header className="bg-gradient-to-br from-pullim-blue-700 to-pullim-blue-900 text-white relative overflow-hidden rounded-2xl p-4">
        <Link
          href="/classbot"
          className="text-white/80 hover:text-white inline-flex items-center gap-1 text-xs"
        >
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
              <span className="text-white/80 text-[11px]">{bot.currentLesson?.startedAt}~</span>
            </div>
            <h1 className="mt-1 text-lg font-bold leading-tight">{bot.currentLesson?.title}</h1>
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

      {/* 영역 1: 슬라이드 + 음성 status (D1 음성+슬라이드 only) */}
      <SlideAudioArea />

      {/* 영역 2: 실시간 transcript */}
      <TranscriptStream />

      {/* 영역 4: 즉석 퀴즈 */}
      <LiveQuizCard />

      {/* 영역 3: 학생 질문 submit (D2 모더레이션) */}
      <StudentQuestionPanel />

      {/* 보조: 라이브 봇 채팅 안내 */}
      <section className="bg-card rounded-2xl border p-3 text-center text-[11px]">
        <p className="text-pullim-slate-600">
          개념 질문은 봇에게 직접도 가능 —{' '}
          <Link href="/classbot/chat" className="text-pullim-blue-600 font-bold underline">
            봇 채팅 열기 →
          </Link>
        </p>
        <p className="text-pullim-slate-400 mt-0.5 text-[10px]">
          라이브 동안엔 짧은 응답만 받아요. 답까지는 22시 이후.
        </p>
      </section>
    </div>
  );
}

/* ─── 영역 1: 슬라이드 + 음성 ─── */
function SlideAudioArea() {
  const [slideNo, setSlideNo] = useState(12);
  useEffect(() => {
    const id = setInterval(() => setSlideNo(n => Math.min(30, n + 1)), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="bg-card rounded-2xl border overflow-hidden">
      <div className="bg-pullim-slate-100 aspect-[16/10] relative flex items-center justify-center">
        {/* 슬라이드 placeholder */}
        <div className="text-center">
          <div className="bg-white border-pullim-slate-200 mx-auto inline-block rounded-lg border px-5 py-4 shadow-sm">
            <p className="text-pullim-blue-700 mb-2 text-xs font-bold uppercase tracking-wider">
              슬라이드 {slideNo} / 30
            </p>
            <p className="text-pullim-slate-900 text-sm font-bold">도함수 부호 변화</p>
            <p className="text-pullim-slate-500 mt-1 text-[11px] font-mono">f&apos;(x) = 0 → 부호 표 → 극값 판정</p>
          </div>
        </div>
        <span className="bg-pullim-danger absolute top-2 left-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
          <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
          LIVE
        </span>
      </div>
      <div className="bg-pullim-slate-900 text-white flex items-center gap-2 px-3 py-2 text-xs">
        <Mic className="text-pullim-blue-400 h-3.5 w-3.5 animate-pulse" />
        <span className="text-white/90 font-bold">선생님 음성 ON</span>
        <span className="text-white/50 ml-auto font-mono text-[10px]">live · 음성+슬라이드 only</span>
      </div>
    </section>
  );
}

/* ─── 영역 2: 실시간 transcript stream ─── */
function TranscriptStream() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const idxRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const i = idxRef.current;
      if (i >= TRANSCRIPT_SCRIPT.length) return;
      setLines(prev => [...prev.slice(-29), { ...TRANSCRIPT_SCRIPT[i], id: i }]);
      idxRef.current = i + 1;
    };
    tick(); // first immediately
    const id = setInterval(tick, 3_500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const currentId = lines[lines.length - 1]?.id;

  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 flex items-center gap-1.5 border-b px-3 py-2">
        <Radio className="text-pullim-danger h-3.5 w-3.5 animate-pulse" />
        <h2 className="text-pullim-slate-900 text-xs font-bold">실시간 자막</h2>
        <span className="text-pullim-slate-400 ml-auto text-[10px]">STT · 1~3s 지연</span>
      </header>
      <div ref={scrollRef} className="max-h-48 space-y-1.5 overflow-y-auto p-3 text-[12px] leading-relaxed">
        {lines.length === 0 ? (
          <p className="text-pullim-slate-400 text-center py-4 text-[11px]">자막 대기 중…</p>
        ) : lines.map(l => (
          <p
            key={l.id}
            className={cn(
              'transition-colors',
              l.id === currentId ? 'text-pullim-slate-900 font-medium' : 'text-pullim-slate-500',
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

/* ─── 영역 3: 학생 질문 submit (D2 모더레이션) ─── */
function StudentQuestionPanel() {
  const [text, setText] = useState('');
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const studentName = '서연';

  function submit() {
    const t = text.trim();
    if (!t) return;
    const q: StudentQuestion = {
      id: 'q_' + Date.now(),
      text: t,
      status: 'pending',
      submittedAt: Date.now(),
    };
    setQuestions(prev => [q, ...prev]);
    setText('');
    // 시뮬 — 4~8초 후 교사가 '전체 공유' 결정 (랜덤)
    setTimeout(() => {
      setQuestions(prev =>
        prev.map(p => p.id === q.id ? { ...p, status: Math.random() > 0.3 ? 'shared' : 'hidden' } : p)
      );
    }, 4000 + Math.random() * 4000);
  }

  return (
    <section className="bg-card rounded-2xl border p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <MessageCircle className="text-pullim-blue-500 h-3.5 w-3.5" />
        <h2 className="text-pullim-slate-900 text-xs font-bold">선생님에게 질문</h2>
        <span className="text-pullim-slate-400 ml-auto text-[10px]">{studentName} 이름으로 전달돼요</span>
      </header>
      <form
        onSubmit={e => { e.preventDefault(); submit(); }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 120))}
          placeholder="궁금한 점을 짧게 적어주세요. (최대 120자)"
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

      {questions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {questions.map(q => (
            <li
              key={q.id}
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
          ))}
        </ul>
      )}
      <p className="text-pullim-slate-400 mt-2 text-[10px]">
        교사가 검토한 뒤 "전체 공유"하면 다른 학생에게도 보이고, "비공개"면 선생님과만 1:1.
      </p>
    </section>
  );
}
