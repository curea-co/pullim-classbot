'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  History, ArrowRight, CheckCircle2, MessageCircle, Eye, Play, RotateCw,
} from 'lucide-react';
import {
  getSentReplays, classBots, formatReplayTime, type Replay,
} from '@/lib/mock';
import { useReplayStore } from '@/lib/store/replay';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { ReplayReviewNudge } from '@/components/classbot/replay-review-nudge';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/classbot/empty-state';

export default function ClassbotReplayListPage() {
  const allReplays = useMemo(() => getSentReplays(), []);
  const created = useReplayStore(s => s.created);
  const createdSent = useMemo(() => created.filter(r => r.status === 'sent'), [created]);
  const [filterBotId, setFilterBotId] = useState<'all' | string>('all');

  const replays = filterBotId === 'all'
    ? allReplays
    : allReplays.filter(r => r.botId === filterBotId);

  // 필터에 보일 봇 — sent 리플레이가 있는 봇만
  const botFilters = useMemo(() => {
    const ids = new Set(allReplays.map(r => r.botId));
    return classBots.filter(b => ids.has(b.id));
  }, [allReplays]);

  const latest = replays[0];

  // "이어 보기" 후보 — 진도 1초~끝 사이
  const inProgress = replays.find(
    r => r.watchProgress.lastSec > 0 && !r.watchProgress.completed,
  );

  const totalWatchedMin = allReplays
    .filter(r => r.watchProgress.completed)
    .reduce((s, r) => s + r.durationMin, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={{ icon: History, text: '풀림 클래스봇' }}
        title="리플레이"
        description={`${allReplays.length + createdSent.length}개 수업 · 총 시청 ${totalWatchedMin}분`}
      />

      {/* 복습 넛지 — 미해결 약점이 남은 리플레이 recap 으로 유도 (spec §6, 필터와 무관하게 전체 기준) */}
      <ReplayReviewNudge replays={allReplays} />

      {/* 방금 도착한 리플레이 — 라이브 종료 후 교사 승인된 신규본 */}
      {createdSent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-pullim-blue-700 text-xs font-bold uppercase tracking-wider">방금 도착한 리플레이 {createdSent.length}건</h2>
          <ul className="space-y-2">
            {createdSent.map(r => (
              <li key={r.id} className="bg-pullim-blue-50 border-pullim-blue-200 rounded-2xl border p-3">
                <div className="text-pullim-blue-700 text-micro font-bold uppercase tracking-wider">{r.botName}</div>
                <div className="text-pullim-slate-900 text-sm font-bold">{r.title}</div>
                <div className="text-pullim-slate-500 mt-0.5 text-2xs">
                  {r.chapter} · {r.startedAt}~{r.endedAt} · {r.durationMin}분 · {r.participantCount}명 참여
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-2xs font-bold text-pullim-blue-600">
                  📩 선생님이 방금 발송했어요
                  <span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-full px-1.5 py-0.5 text-micro font-bold">준비 중</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 봇 필터 chip */}
      {botFilters.length > 1 && (
        <section className="bg-card rounded-xl border p-2">
          <FilterPillButtons
            shape="tab"
            current={filterBotId}
            onSelect={setFilterBotId}
            options={[
              { value: 'all', label: '전체', count: allReplays.length },
              ...botFilters.map(b => ({
                value: b.id,
                label: b.avatarEmoji ? `${b.avatarEmoji} ${b.name}` : b.name,
                count: allReplays.filter(r => r.botId === b.id).length,
              })),
            ]}
            className="overflow-x-auto flex-nowrap"
          />
        </section>
      )}

      {/* 빈 상태 */}
      {replays.length === 0 && (
        <EmptyState icon={History} title="이 봇의 리플레이가 아직 없어요" tone="neutral" />
      )}

      {/* 단일 hero — 이어 보기가 있으면 ContinueWatching만, 없으면 LatestHero */}
      {inProgress
        ? <ContinueWatching replay={inProgress} />
        : latest && <LatestHero replay={latest} />}

      {/* 목록 — 이어 보기가 있으면 latest도 일반 행으로 포함 */}
      {replays.length > 0 && (
        <section>
          <SectionHeading
            title="전체 수업"
            description={`${replays.length}개 · 본인 활동 구간만 재생`}
          />
          <ul className="space-y-2">
            {(inProgress
              ? replays
              : replays.slice(1)
            ).map(r => <ReplayRow key={r.id} replay={r} />)}
          </ul>
        </section>
      )}

      {/* 프라이버시 */}
      <aside className="bg-pullim-slate-50 text-pullim-slate-600 rounded-xl p-3 text-2xs leading-relaxed">
        <Eye className="-mt-0.5 mr-1 inline h-3 w-3" />
        교사·봇 발언과 내 활동·전체 공유 순간만 들을 수 있어요. 다른 친구의 비공개 발언은 프라이버시 보호.
      </aside>

      <FlywheelNote>
        다시 본 구간은 <strong>풀림 복습</strong>의 망각 곡선 큐에 자동 추가되고, 틀린 퀴즈는 <strong>오답정복</strong>으로 흘러가요.
      </FlywheelNote>
    </div>
  );
}

/* ─── 이어 보기 hero ─── */
function ContinueWatching({ replay: r }: { replay: Replay }) {
  const totalSec = r.durationMin * 60;
  const pct = Math.round((r.watchProgress.lastSec / totalSec) * 100);
  const remaining = Math.ceil((totalSec - r.watchProgress.lastSec) / 60);

  return (
    <Link
      href={`/classbot/replay/${r.id}`}
      className="from-pullim-slate-900 to-pullim-blue-900 group relative block overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl transition-transform active:scale-[0.99]"
    >
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
      />
      <div className="relative">
        <div className="text-pullim-lemon flex items-center gap-1 text-micro font-bold tracking-wider uppercase">
          <RotateCw className="h-3 w-3" />
          이어 보기 · {r.botName}
        </div>
        <h2 className="mt-1.5 text-lg font-bold tracking-tight">{r.title}</h2>
        <p className="text-pullim-blue-100 text-xs">
          {r.date} · {r.chapter} · {pct}% 시청 · 남은 {remaining}분
        </p>

        <div className="mt-3">
          <div className="bg-white/15 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-pullim-lemon h-full rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-micro text-white/60">
            <span>{formatReplayTime(r.watchProgress.lastSec)}</span>
            <span>{formatReplayTime(totalSec)}</span>
          </div>
        </div>

        <span className="bg-pullim-lemon text-pullim-lemon-ink mt-4 inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-bold transition-transform group-hover:translate-x-0.5">
          <Play className="h-3.5 w-3.5 fill-current" />
          {formatReplayTime(r.watchProgress.lastSec)}부터 이어서
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/* ─── 가장 최근 hero ─── */
function LatestHero({ replay: r }: { replay: Replay }) {
  return (
    <section className="from-pullim-blue-700 to-pullim-blue-500 relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl">
      <div className="text-pullim-lemon text-micro font-bold tracking-wider uppercase">
        방금 끝난 수업 · {r.botName}
      </div>
      <h2 className="mt-1 text-lg font-bold tracking-tight">{r.title}</h2>
      <p className="text-pullim-blue-100 text-xs">
        {r.date} · {r.startedAt} 시작 · {r.durationMin}분 · {r.participantCount}명 참여
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-2xs">
        <HeroStat label="내 정답률" value={`${r.myAccuracy}%`} />
        <HeroStat label="핵심 메시지" value={`${r.keyTakeaways.length}개`} />
        <HeroStat label="내 활동" value={`${r.segments.filter(s => s.ownedByMe).length}개`} />
      </div>

      <Link
        href={`/classbot/replay/${r.id}`}
        className="bg-pullim-lemon text-pullim-lemon-ink mt-4 inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-bold"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        처음부터 재생
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

/* ─── 일반 행 ─── */
function ReplayRow({ replay: r }: { replay: Replay }) {
  const totalSec = r.durationMin * 60;
  const pct = Math.round((r.watchProgress.lastSec / totalSec) * 100);
  const myInteractions = r.segments.filter(s => s.ownedByMe).length;
  const isCompleted = r.watchProgress.completed;
  const isStarted = r.watchProgress.lastSec > 0 && !isCompleted;
  const bot = classBots.find(b => b.id === r.botId);

  return (
    <li>
      <Link
        href={`/classbot/replay/${r.id}`}
        className="bg-card hover:border-pullim-blue-300 flex flex-col gap-2.5 rounded-xl border p-4 transition-colors lg:flex-row lg:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-micro">
            {bot && <span className="text-base leading-none">{bot.avatarEmoji}</span>}
            <span className="text-pullim-slate-500 font-mono font-bold">{r.date} · {r.startedAt}</span>
            {isCompleted && (
              <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold">
                <CheckCircle2 className="h-2.5 w-2.5" />
                시청 완료
              </span>
            )}
            {isStarted && (
              <span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-full px-1.5 py-0.5 font-bold">
                {pct}% 보는 중
              </span>
            )}
            {!isStarted && !isCompleted && (
              <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-1.5 py-0.5 font-bold">
                안 봄
              </span>
            )}
          </div>
          <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{r.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-2xs">
            {r.botName} · {r.chapter} · {r.durationMin}분 · {r.participantCount}명 참여
          </div>

          {isStarted && (
            <div className="bg-pullim-slate-100 mt-2 h-1 overflow-hidden rounded-full">
              <div
                className="bg-pullim-blue-500 h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 lg:gap-4">
          <Mini Icon={CheckCircle2} value={`${r.myAccuracy}%`} label="내 정답률" />
          <Mini Icon={MessageCircle} value={`${myInteractions}`} label="내 활동" />
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-2xs font-bold',
              isStarted
                ? 'bg-pullim-blue-600 text-white'
                : 'bg-pullim-slate-100 text-pullim-slate-700',
            )}
          >
            {isStarted ? <RotateCw className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            {isStarted ? '이어서' : isCompleted ? '다시' : '재생'}
          </span>
        </div>
      </Link>
    </li>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-2 backdrop-blur">
      <div className="text-pullim-blue-100 text-micro font-bold tracking-wider uppercase">{label}</div>
      <div className="mt-0.5 font-mono text-base font-bold">{value}</div>
    </div>
  );
}

function Mini({
  Icon, value, label,
}: { Icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-pullim-slate-500 inline-flex items-center gap-0.5 text-micro font-semibold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-pullim-slate-900 mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
