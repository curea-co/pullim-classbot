'use client';

import { useState } from 'react';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { getWellbeingTrend, type WellbeingSnapshot } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 웰빙 지수 게이지 + 7일 추세 + 5지표 펼침.
 * 권위: spec 13 § 5.1·9.1.2·9.2 · [08 § 1.2.1] (메타 컬러 가이드).
 *
 * 7일 막대 컬러 매핑 ([13 § 9.1.2]):
 *   0–40 danger / 41–60 warning / 61–80 brand.300 / 81–100 success
 */
export function WellbeingGauge({ studentId, compact }: { studentId: string; compact?: boolean }) {
  const trend = getWellbeingTrend(studentId);
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
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label="5지표 분해 보기"
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 ml-auto inline-flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-semibold"
        >
          5지표 {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* 5지표 펼침 ([13 § 9.2]) */}
      {open && (
        <ComponentBreakdown snapshot={today} />
      )}

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

/** 5지표 분해 ([13 § 9.2]) — 수면·집중·감정·사회·학업 */
function ComponentBreakdown({ snapshot }: { snapshot: WellbeingSnapshot }) {
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
      <p className="text-pullim-slate-600 border-t border-pullim-slate-200 pt-2 text-[11px] leading-relaxed">
        💡 이번 주 {lowest.label}이 가장 낮아요. 짧은 세션부터 다시 가볼까?
      </p>
    </div>
  );
}
