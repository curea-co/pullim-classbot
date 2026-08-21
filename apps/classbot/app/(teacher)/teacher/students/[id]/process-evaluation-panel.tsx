'use client';

import { useState } from 'react';
import { SectionHeading } from '@/components/shell/section-heading';
import { ScoreDisplay } from '@/components/classbot/score-display';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { ProcessCriterion } from '@/lib/mock/classbot-student-report';

/**
 * 과정 평가 패널 — 결과물이 아니라 과정을 본다.
 *
 * 점수 출발값은 학생의 도달 상태·사고 수준·지름길 수치에서 계산된 값이다
 * (`buildProcessEvaluation`). 관제소와 다른 숫자를 새로 만들지 않기 위해서다.
 *
 * 「평가에 반영」은 지금 **화면 동작까지만** 한다 — 저장 자리는 handleApply 에 표시해 뒀다.
 */
export function ProcessEvaluationPanel({
  studentId,
  studentName,
  criteria,
}: {
  studentId: string;
  studentName: string;
  criteria: ProcessCriterion[];
}) {
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(criteria.map(c => [c.id, c.suggested])),
  );
  const [comment, setComment] = useState('');
  const [applied, setApplied] = useState(false);

  const total = criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
  const maxTotal = criteria.reduce((sum, c) => sum + c.weight, 0);

  function updateScore(id: string, value: number) {
    setScores(prev => ({ ...prev, [id]: value }));
    setApplied(false);
  }

  function handleApply() {
    // TODO(BE): 저장 자리 — POST /api/teacher/students/{studentId}/process-evaluation
    //   body: { scores, comment, period }
    // 지금은 저장하지 않고 화면에만 반영한다. BE 붙일 때 이 함수 안만 갈아끼우면 된다.
    void studentId;
    setApplied(true);
  }

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title="과정 평가"
        description={`${studentName} 학생이 답에 이르기까지 무엇을 했는지 봐요. AI 제안 점수는 출발점이고, 정하는 사람은 선생님이에요.`}
        action={
          <div className="text-right">
            <div className="text-pullim-slate-400 text-micro font-bold tracking-wider uppercase">합계</div>
            <ScoreDisplay score={total} max={maxTotal} size="lg" tone="fixed-accent" />
          </div>
        }
      />

      <ul className="space-y-3">
        {criteria.map(c => (
          <li key={c.id} className="bg-pullim-slate-50/50 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-pullim-slate-900 text-xs font-bold">{c.label}</span>
                  <span className="text-pullim-slate-400 font-mono text-micro">배점 {c.weight}</span>
                </div>
                <p className="text-pullim-slate-500 mt-0.5 text-2xs leading-relaxed">
                  <span className="text-pullim-slate-400 font-bold">이유:</span> {c.reason}
                </p>
              </div>
              <ScoreDisplay score={scores[c.id] ?? 0} max={c.weight} size="md" tone="threshold" />
            </div>
            <Slider
              min={0}
              max={c.weight}
              step={1}
              value={scores[c.id] ?? 0}
              onValueChange={v => updateScore(c.id, Array.isArray(v) ? v[0] : v)}
              aria-label={`${c.label} 점수`}
              className="mt-2"
            />
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <label htmlFor="process-comment" className="text-pullim-slate-700 text-xs font-bold">
          선생님 의견
        </label>
        <Textarea
          id="process-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="학생에게 남길 한마디 — 예: 평평한 구간을 스스로 다시 설명한 부분이 좋았어요."
          className="mt-1 rounded-xl text-sm leading-relaxed"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleApply}>
          평가에 반영
        </Button>
        {applied && (
          <span className="text-pullim-blue-700 bg-pullim-blue-50 rounded-lg px-2.5 py-1.5 text-2xs font-bold">
            화면에 반영됐어요 — 합계 {total}/{maxTotal}점. 아직 저장되지는 않아요.
          </span>
        )}
      </div>
    </section>
  );
}
