'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyWellness } from '@/hooks/api/read/use-student-reads';
import type { EmotionCheckInReadRow, WellbeingSnapshotReadRow } from '@/hooks/api/read/types';
import { cn } from '@/lib/utils';

/** 감정 척도(1~4) 표시 메타 — DB mood 정수 → 학생 표기. */
const MOOD_META: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😄', label: '좋음' },
  2: { emoji: '🙂', label: '괜찮음' },
  3: { emoji: '😐', label: '그저그럼' },
  4: { emoji: '😟', label: '힘듦' },
};

const TODAY_ISO = new Date().toISOString().slice(0, 10);

/** 오늘과의 날짜 차이(일). 미래/파싱 실패는 0. */
function daysAgoFrom(dateIso: string): number {
  const then = Date.parse(`${dateIso}T00:00:00Z`);
  const today = Date.parse(`${TODAY_ISO}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(today)) return 0;
  return Math.max(0, Math.round((today - then) / 86_400_000));
}

/**
 * 학생 웰빙 허브 — Phase 7 Stage 2: `GET /api/wellness`(실DB·인증) 배선.
 *
 * mock(`getCheckInsForStudent`/`hasTodayCheckIn`/`resolveRosterMe`) 제거. 로그인 세션
 * 명의의 감정 체크인·웰빙 스냅샷만 표시한다. 미로그인은 로그인 게이트(D1 로그인월).
 *
 * NOTE: 5지표 분해 게이지(`WellbeingGauge`)와 담당 봇 코멘트(`getWellnessBotComment`)는
 * Stage 1 읽기 API 가 제공하지 않는 mock 파생이라 이번 슬라이스에서 제외했다(후속 범위).
 * 본 페이지는 최신 웰빙 점수 + 주간 체크인 기록을 실데이터로 그린다.
 */
export default function WellnessPage() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useMyWellness();

  return (
    <div className="space-y-4">
      <Link
        href="/classbot"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        클래스봇 홈
      </Link>

      <WellnessBody
        data={data}
        isLoading={isLoading}
        isUnauthenticated={isUnauthenticated}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function WellnessBody({
  data, isLoading, isUnauthenticated, isError, onRetry,
}: {
  data: { snapshots: WellbeingSnapshotReadRow[]; checkIns: EmotionCheckInReadRow[] } | undefined;
  isLoading: boolean;
  isUnauthenticated: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isUnauthenticated) return <ReadLoginGate label="내 웰빙" />;
  if (isError) return <ReadErrorState onRetry={onRetry} />;
  if (isLoading || !data) return <WellnessSkeleton />;

  const checkIns = data.checkIns;
  const checkedToday = checkIns.some(c => c.date === TODAY_ISO);
  // 스냅샷은 라우트에서 date desc 정렬 → 첫 행이 최신.
  const latestScore = data.snapshots[0]?.score ?? null;

  return (
    <>
      <PageHeader
        eyebrow={{ icon: Heart, text: '내 웰빙' }}
        title="오늘 어땠어요?"
        description={checkedToday ? '오늘 체크인 완료 — 내일 또 와주세요.' : '아직 체크인 전이에요.'}
      />

      {/* 오늘 체크인 CTA */}
      <Link
        href="/classbot/wellness/check-in"
        className={cn(
          'flex items-center gap-3 rounded-2xl p-4 transition-colors',
          checkedToday
            ? 'bg-pullim-blue-50 hover:bg-pullim-blue-100 border-pullim-blue-200 border'
            : 'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
        )}
      >
        <span className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
          checkedToday ? 'bg-pullim-blue-100' : 'bg-white/15',
        )}>
          {checkedToday ? '✅' : '💭'}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-bold', checkedToday ? 'text-pullim-blue-700' : 'text-white')}>
            {checkedToday ? '오늘 체크인 완료' : '30초 체크인 시작'}
          </div>
          <div className={cn('text-[11px]', checkedToday ? 'text-pullim-slate-600' : 'text-pullim-blue-100')}>
            {checkedToday ? '다시 작성하고 싶으면 들어와도 돼요' : '하나만 고르면 끝이에요'}
          </div>
        </div>
        <ArrowRight className={cn('h-4 w-4', checkedToday ? 'text-pullim-blue-700' : 'text-white')} />
      </Link>

      {/* 최신 웰빙 점수 */}
      {latestScore !== null && (
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading title="이번 주 웰빙 점수" description="최근 스냅샷 기준" />
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-pullim-blue-700 font-mono text-3xl font-bold leading-none">
              {latestScore}
            </span>
            <span className="text-pullim-slate-400 text-sm font-semibold">/ 100</span>
          </div>
          <div className="bg-pullim-slate-200 mt-3 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                latestScore >= 80 ? 'bg-emerald-500'
                  : latestScore >= 61 ? 'bg-pullim-blue-400'
                  : latestScore >= 41 ? 'bg-amber-500'
                  : 'bg-pullim-danger',
              )}
              style={{ width: `${Math.min(100, Math.max(0, latestScore))}%` }}
            />
          </div>
        </section>
      )}

      {/* 주간 감정 그래프 */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="주간 기분 기록" description="이번 주의 나" />
        {checkIns.length === 0 ? (
          <p className="text-pullim-slate-400 py-6 text-center text-[11px]">
            아직 기록이 없어요. 오늘부터 시작해봐요.
          </p>
        ) : (
          <ul className="space-y-1">
            {checkIns.map(c => {
              const m = MOOD_META[c.mood] ?? MOOD_META[3];
              const daysAgo = daysAgoFrom(c.date);
              return (
                <li key={c.id} className="bg-pullim-slate-50/50 flex items-center gap-3 rounded-lg p-2">
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-pullim-slate-900 text-xs font-bold">
                      {daysAgo === 0 ? '오늘' : `${daysAgo}일 전`} · {m.label}
                    </div>
                    {c.freeText && (
                      <div className="text-pullim-slate-500 mt-0.5 truncate text-[11px]">
                        &ldquo;{c.freeText}&rdquo;
                      </div>
                    )}
                  </div>
                  {c.intensity && (
                    <span className="text-pullim-slate-400 font-mono text-[10px]">
                      강도 {c.intensity}/5
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 곁에 있어 메시지 — 웰빙 60 미만일 때 */}
      {latestScore !== null && latestScore < 60 && (
        <section className="bg-pullim-slate-900 text-white rounded-2xl p-4">
          <h3 className="text-pullim-lemon inline-flex items-center gap-1 text-sm font-bold">
            <Heart className="h-3.5 w-3.5" />
            선생님이 곁에 있어요
          </h3>
          <p className="text-pullim-slate-300 mt-2 text-[12px] leading-relaxed">
            이번 주 좀 무거웠어요. 혼자 끌어안지 않아도 돼요. 봇이든 선생님이든 언제든 말 걸어주세요.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/classbot/chat"
              className="bg-pullim-lemon text-pullim-lemon-ink inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold"
            >
              <MessageCircle className="h-3 w-3" />
              봇과 대화
            </Link>
          </div>
        </section>
      )}

      {/* 본인 리포트 진입 */}
      <Link
        href="/classbot/me/report"
        className="bg-pullim-slate-50 hover:bg-pullim-slate-100 flex items-center justify-between rounded-2xl p-4 transition-colors"
      >
        <div>
          <div className="text-pullim-slate-900 text-sm font-bold">이번 주의 나</div>
          <div className="text-pullim-slate-500 text-[11px]">내 주간 리포트 보기</div>
        </div>
        <ArrowRight className="text-pullim-slate-500 h-4 w-4" />
      </Link>

      <FlywheelNote>
        매일 30초 체크인이 쌓이면 봇이 더 정확하게 도와줄 수 있어요. 부담 없이 편하게.
      </FlywheelNote>
    </>
  );
}

function WellnessSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
