'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { getWellbeingTrend, type WellbeingSnapshot } from '@/lib/mock';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';

/**
 * 웰빙 지수 게이지 + 7일 추세 + 5지표 펼침.
 * 권위: spec 13 § 5.1·9.1.2·9.2 · [08 § 1.2.1] (메타 컬러 가이드).
 *
 * 7일 막대 컬러 매핑 ([13 § 9.1.2]):
 *   0–40 danger / 41–60 warning / 61–80 brand.300 / 81–100 success
 */
export function WellbeingGauge({
  studentId,
  compact,
  audience = 'student-chat',
}: {
  studentId: string;
  compact?: boolean;
  /**
   * 화면 컨텍스트별 봇 인사이트 + CTA 분기 ([13 § 9.2] 봇 인사이트 + actionable CTA는 학생 화면 필수):
   * - `'student-chat'` (default, /classbot/wellness): 봇 인사이트 + 봇 채팅 진입 CTA
   * - `'student-self'` (/classbot/me/report): 봇 인사이트 텍스트 유지 + CTA를 "다음 주 도전" → `/classbot/assignment` 로 override ([13 § 3.3.5] "다음 주 도전: 봇 처방" 정합)
   * - `'teacher'` (/teacher/reports/[id]): 봇 인사이트 미노출 + 관찰 중성 카피 — 역할 혼선 방지
   */
  audience?: 'student-chat' | 'student-self' | 'teacher';
}) {
  const trend = getWellbeingTrend(studentId);
  // 학생 화면(student-chat / student-self)에는 봇 인사이트 합성 — § 9.2 필수 요소.
  // student-self에서는 CTA만 me/report 맥락(다음 주 도전 → /classbot/assignment)으로 override.
  const rawInsight = audience !== 'teacher' ? getWellnessBotComment(studentId) : null;
  const botInsight = rawInsight && audience === 'student-self'
    ? { ...rawInsight, ctaHref: '/classbot/assignment', ctaLabel: '다음 주 도전' }
    : rawInsight;
  const [open, setOpen] = useState(false);

  if (trend.length === 0) {
    return (
      <section className="bg-card rounded-2xl border p-4 text-center">
        <p className="text-pullim-slate-500 text-xs">웰빙 데이터가 아직 없어요.</p>
      </section>
    );
  }

  const today = trend[trend.length - 1];
  const score = today.score;
  const tone = scoreTone(score);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Heart className={cn('h-3 w-3', tone.text)} />
        <span className={cn('font-mono text-sm font-bold', tone.text)}>{score}</span>
        <span className="text-pullim-slate-400 text-[11px]">/100</span>
      </div>
    );
  }

  return (
    <section className="bg-card rounded-2xl border p-4">
      {/* [13 § 9.2] affordance: 헤더 + 점수 영역 자체 클릭으로 펼침 토글 (`[ⓘ] 또는 게이지 카드 자체 클릭`) */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="wellbeing-breakdown"
        aria-label="5지표 분해 보기"
        className="w-full text-left"
      >
        <header className="mb-3 flex items-center gap-2">
          <Heart className={cn('h-4 w-4', tone.text)} />
          <div className="flex-1">
            <h3 className="text-pullim-slate-900 text-sm font-bold">웰빙 지수</h3>
            <p className="text-pullim-slate-500 text-[11px]">5지표 가중 평균 · 0~100</p>
          </div>
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold', tone.chipBg, tone.chipText)}>
            {tone.label}
          </span>
        </header>

        <div className="flex items-end gap-2">
          <div className={cn('font-mono text-4xl font-bold', tone.text)}>{score}</div>
          <div className="text-pullim-slate-500 mb-1.5 text-sm">/ 100</div>
          <span className="text-pullim-slate-500 ml-auto inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold">
            5지표 {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </div>
      </button>

      {/* [13 § 9.2 · 10.1] 5지표 펼침 모션 — duration-base 200ms easing-standard, grid-row 패턴 (max-height 없이 부드러운 collapse) */}
      {/* a11y: 접힌 상태 inner Link/button이 키보드 포커스 받지 않도록 `inert` 적용 (React 19+ native support) */}
      <div
        id="wellbeing-breakdown"
        className={cn(
          'grid transition-[grid-template-rows] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        style={{
          transitionDuration: 'var(--duration-base)',
          transitionTimingFunction: 'var(--easing-standard)',
        }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ComponentBreakdown snapshot={today} botInsight={botInsight} audience={audience} />
        </div>
      </div>

      {/* 7일 추세 — 새 컬러 매핑 ([13 § 9.1.2]) */}
      <div className="mt-3">
        <div className="text-pullim-slate-500 mb-1 text-[11px] font-bold tracking-wider uppercase">최근 7일</div>
        <div className="flex h-12 items-end gap-1">
          {trend.map((t) => {
            const h = Math.max(8, (t.score / 100) * 48);
            const c = scoreTone(t.score).bar;
            return (
              <div
                key={t.daysAgo}
                className={cn('w-full rounded-sm', c)}
                style={{ height: `${h}px` }}
                title={`${t.daysAgo === 0 ? '오늘' : `${t.daysAgo}일 전`}: ${t.score}`}
              />
            );
          })}
        </div>
        <div className="text-pullim-slate-500 mt-1 flex justify-between text-[11px]">
          <span>7일 전</span>
          <span>오늘</span>
        </div>
      </div>

      {today.flag && (
        <div className="border-pullim-danger/30 bg-pullim-danger-bg mt-3 rounded-lg border p-2">
          <p className="text-pullim-danger text-[11px] font-bold">
            {today.flag === 'below-60-3days' ? '3일 연속 임계 미달 — 교사에게 알림 갔어요.' : '즉시 알림 — 선생님이 곧 연락해요.'}
          </p>
        </div>
      )}
    </section>
  );
}

/** [13 § 9.1.2] 점수 → 컬러 매핑 — 4단계 (danger/warning/brand.300/success) */
function scoreTone(score: number) {
  if (score >= 81) {
    return {
      text: 'text-pullim-success',
      bar: 'bg-pullim-success',
      chipBg: 'bg-pullim-success-bg',
      chipText: 'text-pullim-success',
      label: '좋아요',
    };
  }
  if (score >= 61) {
    return {
      text: 'text-pullim-blue-600',
      bar: 'bg-pullim-blue-300',
      chipBg: 'bg-pullim-blue-50',
      chipText: 'text-pullim-blue-700',
      label: '괜찮아요',
    };
  }
  if (score >= 41) {
    return {
      text: 'text-pullim-warn',
      bar: 'bg-pullim-warn',
      chipBg: 'bg-pullim-warn-bg',
      chipText: 'text-pullim-warn',
      label: '신경 써요',
    };
  }
  return {
    text: 'text-pullim-danger',
    bar: 'bg-pullim-danger',
    chipBg: 'bg-pullim-danger-bg',
    chipText: 'text-pullim-danger',
    label: '곁에 있어요',
  };
}

/** 5지표 분해 ([13 § 9.2]) — 수면·집중·감정·사회·학업 + 봇 인사이트 1줄 + actionable CTA */
function ComponentBreakdown({
  snapshot,
  botInsight,
  audience,
}: {
  snapshot: WellbeingSnapshot;
  botInsight: ReturnType<typeof getWellnessBotComment>;
  /** 화면별 fallback 카피 분기 — [WellbeingGauge audience prop 참고] */
  audience: 'student-chat' | 'student-self' | 'teacher';
}) {
  const c = snapshot.components;
  if (!c) {
    return (
      <div className="bg-pullim-slate-50 mt-3 rounded-lg p-3 text-[11px] text-pullim-slate-500">
        오늘 분해 데이터를 준비 중이에요. 곧 보일 거예요.
      </div>
    );
  }
  const items: { key: keyof NonNullable<WellbeingSnapshot['components']>; label: string }[] = [
    { key: 'sleep',    label: '수면' },
    { key: 'focus',    label: '집중' },
    { key: 'mood',     label: '감정' },
    { key: 'social',   label: '사회' },
    { key: 'academic', label: '학업' },
  ];
  // 가장 점수 낮은 지표 — 봇 인사이트 1줄에 활용
  const lowest = items.reduce((acc, cur) => (c[cur.key] < c[acc.key] ? cur : acc), items[0]);
  const insightSig = botInsight ? botSignature(botInsight.bot) : null;

  return (
    <div className="bg-pullim-slate-50 mt-3 space-y-2 rounded-lg p-3">
      <ul className="space-y-1.5">
        {items.map(it => {
          const v = c[it.key];
          const tone = scoreTone(v);
          return (
            <li key={it.key} className="flex items-center gap-2 text-[11px]">
              <span className="text-pullim-slate-700 w-10 shrink-0 font-semibold">{it.label}</span>
              <div className="bg-pullim-slate-200 relative h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full', tone.bar)}
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className={cn('w-8 text-right font-mono font-bold', tone.text)}>{v}</span>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-pullim-slate-200 pt-2">
        {botInsight && insightSig ? (
          <div className="flex flex-col gap-2">
            <p className="text-pullim-slate-700 text-[11px] leading-relaxed">
              <span className="font-bold">{botInsight.bot.avatarEmoji} {botInsight.bot.name}</span>
              {/* [13 § 8.3] 학생 가시 영역 — "낮아요"/"부족" 금지, "신경 쓸 부분"으로 완화 */}
              <span className="text-pullim-slate-500">: 이번 주 {lowest.label} 신경 쓸 부분이에요. {botInsight.text}</span>
            </p>
            <Link
              href={botInsight.ctaHref}
              className="inline-flex w-fit items-center gap-1 rounded-full border-[1.5px] bg-transparent px-3 py-1 text-[11px] font-bold transition-colors hover:bg-white"
              style={{ borderColor: insightSig.inkLight, color: insightSig.inkLight }}
            >
              {botInsight.ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : audience === 'teacher' ? (
          // 교사 화면 — 학생 상태 관찰형 카피 ([13 § 9.1.2] 교사 화면은 직접적 표현 가능)
          <p className="text-pullim-slate-600 text-[11px] leading-relaxed">
            이번 주 신경 쓸 영역: {lowest.label}. 학생과 1:1 면담을 권장해요.
          </p>
        ) : audience === 'student-self' ? (
          // 본인 리포트 톤 — 자기 성찰 컨텍스트, 봇 권유 없이 신경 쓸 부분만 짚어줌
          <p className="text-pullim-slate-600 text-[11px] leading-relaxed">
            🌱 이번 주 {lowest.label} 신경 써볼 부분이에요. 다음 주에 조금씩 같이 가봐요.
          </p>
        ) : (
          // student-chat fallback (botInsight 합성 실패 시) — § 8.3 완화 표현
          <p className="text-pullim-slate-600 text-[11px] leading-relaxed">
            💡 이번 주 {lowest.label} 신경 쓸 부분이에요. 짧은 세션부터 다시 가볼까요?
          </p>
        )}
      </div>
    </div>
  );
}
