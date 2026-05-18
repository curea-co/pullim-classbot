'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Radio, PlayCircle, StopCircle, ChevronLeft, ChevronRight, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { type ClassBot, getLiveContent } from '@/lib/mock';
import { useLiveStore } from '@/lib/store/live';
import { useReplayStore } from '@/lib/store/replay';
import { cn } from '@/lib/utils';

/**
 * 교사 라이브 broadcasting 컨트롤.
 * - 라이브 시작/종료 버튼 (mutually exclusive)
 * - 진행 중: 슬라이드 ←/→ + 학생 질문 모더레이션 큐
 * - 종료 시: liveStore.end → replayStore.createFromLive (processing) + 2초 후 review로 promote
 */
export function LiveBroadcastControls({ bot }: { bot: ClassBot }) {
  const router = useRouter();
  const session = useLiveStore(s => s.active[bot.id]);
  const start = useLiveStore(s => s.start);
  const end = useLiveStore(s => s.end);
  const advance = useLiveStore(s => s.advanceSlide);
  const moderate = useLiveStore(s => s.moderateQuestion);
  const createFromLive = useReplayStore(s => s.createFromLive);
  const promoteToReview = useReplayStore(s => s.promoteToReview);
  const isLive = Boolean(session);
  const content = getLiveContent(bot.id);

  function handleStart() {
    start(bot.id);
    toast.success('🔴 라이브 시작', {
      description: `${bot.name} — 학생들이 진입 가능. 슬라이드·자막·퀴즈·질문 모두 라이브.`,
      duration: 3000,
    });
  }

  function handleEnd() {
    const result = end(bot.id);
    if (!result) return;
    const { endedSession, pendingReplayId } = result;
    // 라이브 데이터로 리플레이 processing 생성
    const startTime = new Date(endedSession.startedAt);
    const durationMin = Math.max(1, Math.round((Date.now() - startTime.getTime()) / 60_000));
    const startedAtLabel = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    createFromLive({
      id: pendingReplayId,
      lessonId: 'les_live_' + Date.now().toString(36),
      botId: bot.id,
      classroom: bot.currentLesson?.title ?? bot.subject,
      title: bot.currentLesson?.title ?? content?.slideTitle ?? '라이브 수업',
      chapter: content?.slideSubtitle ?? bot.subject,
      botName: bot.name,
      date: new Date().toISOString().slice(0, 10),
      startedAt: startedAtLabel,
      endedAt: '방금',
      durationMin,
      participantCount: bot.currentLesson?.studentCount ?? 0,
      status: 'processing',
      keyTakeaways: content?.keyTakeaways ?? [],
    });
    toast.success('🛑 라이브 종료 → 리플레이 처리 중', {
      description: 'AI가 핵심 메시지 추출 중 (2초). 완료 후 검수 큐로 이동해요.',
      duration: 4000,
    });
    // 2초 후 review로 자동 promote (AI 처리 완료 시뮬레이션)
    setTimeout(() => {
      promoteToReview(pendingReplayId);
      toast.info('🤖 AI 처리 완료 → 검수 대기', {
        description: '리플레이 큐에서 핵심 메시지 확인 후 학생 발송하세요.',
        action: { label: '검수하기', onClick: () => router.push(`/teacher/replay/${pendingReplayId}`) },
        duration: 6000,
      });
    }, 2000);
  }

  if (!isLive) {
    return (
      <section className="bg-card rounded-2xl border p-4">
        <header className="mb-2 flex items-center gap-2">
          <Radio className="text-pullim-slate-400 h-4 w-4" />
          <h2 className="text-pullim-slate-900 text-sm font-bold">라이브 수업</h2>
          <span className="text-pullim-slate-400 ml-auto text-[10px]">현재 대기</span>
        </header>
        <p className="text-pullim-slate-600 text-xs">
          시작하면 학생 홈에 LIVE 카드가 노출되고, <strong>{bot.name}</strong>의 봇 scope이 라이브 정책({bot.scope === 3 ? 'L3 · 개념까지' : `L${bot.scope}`})으로 자동 잠겨요.
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="bg-pullim-danger hover:opacity-90 mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
        >
          <PlayCircle className="h-4 w-4" />
          라이브 시작
        </button>
      </section>
    );
  }

  return (
    <section className="bg-pullim-slate-900 text-pullim-slate-200 rounded-2xl p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
          <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
          LIVE
        </span>
        <h2 className="text-white text-sm font-bold">라이브 진행 중</h2>
        <button
          type="button"
          onClick={handleEnd}
          className="bg-white/10 hover:bg-white/20 text-white ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
        >
          <StopCircle className="h-3.5 w-3.5" />
          수업 종료
        </button>
      </header>

      {/* 슬라이드 컨트롤 */}
      <div className="bg-white/5 rounded-lg p-2.5">
        <div className="text-pullim-slate-400 text-[10px] font-bold uppercase tracking-wider">현재 슬라이드</div>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => advance(bot.id, -1)}
            className="bg-white/10 hover:bg-white/20 inline-flex h-7 w-7 items-center justify-center rounded-md"
            aria-label="이전 슬라이드"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white" />
          </button>
          <span className="text-white font-mono text-lg font-bold flex-1 text-center">
            {session?.currentSlide ?? 1} / {content?.slideTotal ?? '?'}
          </span>
          <button
            type="button"
            onClick={() => advance(bot.id, 1)}
            className="bg-white/10 hover:bg-white/20 inline-flex h-7 w-7 items-center justify-center rounded-md"
            aria-label="다음 슬라이드"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* 학생 질문 모더레이션 큐 */}
      <ModerationQueue botId={bot.id} />
    </section>
  );
}

function ModerationQueue({ botId }: { botId: string }) {
  const session = useLiveStore(s => s.active[botId]);
  const moderate = useLiveStore(s => s.moderateQuestion);
  const pendings = (session?.pendingQuestions ?? []).filter(q => q.status === 'pending');
  const handled = (session?.pendingQuestions ?? []).filter(q => q.status !== 'pending');

  return (
    <div className="mt-3">
      <div className="text-pullim-slate-400 mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
        <MessageCircle className="h-3 w-3" />
        학생 질문 큐
        <span className="text-pullim-lemon ml-1">{pendings.length}건 대기</span>
      </div>

      {pendings.length === 0 && handled.length === 0 && (
        <p className="text-pullim-slate-500 bg-white/5 rounded-lg p-2.5 text-center text-[11px]">
          학생 질문 대기 중…
        </p>
      )}

      <ul className="space-y-1.5">
        {pendings.map(q => (
          <li key={q.id} className="bg-pullim-lemon/10 border-pullim-lemon/40 rounded-lg border p-2 text-[11px]">
            <div className="text-white font-bold">
              <span className="text-pullim-lemon mr-1">{q.studentName}</span>
              {q.text}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => moderate(botId, q.id, 'shared')}
                className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-white"
              >
                <Eye className="h-3 w-3" />
                전체 공유
              </button>
              <button
                type="button"
                onClick={() => moderate(botId, q.id, 'hidden')}
                className="bg-white/10 hover:bg-white/20 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-white"
              >
                <EyeOff className="h-3 w-3" />
                비공개
              </button>
            </div>
          </li>
        ))}
        {handled.slice(0, 3).map(q => (
          <li key={q.id} className="bg-white/5 rounded-lg p-1.5 text-[10px] text-pullim-slate-400">
            <span className={cn('mr-1', q.status === 'shared' ? 'text-pullim-blue-400' : 'text-pullim-slate-500')}>
              {q.status === 'shared' ? '🔵 공유' : '⚪ 비공개'}
            </span>
            <span className="text-pullim-slate-300">{q.studentName}: {q.text.slice(0, 30)}{q.text.length > 30 && '…'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
