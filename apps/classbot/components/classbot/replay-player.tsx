'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, Bookmark, BookmarkPlus,
  Send, History, Lightbulb, Target, MessageCircle, Eye, Lock,
  type LucideIcon,
} from 'lucide-react';
import {
  type Replay, type ReplayBookmark, type ReplayTeacherQuestion,
  formatReplayTime,
} from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { heatColor } from '@/lib/tokens/heat-color';
import { Sparkbar } from '@/components/classbot/sparkbar';

const SPEEDS = [1, 1.25, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

const segmentMeta: Record<Replay['segments'][number]['type'], { label: string; color: string; icon: LucideIcon }> = {
  'concept':   { label: '개념',     color: 'bg-pullim-blue-400',  icon: Lightbulb },
  'quiz':      { label: '퀴즈',     color: 'bg-pullim-blue-600',  icon: Target },
  'student-q': { label: '내 질문',  color: 'bg-pullim-blue-700',  icon: MessageCircle },
  'sharing':   { label: '전체공유', color: 'bg-pullim-lemon',     icon: Eye },
  'attention': { label: '집중도',   color: 'bg-pullim-danger',    icon: Eye },
};

export function ReplayPlayer({ replay }: { replay: Replay }) {
  const totalSec = replay.durationMin * 60;
  const [now, setNow] = useState(() => Math.min(replay.watchProgress.lastSec, totalSec));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [bookmarks, setBookmarks] = useState<ReplayBookmark[]>(replay.bookmarks);
  const [questions, setQuestions] = useState<ReplayTeacherQuestion[]>(replay.teacherQuestions);
  const [questionDraft, setQuestionDraft] = useState('');

  // Tick — 100ms 간격으로 시간 흐름
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setNow(t => {
        const next = t + 0.1 * speed;
        if (next >= totalSec) {
          setPlaying(false);
          return totalSec;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, speed, totalSec]);

  const currentLineIdx = useMemo(
    () => replay.transcript.findIndex(t => now >= t.atSec && now < t.endSec),
    [now, replay.transcript],
  );
  const currentBinIdx = Math.min(replay.focusBins.length - 1, Math.max(0, Math.floor(now / 60)));
  const currentLine = currentLineIdx >= 0 ? replay.transcript[currentLineIdx] : null;
  const watchedLabel = replay.watchProgress.completed
    ? '다시 보기'
    : replay.watchProgress.lastSec > 0
      ? '이어 보기'
      : '처음 보기';

  function seek(sec: number) {
    setNow(Math.max(0, Math.min(sec, totalSec)));
  }

  function addBookmark() {
    const id = `bm_${Date.now()}`;
    setBookmarks(b => [
      ...b,
      { id, atSec: Math.floor(now), label: `${formatReplayTime(now)} 위치`, createdAt: '방금 전' },
    ]);
  }

  function sendQuestion() {
    const text = questionDraft.trim();
    if (!text) return;
    const id = `tq_${Date.now()}`;
    setQuestions(q => [...q, { id, atSec: Math.floor(now), text, status: 'sent' }]);
    setQuestionDraft('');
  }

  return (
    <div className="space-y-4">
      <Link
        href="/classbot/replay"
        className="text-pullim-slate-500 hover:text-pullim-blue-600 inline-flex items-center gap-1 text-xs font-semibold"
      >
        <ArrowLeft className="h-3 w-3" />
        리플레이 목록
      </Link>

      <PageHeader
        eyebrow={{ icon: History, text: `${replay.date} · ${watchedLabel}` }}
        title={replay.title}
        description={`${replay.botName} · ${replay.chapter} · ${replay.startedAt} 시작 · ${replay.durationMin}분 · ${replay.participantCount}명 참여`}
      />

      {/* Player surface */}
      <PlayerSurface
        replay={replay}
        now={now}
        totalSec={totalSec}
        playing={playing}
        speed={speed}
        currentLine={currentLine}
        onSeek={seek}
        onPlayPause={() => setPlaying(p => !p)}
        onSpeed={setSpeed}
      />

      {/* 핵심 메시지 — AI 추출 */}
      <KeyTakeaways takeaways={replay.keyTakeaways} />

      {/* 트랜스크립트 — 동기화 */}
      <TranscriptStream
        replay={replay}
        currentLineIdx={currentLineIdx}
        onSeek={seek}
      />

      {/* 반 집중도 + 북마크/질문 */}
      <FocusHeatmap
        bins={replay.focusBins}
        currentBinIdx={currentBinIdx}
        totalMin={replay.durationMin}
        onSeek={seek}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BookmarksPanel
          bookmarks={bookmarks}
          now={now}
          onSeek={seek}
          onAdd={addBookmark}
        />
        <TeacherQuestionsPanel
          questions={questions}
          draft={questionDraft}
          now={now}
          onDraftChange={setQuestionDraft}
          onSend={sendQuestion}
          onSeek={seek}
        />
      </div>

      {/* 프라이버시 안내 */}
      <PrivacyNote replay={replay} />

      <FlywheelNote>
        다시 본 구간 + 내가 틀린 퀴즈는 <strong>풀림 복습</strong>의 Leitner 박스에 자동 등록되고, 보낸 질문은 다음 수업 도입에 반영돼요.
      </FlywheelNote>
    </div>
  );
}

/* ─── Player Surface ─── */

function PlayerSurface({
  replay, now, totalSec, playing, speed, currentLine,
  onSeek, onPlayPause, onSpeed,
}: {
  replay: Replay;
  now: number; totalSec: number; playing: boolean; speed: Speed;
  currentLine: Replay['transcript'][number] | null;
  onSeek: (sec: number) => void;
  onPlayPause: () => void;
  onSpeed: (s: Speed) => void;
}) {
  const progressPct = (now / totalSec) * 100;
  const trackRef = useRef<HTMLDivElement>(null);

  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(pct * totalSec);
  }

  function onTrackKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); onSeek(now - 5); }
    if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(now + 5); }
    if (e.key === 'Home')       { e.preventDefault(); onSeek(0); }
    if (e.key === 'End')        { e.preventDefault(); onSeek(totalSec); }
  }

  return (
    <section className="from-pullim-slate-900 to-pullim-blue-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl lg:p-6">
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
      />

      <div className="relative">
        {/* 시간 디스플레이 */}
        <div className="flex items-end justify-between">
          <div className="font-mono">
            <div className="text-pullim-blue-200 text-[10px] font-bold tracking-wider uppercase">
              현재
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-pullim-lemon text-4xl font-bold leading-none lg:text-5xl">
                {formatReplayTime(now)}
              </span>
              <span className="text-white/40 text-base">/</span>
              <span className="text-white/70 text-base">{formatReplayTime(totalSec)}</span>
            </div>
          </div>
          {playing && (
            <span className="bg-pullim-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
              <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
              재생 중
            </span>
          )}
        </div>

        {/* Scrubber + 마커 */}
        <div className="relative mt-4 pb-7">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="재생 위치"
            aria-valuemin={0}
            aria-valuemax={totalSec}
            aria-valuenow={Math.floor(now)}
            aria-valuetext={formatReplayTime(now)}
            className="relative h-2 w-full cursor-pointer rounded-full bg-white/15 outline-none focus-visible:ring-3 focus-visible:ring-pullim-lemon/50"
            onClick={onTrackClick}
            onKeyDown={onTrackKey}
          >
            <div
              className="bg-pullim-lemon absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
            {/* 세그먼트 마커 */}
            {replay.segments.map((seg, i) => {
              const Icon = segmentMeta[seg.type].icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={ev => {
                    ev.stopPropagation();
                    onSeek(seg.atSec);
                  }}
                  title={`${seg.at} ${seg.label}`}
                  aria-label={`${seg.at} ${seg.label}로 이동`}
                  className={cn(
                    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full transition-transform hover:scale-125',
                    seg.ownedByMe ? 'h-5 w-5 ring-2 ring-pullim-slate-900' : 'h-3.5 w-3.5',
                    segmentMeta[seg.type].color,
                  )}
                  style={{ left: `${seg.ratio * 100}%` }}
                >
                  {seg.ownedByMe && <Icon className="h-2.5 w-2.5 text-white" />}
                </button>
              );
            })}
            {/* Thumb */}
            <div
              aria-hidden
              className="bg-white absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-pullim-lemon shadow-lg pointer-events-none"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          {/* 마커 범례 (마커 아래) */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
            {(['concept', 'quiz', 'student-q', 'sharing', 'attention'] as const).map(t => {
              const m = segmentMeta[t];
              return (
                <li key={t} className="text-white/70 flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full', m.color)} />
                  {m.label}
                </li>
              );
            })}
            <li className="text-pullim-lemon ml-auto inline-flex items-center gap-1 font-semibold">
              <span className="bg-pullim-lemon ring-pullim-slate-900 inline-block h-2.5 w-2.5 rounded-full ring-1" />
              내 활동
            </li>
          </ul>
        </div>

        {/* 컨트롤 */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => onSeek(now - 10)}
            aria-label="10초 뒤로"
            className="text-white/80 hover:bg-white/20 hover:text-white rounded-full bg-white/10 backdrop-blur"
          >
            <RotateCcw />
          </Button>

          <Button
            type="button"
            variant="pullim-lemon"
            size="icon-lg"
            onClick={onPlayPause}
            aria-label={playing ? '일시정지' : '재생'}
            className="size-12 rounded-full shadow-lg active:scale-95 [&_svg:not([class*='size-'])]:size-5"
          >
            {playing ? <Pause className="fill-current" /> : <Play className="fill-current pl-0.5" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={() => onSeek(now + 10)}
            aria-label="10초 앞으로"
            className="text-white/80 hover:bg-white/20 hover:text-white rounded-full bg-white/10 backdrop-blur"
          >
            <RotateCw />
          </Button>

          <div role="radiogroup" aria-label="재생 속도" className="ml-auto flex items-center gap-0.5 rounded-full bg-white/10 backdrop-blur p-1">
            {SPEEDS.map(s => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={s === speed}
                onClick={() => onSpeed(s)}
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono text-[11px] font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-pullim-lemon/50',
                  s === speed
                    ? 'bg-pullim-lemon text-pullim-lemon-ink'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {s}x
              </button>
            ))}
          </div>

        </div>

        {/* 자막 — 현재 라인 */}
        {currentLine ? (
          <div className="bg-white/10 backdrop-blur mt-4 rounded-xl p-3.5">
            <div className="text-pullim-lemon mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
              <span className="bg-pullim-lemon h-1 w-1 rounded-full" />
              {currentLine.speaker} 발언 중
              {currentLine.shared && (
                <span className="bg-pullim-lemon/20 text-pullim-lemon ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold">
                  전체 공유
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-white/95">{currentLine.text}</p>
          </div>
        ) : (
          <div className="bg-white/5 mt-4 rounded-xl p-3.5 text-center text-[11px] text-white/50">
            {now === 0 ? '재생 버튼을 눌러 수업을 시작해요.' : '쉬는 구간 — 곧 다음 발언으로'}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 핵심 메시지 ─── */

function KeyTakeaways({ takeaways }: { takeaways: string[] }) {
  return (
    <aside className="bg-card rounded-xl border p-4">
      <header className="mb-2 flex items-center gap-1.5">
        <Lightbulb className="text-pullim-lemon-ink h-3.5 w-3.5" />
        <strong className="text-pullim-slate-900 text-xs font-bold tracking-wider uppercase">
          이 수업 핵심 3개
        </strong>
        <span className="text-pullim-slate-400 ml-auto text-[10px]">AI 자동 추출</span>
      </header>
      <ol className="space-y-1.5 text-sm">
        {takeaways.map((t, i) => (
          <li key={i} className="text-pullim-slate-700 flex items-start gap-2 leading-relaxed">
            <span className="bg-pullim-blue-50 text-pullim-blue-700 mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </aside>
  );
}

/* ─── 트랜스크립트 (동기화 자동 스크롤) ─── */

function TranscriptStream({
  replay, currentLineIdx, onSeek,
}: {
  replay: Replay; currentLineIdx: number; onSeek: (sec: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentLineIdx < 0) return;
    const el = containerRef.current?.querySelector(`[data-line="${currentLineIdx}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentLineIdx]);

  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-pullim-slate-900 text-sm font-bold">트랜스크립트</h2>
          <p className="text-pullim-slate-500 text-[11px]">현재 위치 자동 스크롤 · 라인 클릭 시 그 시점으로</p>
        </div>
        <span className="text-pullim-slate-400 text-[10px] font-mono">
          {replay.transcript.length}개 라인
        </span>
      </header>

      <div
        ref={containerRef}
        className="max-h-[440px] space-y-2 overflow-y-auto px-4 py-3"
      >
        {replay.transcript.map((line, i) => {
          const isCurrent = i === currentLineIdx;
          const isPast = currentLineIdx >= 0 && i < currentLineIdx;
          return (
            <button
              key={i}
              type="button"
              data-line={i}
              onClick={() => onSeek(line.atSec)}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'block w-full rounded-lg p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                isCurrent
                  ? 'bg-pullim-lemon/15 ring-2 ring-pullim-lemon shadow-sm'
                  : isPast
                    ? 'bg-pullim-slate-50/40 hover:bg-pullim-slate-50'
                    : 'opacity-65 hover:opacity-100 hover:bg-pullim-slate-50',
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-pullim-slate-400 font-mono font-bold">{line.at}</span>
                <SpeakerBadge speaker={line.speaker} ownedByMe={line.ownedByMe} />
                {line.shared && (
                  <span className="bg-pullim-lemon/20 text-pullim-lemon-ink rounded-full px-1.5 py-0.5 font-bold">
                    전체 공유
                  </span>
                )}
                {isCurrent && (
                  <span className="text-pullim-lemon-ink ml-auto inline-flex items-center gap-0.5 font-bold">
                    <span className="bg-pullim-lemon h-1.5 w-1.5 animate-pulse rounded-full" />
                    지금
                  </span>
                )}
              </div>
              <p className="text-pullim-slate-800 mt-1.5 text-sm leading-relaxed">{line.text}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SpeakerBadge({
  speaker, ownedByMe,
}: { speaker: '교사' | '봇' | '나' | '학생'; ownedByMe?: boolean }) {
  const cls =
    speaker === '교사' ? 'bg-pullim-blue-100 text-pullim-blue-700' :
    speaker === '봇'   ? 'bg-pullim-slate-100 text-pullim-slate-700' :
    speaker === '나' || ownedByMe ? 'bg-pullim-lemon-soft text-pullim-lemon-ink' :
    'bg-pullim-blue-50 text-pullim-blue-600';
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 font-bold', cls)}>
      {speaker}
    </span>
  );
}

/* ─── 집중도 히트맵 ─── */

function FocusHeatmap({
  bins, currentBinIdx, totalMin, onSeek,
}: {
  bins: number[]; currentBinIdx: number; totalMin: number; onSeek: (sec: number) => void;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-pullim-slate-900 text-sm font-bold">반 집중도</h2>
          <p className="text-pullim-slate-500 text-[11px]">1분 단위 · 클릭 시 그 시점으로</p>
        </div>
        <span className="text-pullim-slate-400 font-mono text-[10px]">0~100</span>
      </header>

      <Sparkbar
        data={bins.map((v, i) => ({ value: v, title: `${i}~${i + 1}분 · 집중도 ${v}/100` }))}
        fill={heatColor}
        fillMode="css"
        heightPx={56}
        minPct={8}
        gapClassName="gap-0.5"
        onBarClick={(v, i) => onSeek(i * 60)}
        barAriaLabel={(v, i) => `${i}분 (집중도 ${v})`}
        activeIndex={currentBinIdx}
      />
      <div className="text-pullim-slate-400 mt-1.5 flex justify-between font-mono text-[10px]">
        <span>0:00</span>
        <span>{formatReplayTime((totalMin * 60) / 2)}</span>
        <span>{formatReplayTime(totalMin * 60)}</span>
      </div>
    </section>
  );
}

/* ─── 북마크 ─── */

function BookmarksPanel({
  bookmarks, now, onSeek, onAdd,
}: {
  bookmarks: ReplayBookmark[]; now: number;
  onSeek: (sec: number) => void; onAdd: () => void;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-pullim-slate-900 inline-flex items-center gap-1 text-sm font-bold">
            <Bookmark className="h-3.5 w-3.5" />
            북마크
          </h2>
          <p className="text-pullim-slate-500 text-[11px]">여기 다시 듣고 싶을 때 저장</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 hover:text-pullim-blue-700 font-mono whitespace-nowrap"
        >
          <BookmarkPlus />
          {formatReplayTime(now)} 저장
        </Button>
      </header>

      {bookmarks.length === 0 ? (
        <p className="text-pullim-slate-400 py-6 text-center text-xs">아직 저장한 북마크 없음</p>
      ) : (
        <ul className="space-y-1.5">
          {bookmarks.map(b => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSeek(b.atSec)}
                aria-label={`${formatReplayTime(b.atSec)} ${b.label} 로 이동`}
                className="bg-pullim-slate-50 hover:bg-pullim-slate-100 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50"
              >
                <span className="text-pullim-blue-600 font-mono font-bold">{formatReplayTime(b.atSec)}</span>
                <span className="text-pullim-slate-700 flex-1 truncate">{b.label}</span>
                <span className="text-pullim-slate-400 text-[10px]">{b.createdAt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── 선생님 질문 ─── */

function TeacherQuestionsPanel({
  questions, draft, now, onDraftChange, onSend, onSeek,
}: {
  questions: ReplayTeacherQuestion[]; draft: string; now: number;
  onDraftChange: (s: string) => void; onSend: () => void;
  onSeek: (sec: number) => void;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3">
        <h2 className="text-pullim-slate-900 inline-flex items-center gap-1 text-sm font-bold">
          <MessageCircle className="h-3.5 w-3.5" />
          이 시점에 선생님께
        </h2>
        <p className="text-pullim-slate-500 text-[11px]">개인 메시지 — 다른 학생은 못 봐요</p>
      </header>

      {/* Composer */}
      <form
        onSubmit={e => {
          e.preventDefault();
          onSend();
        }}
        className="mb-3 flex items-center gap-1.5"
      >
        <span className="bg-pullim-blue-50 text-pullim-blue-700 shrink-0 rounded font-mono text-[10px] font-bold px-1.5 py-1">
          @{formatReplayTime(now)}
        </span>
        <Input
          type="text"
          value={draft}
          onChange={e => onDraftChange(e.target.value)}
          placeholder="여기 다시 설명해주세요…"
          aria-label="선생님께 질문"
          className="h-8 flex-1 rounded-lg text-xs"
        />
        <Button
          type="submit"
          variant="pullim"
          size="icon-sm"
          disabled={!draft.trim()}
          aria-label="질문 보내기"
        >
          <Send />
        </Button>
      </form>

      {/* 보낸 질문 + 답 */}
      {questions.length === 0 ? (
        <p className="text-pullim-slate-400 py-3 text-center text-xs">아직 보낸 질문 없음</p>
      ) : (
        <ul className="space-y-2">
          {questions.map(q => (
            <li key={q.id} className="bg-pullim-slate-50/60 rounded-lg p-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSeek(q.atSec)}
                  aria-label={`${formatReplayTime(q.atSec)} 로 이동`}
                  className="text-pullim-blue-600 hover:underline font-mono font-bold outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50 rounded-sm"
                >
                  @{formatReplayTime(q.atSec)}
                </button>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                    q.status === 'replied'
                      ? 'bg-pullim-blue-50 text-pullim-blue-700'
                      : 'bg-pullim-slate-100 text-pullim-slate-700',
                  )}
                >
                  {q.status === 'replied' ? '답변 도착' : '전송됨'}
                </span>
              </div>
              <p className="text-pullim-slate-900 mt-1">{q.text}</p>
              {q.status === 'replied' && q.reply && (
                <div className="bg-pullim-blue-50 mt-2 rounded p-2 text-[11px]">
                  <strong className="text-pullim-blue-700 block">선생님 답</strong>
                  <p className="text-pullim-blue-900 mt-0.5 leading-relaxed">{q.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── 프라이버시 ─── */

function PrivacyNote({ replay }: { replay: Replay }) {
  const myCount = replay.transcript.filter(t => t.ownedByMe).length;
  const sharedCount = replay.transcript.filter(t => t.shared).length;
  return (
    <aside className="bg-pullim-slate-50 text-pullim-slate-600 rounded-xl p-3 text-[11px] leading-relaxed">
      <Lock className="-mt-0.5 mr-1 inline h-3 w-3" />
      교사·봇 발언 + 내 활동 {myCount}개 + 전체 공유 {sharedCount}개만 들을 수 있어요. 다른 친구의 비공개 발언은 프라이버시 보호.
    </aside>
  );
}
