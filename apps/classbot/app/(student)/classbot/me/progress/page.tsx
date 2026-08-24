'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, CalendarRange, Clock, GraduationCap, Inbox, MessageCircle, Target, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { Sparkbar } from '@/components/classbot/sparkbar';
import { useMyClassBots, useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { botSignature } from '@/lib/tokens/bot-signature';
import {
  PROGRESS_PERIOD_OPTIONS,
  attainmentChipClass,
  attainmentLabel,
  getProgressSnapshot,
  progressBotFace,
  submissionStatusChipClass,
  submissionStatusLabel,
  type AchievementStandard,
  type LearningTimelineDay,
  type ProgressPeriod,
  type ProgressSnapshot,
  type SubmissionHistoryRow,
} from '@/lib/mock/classbot-progress';
import { cn } from '@/lib/utils';

/**
 * 학습 기록 · 성취기준 달성도 — SCR-C-30 / FR-C-31.
 *
 * 주간 리포트(`/classbot/me/report`)와 역할을 나눈다 —
 *  · 리포트: 한 주를 봇 목소리로 **요약**한다(웰빙 게이지 · 잘한 점 · 신경 쓸 점).
 *  · 여기  : 성취기준 **한 줄 단위**로 파고든다(어떤 기준이 어디까지 · 언제 무엇을 했나 · 무엇을 냈나).
 * 그래서 같은 숫자를 두 번 보여주지 않는다.
 *
 * 데이터는 `getProgressSnapshot(period)` **한 곳**에서만 읽는다 — 실 집계 API 가 생기면 그 함수만 바뀐다.
 */
export default function MyProgressPage() {
  const [period, setPeriod] = useState<ProgressPeriod>('week');
  const snapshot = getProgressSnapshot(period);

  // 참여한 클래스가 있어야 학습 기록이 쌓인다 — 홈·봇 대화와 같은 게이트를 쓴다.
  const myBots = useMyClassBots();
  const hydrated = useStoresHydrated(useClassEnrollmentStore);

  // persist hydration 전에는 참여 여부를 신뢰할 수 없다 → 빈 상태 플래시 방지.
  if (!hydrated) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-pullim-slate-500 text-sm">불러오는 중…</div>
      </div>
    );
  }

  if (myBots.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <EmptyState
          icon={GraduationCap}
          title="아직 쌓인 학습 기록이 없어요"
          description="선생님께 받은 참여 코드로 클래스에 참여하고 과제를 풀면 여기에 기록이 쌓여요."
          action={{ href: '/classbot', label: '참여 코드' }}
        />
      </div>
    );
  }

  const rail = (
    <>
      <GrowthTrendCard snapshot={snapshot} />

      {/* 주간 리포트와 역할이 다르다는 것을 화면에서도 말해 둔다(중복 구현 방지). */}
      <section className="bg-card rounded-2xl border p-4">
        <h3 className="text-pullim-slate-900 text-sm font-bold">한 주 요약이 보고 싶다면</h3>
        <Link
          href="/classbot/me/report"
          className="text-pullim-blue-600 hover:text-pullim-blue-700 mt-2 inline-block text-xs font-bold"
        >
          주간 리포트
        </Link>
      </section>
    </>
  );

  return (
    <div className="space-y-4">
      <BackLink href="/classbot/me">내 정보</BackLink>

      <PageHeader eyebrow={{ icon: BarChart3, text: '학습 기록' }} title="성취기준 달성도" />

      {/* 기간 고르기 — 고르면 아래 숫자가 통째로 바뀐다. */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPillButtons
          options={PROGRESS_PERIOD_OPTIONS}
          current={period}
          onSelect={setPeriod}
          shape="tab"
        />
        <span className="text-pullim-slate-500 inline-flex items-center gap-1 text-2xs">
          <CalendarRange className="h-3 w-3" />
          {snapshot.rangeLabel}
        </span>
      </div>

      <KpiStatBar cols={4}>
        <KpiStat label="공부한 시간" value={snapshot.summary.studyTimeLabel} icon={Clock} />
        <KpiStat label="끝낸 과제" value={snapshot.summary.doneCountLabel} tone="accent" icon={Target} />
        <KpiStat label="봇과 주고받음" value={snapshot.summary.botTurnLabel} icon={MessageCircle} />
        <KpiStat label="평균 달성도" value={snapshot.summary.avgAttainmentLabel} tone="success" icon={TrendingUp} />
      </KpiStatBar>

      <ContextRail railWidth="md" stickyRail rail={rail}>
        <StandardsSection standards={snapshot.standards} />
        <TimelineSection days={snapshot.timeline} meta={snapshot.timelineMeta} />
        <SubmissionSection rows={snapshot.submissions} meta={snapshot.submissionsMeta} />
      </ContextRail>
    </div>
  );
}

/* ─── 성취기준별 달성도 — 이 화면의 본론 ─── */
function StandardsSection({ standards }: { standards: AchievementStandard[] }) {
  return (
    <section>
      <SectionHeading
        title="성취기준별 달성도"
        action={<ComingSoonButton note="기준 → 문항·대화 이동" aria-label="기준별 문항 보기">기준별 문항</ComingSoonButton>}
      />
      {standards.length === 0 ? (
        <EmptyState
          icon={Target}
          title="아직 쌓인 기준이 없어요"
          description="봇과 한 번 공부하면 여기에 기준이 생겨요."
        />
      ) : (
        <ul className="space-y-2">
          {standards.map(s => <StandardRow key={s.id} standard={s} />)}
        </ul>
      )}
    </section>
  );
}

function StandardRow({ standard: s }: { standard: AchievementStandard }) {
  const face = progressBotFace(s.botId);
  const hex = botSignature({ id: s.botId, subject: face.subject }).hex;
  return (
    <li className="bg-card rounded-2xl border border-l-[3px] p-4" style={{ borderLeftColor: hex }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-pullim-slate-900 text-sm font-bold">{s.statement}</p>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            {face.name} · {s.unitLabel}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-micro font-bold', attainmentChipClass[s.level])}>
          {attainmentLabel[s.level]}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${s.percent}%`, backgroundColor: hex }}
          />
        </div>
        <span className="text-pullim-slate-500 font-mono text-micro font-bold">{s.percent}%</span>
      </div>

      <p className="text-pullim-slate-600 mt-2 text-2xs leading-relaxed">{s.evidence}</p>
    </li>
  );
}

/* ─── 봇과의 학습 이력 ─── */
function TimelineSection({ days, meta }: { days: LearningTimelineDay[]; meta: string }) {
  return (
    <section>
      <SectionHeading
        title="봇과의 학습 이력"
        description={meta}
        action={<ComingSoonButton note="지난 기록 더 불러오기">더 보기</ComingSoonButton>}
      />
      {days.length === 0 ? (
        <EmptyState icon={MessageCircle} title="아직 학습 기록이 없어요" description="봇과 대화하면 여기에 하루씩 쌓여요." />
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <div key={day.dayLabel} className="space-y-1.5">
              <p className="text-pullim-slate-400 px-1 text-micro font-bold tracking-wider uppercase">
                {day.dayLabel}
              </p>
              <ul className="space-y-1.5">
                {day.items.map(item => {
                  const face = progressBotFace(item.botId);
                  const hex = botSignature({ id: item.botId, subject: face.subject }).hex;
                  return (
                    <li key={item.id} className="bg-card flex items-start gap-3 rounded-2xl border p-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                        style={{ backgroundColor: hex }}
                      >
                        {face.avatarEmoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-micro">
                          <span className="text-pullim-slate-500 font-bold">{face.name}</span>
                          <span className="text-pullim-slate-300">·</span>
                          <span className="text-pullim-slate-500">{item.timeLabel}</span>
                          <span className="text-pullim-slate-500 ml-auto font-mono font-bold">{item.durationLabel}</span>
                        </div>
                        <p className="text-pullim-slate-900 mt-0.5 text-sm font-bold">{item.title}</p>
                        <p className="text-pullim-slate-600 mt-0.5 text-2xs leading-relaxed">{item.summary}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── 과제 제출 이력 ─── */
function SubmissionSection({ rows, meta }: { rows: SubmissionHistoryRow[]; meta: string }) {
  return (
    <section>
      <SectionHeading
        title="과제 낸 기록"
        description={meta}
        action={<ComingSoonButton note="기록 → 과제 상세 이동" aria-label="과제 상세로 가기">과제</ComingSoonButton>}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="아직 낸 과제가 없어요" description="과제를 내면 여기에 남아요." />
      ) : (
        <ul className="space-y-1.5">
          {rows.map(r => {
            const face = progressBotFace(r.botId);
            return (
              <li key={r.id} className="bg-card rounded-2xl border p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-pullim-slate-900 text-sm font-bold">{r.title}</p>
                    <p className="text-pullim-slate-500 mt-0.5 text-2xs">
                      {face.name} · {r.classroomLabel} · {r.dateLabel}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-micro font-bold', submissionStatusChipClass[r.status])}>
                    {submissionStatusLabel[r.status]}
                  </span>
                </div>
                <p className="text-pullim-slate-600 mt-1.5 text-2xs">{r.feedbackLabel}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ─── 기간별 성장 추이 — 무거운 차트 대신 막대 ─── */
function GrowthTrendCard({ snapshot }: { snapshot: ProgressSnapshot }) {
  const { points, caption, deltaLabel } = snapshot.trend;
  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="성장 추이"
        description={caption}
        action={
          <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold">
            <TrendingUp className="h-3 w-3" />
            {deltaLabel}
          </span>
        }
      />
      <Sparkbar
        data={points.map(p => ({ value: p.value, key: p.label, title: `${p.label}: ${p.value}%` }))}
        fill={() => 'bg-pullim-blue-500'}
        fillMode="class"
        heightPx={72}
        minBarPx={6}
        aria-label={`기간별 평균 달성도 — ${points.map(p => `${p.label} ${p.value}%`).join(', ')}`}
      />
      <div className="text-pullim-slate-400 mt-1 flex justify-between text-micro font-semibold">
        {points.map(p => <span key={p.label}>{p.label}</span>)}
      </div>
    </section>
  );
}
