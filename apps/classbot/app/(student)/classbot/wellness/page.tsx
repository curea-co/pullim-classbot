'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyWellness } from '@/hooks/api/read/use-student-reads';
import type { EmotionCheckInReadRow, WellbeingSnapshotReadRow } from '@/hooks/api/read/types';
import { useRosterMe } from '@/lib/current-user';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';

/** 감정 척도(1~4) 표시 메타 — DB mood 정수 → 학생 표기. */
const MOOD_META: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😄', label: '좋음' },
  2: { emoji: '🙂', label: '괜찮음' },
  3: { emoji: '😐', label: '그저그럼' },
  4: { emoji: '😟', label: '힘듦' },
};

/**
 * 로컬(사용자 브라우저) 기준 ISO yyyy-mm-dd. KST 사용자 자정 전후로 UTC ISO 가
 * 하루씩 어긋나는 회귀를 피하려 `toISOString`(UTC) 대신 로컬 날짜를 쓴다.
 */
function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 오늘(로컬)과의 날짜 차이(일). 미래/파싱 실패는 0. */
function daysAgoFrom(dateIso: string): number {
  // 두 날짜 모두 로컬 자정 기준으로 비교(서머타임·UTC 오프셋 영향 제거).
  const then = new Date(`${dateIso}T00:00:00`);
  const today = new Date(`${localIsoDate()}T00:00:00`);
  if (Number.isNaN(then.getTime()) || Number.isNaN(today.getTime())) return 0;
  return Math.max(0, Math.round((today.getTime() - then.getTime()) / 86_400_000));
}

/**
 * 학생 웰빙 허브 — Phase 7 Stage 2: `GET /api/wellness`(실DB·인증) 배선.
 *
 * 실데이터(`/api/wellness`)로 그리는 부분: 오늘 체크인 여부 + 주간 감정 체크인 기록
 * + 60 미만 케어 메시지(최신 스냅샷 점수 기준). 미로그인은 로그인 게이트(D1 로그인월).
 *
 * 스펙 필수 정보 유지([13 § 3.3.3]): 웰빙 지수 게이지(0~100 + 7일 추세 + 5지표 분해,
 * § 9.2)와 담당 봇 코멘트 카드(§ 9.3)는 surface 의 핵심 UX 라 제거하지 않는다. 해당
 * 두 요소는 5지표 분해·봇 매칭이 아직 Stage 1 읽기 API 에 없어 기존 도메인 소스(roster
 * 키)로 그대로 렌더한다. 5지표를 실API 로 옮기는 작업은 후속 슬라이스(`/api/wellness`
 * 확장)에서 진행한다.
 */
export default function WellnessPage() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useMyWellness();
  // 게이지·봇 코멘트는 아직 roster 키 기반 도메인 소스. 세션 신원→roster 행 브리지.
  const me = useRosterMe();

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
        rosterId={me.id}
        rosterWellbeing={me.wellbeing}
        isLoading={isLoading}
        isUnauthenticated={isUnauthenticated}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function WellnessBody({
  data, rosterId, rosterWellbeing, isLoading, isUnauthenticated, isError, onRetry,
}: {
  data: { snapshots: WellbeingSnapshotReadRow[]; checkIns: EmotionCheckInReadRow[] } | undefined;
  rosterId: string;
  rosterWellbeing: number;
  isLoading: boolean;
  isUnauthenticated: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isUnauthenticated) return <ReadLoginGate label="내 웰빙" />;
  if (isError) return <ReadErrorState onRetry={onRetry} />;
  if (isLoading || !data) return <WellnessSkeleton />;

  const checkIns = data.checkIns;
  const todayIso = localIsoDate();
  const checkedToday = checkIns.some(c => c.date === todayIso);
  // 스냅샷은 라우트에서 date desc 정렬 → 첫 행이 최신. 없으면 roster 표시값으로 폴백.
  const latestScore = data.snapshots[0]?.score ?? rosterWellbeing;
  // [13 § 3.3.3·9.3] 담당 봇 코멘트 — 5지표 분해 기반 자동 매칭(현재 도메인 소스).
  const botComment = getWellnessBotComment(rosterId);

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

      {/* 웰빙 지수 게이지 — [13 § 3.3.3·9.2] 0~100 + 7일 추세 + 5지표 분해 (스펙 필수) */}
      <WellbeingGauge studentId={rosterId} />

      {/* 담당 봇 코멘트 카드 — [13 § 3.3.3·9.3] 좌측 라이너 4px + 아바타 + 이름 + 시간 + 시그니처 ghost CTA */}
      {botComment && (() => {
        const sig = botSignature(botComment.bot);
        return (
          <section
            className="bg-card rounded-2xl border border-l-[4px] p-4"
            style={{ borderLeftColor: sig.hex }}
          >
            <header className="mb-2 flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: sig.hex }}
              >
                {botComment.bot.avatarEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 text-xs">
                  <span className="text-pullim-slate-900 font-bold">{botComment.bot.name}</span>
                  <span className="text-pullim-slate-400 font-normal">· {botComment.generatedAt}</span>
                </div>
                <p className="text-pullim-slate-500 text-[11px]">{botComment.weakArea}이 이번 주 신경 쓸 부분이에요</p>
              </div>
              <Sparkles className="text-pullim-slate-300 h-3 w-3" />
            </header>
            <p className="text-pullim-slate-700 mt-1 text-[13px] leading-relaxed">
              &ldquo;{botComment.text}&rdquo;
            </p>
            <Link
              href={botComment.ctaHref}
              className="mt-3 inline-flex items-center gap-1 rounded-full border-[1.5px] bg-transparent px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-pullim-slate-50"
              style={{ borderColor: sig.inkLight, color: sig.inkLight }}
            >
              {botComment.ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        );
      })()}

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
      {latestScore < 60 && (
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
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
