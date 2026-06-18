'use client';

import { useState } from 'react';
import type { GradingItem } from '@/lib/mock';
import { Slider } from '@/components/ui/slider';
import { ScoreDisplay } from '@/components/classbot/score-display';

type RubricItem = GradingItem['rubric'][number];

/**
 * 루브릭 인라인 편집기 — 항목별 점수 슬라이더 + 사유 표시.
 * spec 11 § 3.3.2.
 */
export function RubricEditor({
  initialRubric,
  onChange,
}: {
  initialRubric: RubricItem[];
  onChange?: (next: RubricItem[], total: number) => void;
}) {
  const [rubric, setRubric] = useState<RubricItem[]>(initialRubric);

  function updateScore(idx: number, value: number) {
    const next = rubric.map((r, i) => i === idx ? { ...r, score: value } : r);
    setRubric(next);
    const total = next.reduce((s, r) => s + r.score, 0);
    onChange?.(next, total);
  }

  const totalPct = rubric.reduce((s, r) => s + r.score, 0);
  const weightSum = rubric.reduce((s, r) => s + r.weight, 0);

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-pullim-slate-900 text-sm font-bold">루브릭 검수</h3>
          <p className="text-pullim-slate-500 text-[11px]">
            항목별 점수를 보고 필요하면 조정해주세요. (가중치 합 {weightSum}%)
          </p>
        </div>
        <div className="text-right">
          <div className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">최종</div>
          <ScoreDisplay score={totalPct} max={100} size="lg" tone="fixed-accent" />
        </div>
      </header>

      <ul className="space-y-3">
        {rubric.map((r, i) => {
          return (
            <li key={r.criterion} className="bg-pullim-slate-50/50 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-pullim-slate-900 text-xs font-bold">{r.criterion}</span>
                    <span className="text-pullim-slate-400 font-mono text-[10px]">가중 {r.weight}%</span>
                  </div>
                  <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
                    <span className="text-pullim-slate-400 font-bold">AI 사유:</span> {r.reason}
                  </p>
                </div>
                <div className="text-right">
                  <ScoreDisplay score={r.score} max={r.weight} size="md" tone="threshold" />
                </div>
              </div>
              <Slider
                min={0}
                max={r.weight}
                step={1}
                value={r.score}
                onValueChange={(v) => updateScore(i, Array.isArray(v) ? v[0] : v)}
                aria-label={`${r.criterion} 점수`}
                className="mt-2"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
