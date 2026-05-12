'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, History, Loader2, Sparkles, Send, CheckCircle2, Eye, EyeOff,
  Lightbulb, Target, MessageCircle, Bookmark, Users, Clock, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import {
  type Replay, formatReplayTime,
} from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const segmentMeta: Record<Replay['segments'][number]['type'], { label: string; color: string; icon: LucideIcon }> = {
  'concept':   { label: '개념',     color: 'bg-pullim-blue-500',  icon: Lightbulb },
  'quiz':      { label: '퀴즈',     color: 'bg-pullim-warn',      icon: Target },
  'student-q': { label: '학생 질문', color: 'bg-pullim-success',   icon: MessageCircle },
  'sharing':   { label: '전체공유', color: 'bg-pullim-lemon',     icon: Eye },
  'attention': { label: '집중도',   color: 'bg-pullim-danger',    icon: AlertTriangle },
};

export function ReplayReview({ replay }: { replay: Replay }) {
  const [takeaways, setTakeaways] = useState<string[]>(replay.keyTakeaways);
  // 학생에게 안 보일 라인 idx (기본은 모두 노출 — 본인/공유/교사/봇)
  const [hiddenLines, setHiddenLines] = useState<Set<number>>(new Set());
  const [sentLocal, setSentLocal] = useState(replay.status === 'sent');

  const status = sentLocal ? 'sent' : replay.status;

  return (
    <div className="space-y-4 py-4 lg:py-6">
      <Link
        href="/teacher/replay"
        className="text-pullim-slate-500 hover:text-pullim-blue-600 inline-flex items-center gap-1 text-xs font-semibold"
      >
        <ArrowLeft className="h-3 w-3" />
        리플레이 큐
      </Link>

      <PageHeader
        eyebrow={{ icon: History, text: '클래스룸 · 수업 리플레이' }}
        title={replay.title}
        description={`${replay.botName} · ${replay.classroom} · ${replay.endedAt} 종료 · ${replay.durationMin}분 · ${replay.participantCount}명 참여`}
        action={<StatusBadge status={status} replay={replay} />}
      />

      {/* 상태별 분기 */}
      {status === 'processing' && <ProcessingPane />}

      {status === 'review' && (
        <>
          <ReviewBanner aiAt={replay.aiProcessedAt} />
          <KeyTakeawaysEditor takeaways={takeaways} onChange={setTakeaways} />
          <TranscriptVisibility
            replay={replay}
            hiddenLines={hiddenLines}
            onToggle={idx => {
              setHiddenLines(prev => {
                const next = new Set(prev);
                if (next.has(idx)) next.delete(idx);
                else next.add(idx);
                return next;
              });
            }}
          />
          <SegmentsPreview replay={replay} />
          <FocusHeatmapPreview bins={replay.focusBins} />
          <ApproveBar
            takeawayCount={takeaways.filter(t => t.trim()).length}
            hiddenCount={hiddenLines.size}
            totalLines={replay.transcript.length}
            onApprove={() => setSentLocal(true)}
          />
        </>
      )}

      {status === 'sent' && (
        <>
          <SentBanner sentAt={replay.sentAt ?? '방금'} />
          {replay.viewerStats && <ViewerStatsPane stats={replay.viewerStats} />}
          <KeyTakeawaysReadOnly takeaways={takeaways} />
          <TranscriptReadOnly replay={replay} hiddenLines={hiddenLines} />
          <SegmentsPreview replay={replay} />
          <FocusHeatmapPreview bins={replay.focusBins} />
        </>
      )}

      <FlywheelNote>
        검토하면서 가린 라인 + 다시 강조한 핵심 메시지는 다음 수업 때 봇 페르소나·교안 RAG에 자동 반영돼요.
      </FlywheelNote>
    </div>
  );
}

/* ─── 상태 뱃지 ─── */
function StatusBadge({ status, replay }: { status: Replay['status']; replay: Replay }) {
  if (status === 'processing') {
    return (
      <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
        <Loader2 className="h-3 w-3 animate-spin" />
        AI 처리 중
      </span>
    );
  }
  if (status === 'review') {
    return (
      <span className="bg-pullim-warn text-white inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
        <Eye className="h-3 w-3" />
        검토 대기
      </span>
    );
  }
  return (
    <span className="bg-pullim-success/10 text-pullim-success inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
      <CheckCircle2 className="h-3 w-3" />
      발송됨 · {replay.viewerStats?.startedCount}/{replay.viewerStats?.enrolledCount} 시청
    </span>
  );
}

/* ─── Processing ─── */
function ProcessingPane() {
  return (
    <section className="from-pullim-slate-900 to-pullim-blue-900 rounded-2xl bg-gradient-to-br p-6 text-white shadow-xl">
      <div className="flex items-center gap-3">
        <Loader2 className="text-pullim-lemon h-6 w-6 animate-spin" />
        <div>
          <div className="text-pullim-lemon text-[10px] font-bold tracking-wider uppercase">
            AI 처리 중
          </div>
          <h2 className="mt-0.5 text-base font-bold">트랜스크립트 + 핵심 메시지 + 집중도 추출</h2>
          <p className="text-pullim-blue-100 mt-1 text-xs leading-relaxed">
            T3(Sonnet)이 50분 음성을 텍스트로 옮기고, 5분 단위로 핵심 메시지를 뽑고, 학생별 집중도 곡선을 만들어요. 평균 90초.
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        <ProcessStep label="STT 음성 → 텍스트 변환"           done />
        <ProcessStep label="화자 분리 (교사·봇·학생)"          done />
        <ProcessStep label="핵심 메시지 3개 추출"             active />
        <ProcessStep label="집중도 1분 단위 빈 계산" />
        <ProcessStep label="학생별 활동 요약" />
      </ul>
    </section>
  );
}

function ProcessStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        done ? 'bg-pullim-success/30 text-pullim-success' :
        active ? 'bg-pullim-lemon text-pullim-lemon-ink' :
        'bg-white/10 text-white/40',
      )}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      </span>
      <span className={cn('text-white/80', done && 'line-through opacity-60', active && 'text-white font-bold')}>
        {label}
      </span>
    </li>
  );
}

/* ─── Review banner ─── */
function ReviewBanner({ aiAt }: { aiAt: string | null }) {
  return (
    <aside className="bg-pullim-warn/10 border-pullim-warn/30 text-pullim-warn rounded-xl border p-3.5 text-xs leading-relaxed">
      <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
      AI 추출 완료 ({aiAt}). 핵심 메시지·라인을 검토 후 학생에게 보내세요.
    </aside>
  );
}

/* ─── 핵심 메시지 편집 ─── */
function KeyTakeawaysEditor({
  takeaways, onChange,
}: { takeaways: string[]; onChange: (v: string[]) => void }) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title="핵심 메시지 3개"
        description="AI 추출 — 학생에게 그대로 보여요. 어색하면 손보세요."
      />
      <ul className="space-y-2.5">
        {takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="bg-pullim-warn/10 text-pullim-warn mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {i + 1}
            </span>
            <Textarea
              rows={2}
              value={t}
              onChange={e => {
                const next = [...takeaways];
                next[i] = e.target.value;
                onChange(next);
              }}
              aria-label={`핵심 메시지 ${i + 1}`}
              className="flex-1 rounded-lg resize-none text-sm leading-relaxed"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function KeyTakeawaysReadOnly({ takeaways }: { takeaways: string[] }) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading title="핵심 메시지 3개" description="학생에게 발송된 내용" />
      <ol className="space-y-1.5 text-sm">
        {takeaways.map((t, i) => (
          <li key={i} className="text-pullim-slate-700 flex items-start gap-2 leading-relaxed">
            <span className="bg-pullim-warn/10 text-pullim-warn mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─── 트랜스크립트 가시성 토글 ─── */
function TranscriptVisibility({
  replay, hiddenLines, onToggle,
}: {
  replay: Replay; hiddenLines: Set<number>; onToggle: (idx: number) => void;
}) {
  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-pullim-slate-900 text-sm font-bold">트랜스크립트 — 학생 노출 선택</h2>
          <p className="text-pullim-slate-500 text-[11px]">
            기본 모두 노출. 가리고 싶은 라인을 눌러서 비공개로.
          </p>
        </div>
        <span className="text-pullim-slate-400 text-[10px] font-mono">
          {replay.transcript.length - hiddenLines.size}/{replay.transcript.length} 노출
        </span>
      </header>
      <ul className="divide-pullim-slate-100 max-h-[440px] divide-y overflow-y-auto">
        {replay.transcript.map((line, i) => {
          const hidden = hiddenLines.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                aria-pressed={hidden}
                aria-label={`${line.at} ${line.speaker} 라인 ${hidden ? '노출하기' : '가리기'}`}
                onClick={() => onToggle(i)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50 focus-visible:ring-inset',
                  hidden ? 'bg-pullim-slate-50/60 hover:bg-pullim-slate-100' : 'hover:bg-pullim-blue-50/30',
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-pullim-slate-400 font-mono font-bold">{line.at}</span>
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 font-bold',
                    line.speaker === '교사' ? 'bg-pullim-blue-50 text-pullim-blue-700' :
                    line.speaker === '봇' ? 'bg-pullim-slate-100 text-pullim-slate-700' :
                    'bg-pullim-success/10 text-pullim-success',
                  )}>
                    {line.speaker}
                  </span>
                  {line.shared && (
                    <span className="bg-pullim-lemon/20 text-pullim-lemon-ink rounded-full px-1.5 py-0.5 font-bold">
                      전체 공유
                    </span>
                  )}
                  <span
                    className={cn(
                      'ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold',
                      hidden ? 'bg-pullim-danger/10 text-pullim-danger' : 'bg-pullim-success/10 text-pullim-success',
                    )}
                  >
                    {hidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                    {hidden ? '비공개' : '노출'}
                  </span>
                </div>
                <p className={cn(
                  'mt-1.5 text-sm leading-relaxed',
                  hidden ? 'text-pullim-slate-400 line-through' : 'text-pullim-slate-800',
                )}>
                  {line.text}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TranscriptReadOnly({
  replay, hiddenLines,
}: { replay: Replay; hiddenLines: Set<number> }) {
  const visible = replay.transcript.filter((_, i) => !hiddenLines.has(i));
  return (
    <section className="bg-card rounded-2xl border">
      <header className="border-pullim-slate-100 border-b p-4">
        <h2 className="text-pullim-slate-900 text-sm font-bold">학생 발송된 트랜스크립트</h2>
        <p className="text-pullim-slate-500 text-[11px]">
          {visible.length}/{replay.transcript.length} 라인 노출됨
        </p>
      </header>
      <ul className="divide-pullim-slate-100 max-h-[400px] divide-y overflow-y-auto">
        {visible.map((line, i) => (
          <li key={i} className="px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-pullim-slate-400 font-mono font-bold">{line.at}</span>
              <span className={cn(
                'rounded-full px-1.5 py-0.5 font-bold',
                line.speaker === '교사' ? 'bg-pullim-blue-50 text-pullim-blue-700' :
                line.speaker === '봇' ? 'bg-pullim-slate-100 text-pullim-slate-700' :
                'bg-pullim-success/10 text-pullim-success',
              )}>
                {line.speaker}
              </span>
            </div>
            <p className="text-pullim-slate-800 mt-1 text-sm leading-relaxed">{line.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── 세그먼트 미리보기 ─── */
function SegmentsPreview({ replay }: { replay: Replay }) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="자동 추출 세그먼트"
        description={`${replay.segments.length}개 — 학생 타임라인 마커로 표시됨`}
      />
      <ul className="space-y-1.5">
        {replay.segments.map((seg, i) => {
          const meta = segmentMeta[seg.type];
          const Icon = meta.icon;
          return (
            <li key={i} className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg p-2.5 text-xs">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white', meta.color)}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="text-pullim-slate-500 font-mono font-bold">{seg.at}</span>
              <span className="text-pullim-slate-700 flex-1 truncate">{seg.label}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', meta.color, 'text-white')}>
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─── 집중도 미리보기 ─── */
function heatColor(v: number): string {
  if (v >= 90) return 'var(--color-pullim-heat-5)';
  if (v >= 80) return 'var(--color-pullim-heat-4)';
  if (v >= 70) return 'var(--color-pullim-heat-3)';
  if (v >= 60) return 'var(--color-pullim-heat-2)';
  return 'var(--color-pullim-heat-1)';
}

function FocusHeatmapPreview({ bins }: { bins: number[] }) {
  if (bins.length === 0) return null;
  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading title="반 집중도" description={`1분 단위 · 학생도 같은 데이터 봄`} />
      <div className="flex h-12 items-end gap-0.5">
        {bins.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${Math.max(8, v)}%`, backgroundColor: heatColor(v) }}
            title={`${i}분: ${v}/100`}
          />
        ))}
      </div>
      <div className="text-pullim-slate-400 mt-1.5 flex justify-between font-mono text-[10px]">
        <span>0:00</span>
        <span>{formatReplayTime((bins.length * 60) / 2)}</span>
        <span>{formatReplayTime(bins.length * 60)}</span>
      </div>
    </section>
  );
}

/* ─── Sent banner + Viewer stats ─── */
function SentBanner({ sentAt }: { sentAt: string }) {
  return (
    <aside className="bg-pullim-success/10 border-pullim-success/30 text-pullim-success rounded-xl border p-3.5 text-xs leading-relaxed">
      <CheckCircle2 className="-mt-0.5 mr-1 inline h-3 w-3" />
      {sentAt}에 학생들에게 발송됨. 시청 통계 + 학생 질문이 아래에 모이고 있어요.
    </aside>
  );
}

function ViewerStatsPane({ stats }: { stats: NonNullable<Replay['viewerStats']> }) {
  const startedPct = Math.round((stats.startedCount / stats.enrolledCount) * 100);
  const completedPct = Math.round((stats.completedCount / stats.enrolledCount) * 100);
  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading title="시청 통계" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat Icon={Users} label="시청 시작" value={`${stats.startedCount}/${stats.enrolledCount}`} sub={`${startedPct}%`} />
        <Stat Icon={CheckCircle2} label="끝까지" value={`${stats.completedCount}`} sub={`${completedPct}%`} accent={completedPct >= 70} />
        <Stat Icon={Eye} label="평균 시청률" value={`${stats.avgWatchedPct}%`} accent={stats.avgWatchedPct >= 80} />
        <Stat Icon={MessageCircle} label="질문" value={`${stats.totalQuestions}`} />
        <Stat Icon={Bookmark} label="북마크" value={`${stats.totalBookmarks}`} />
        <Stat Icon={Clock} label="평균 시청 시간" value={formatReplayTime(Math.floor((stats.avgWatchedPct / 100) * 50 * 60))} />
      </ul>
    </section>
  );
}

function Stat({
  Icon, label, value, sub, accent,
}: {
  Icon: LucideIcon;
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn('mt-0.5 font-mono text-base font-bold', accent ? 'text-pullim-success' : 'text-pullim-slate-900')}>
        {value}
        {sub && <span className="text-pullim-slate-400 ml-1 text-[10px]">{sub}</span>}
      </div>
    </li>
  );
}

/* ─── 발송 승인 바 (sticky bottom) ─── */
function ApproveBar({
  takeawayCount, hiddenCount, totalLines, onApprove,
}: {
  takeawayCount: number; hiddenCount: number; totalLines: number;
  onApprove: () => void;
}) {
  const ready = takeawayCount === 3;
  return (
    <div className="bg-pullim-slate-900 sticky bottom-3 z-10 rounded-2xl p-4 text-white shadow-xl lg:flex lg:items-center lg:gap-4">
      <div className="flex-1">
        <div className="text-pullim-lemon text-[10px] font-bold tracking-wider uppercase">
          학생 발송 준비
        </div>
        <p className="text-sm">
          핵심 메시지 <strong className="text-pullim-lemon font-mono">{takeawayCount}/3</strong>
          {' · '}
          노출 라인 <strong className="text-pullim-lemon font-mono">{totalLines - hiddenCount}/{totalLines}</strong>
          {' · '}
          타임라인 마커·집중도 자동 포함
        </p>
      </div>
      <Button
        type="button"
        variant={ready ? 'pullim-lemon' : 'secondary'}
        size="lg"
        onClick={onApprove}
        disabled={!ready}
        className={cn(
          'mt-3 w-full rounded-xl lg:mt-0 lg:w-auto',
          !ready && 'bg-white/10 text-white/40 cursor-not-allowed',
        )}
      >
        <Send />
        {ready ? '학생에게 발송' : '핵심 메시지 3개 채우기'}
      </Button>
    </div>
  );
}
