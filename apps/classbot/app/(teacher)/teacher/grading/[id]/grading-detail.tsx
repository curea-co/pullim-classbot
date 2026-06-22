'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, MessageSquare, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import { RubricEditor } from '@/components/classbot/rubric-editor';
import { ScoreDisplay } from '@/components/classbot/score-display';
import { OverrideDeltaMeter } from '@/components/classbot/override-delta-meter';
import { CrisisGate } from '@/components/classbot/crisis-gate';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { GradingItem, GradingHistoryEntry } from '@/lib/mock';
import { cn } from '@/lib/utils';

/** Initial rubric total (sum of per-item scores, 0-100 pct basis). */
function initialRubricTotal(item: GradingItem): number {
  return item.rubric.reduce((s, r) => s + r.score, 0);
}

export function GradingDetail({
  item, history, prevId, nextId,
}: {
  item: GradingItem;
  history: GradingHistoryEntry[];
  prevId: string | null;
  nextId: string | null;
}) {
  const [finalComment, setFinalComment] = useState(item.draftComment);
  const [rubricTotal, setRubricTotal] = useState(() => initialRubricTotal(item));
  const [isApproved, setIsApproved] = useState(item.status === 'approved' || item.status === 'overridden');

  /** Derived — not stored — recomputed only when rubricTotal changes. */
  const finalScore = useMemo(
    () => Math.round(item.maxScore * rubricTotal / 100),
    [item.maxScore, rubricTotal],
  );

  const overrideDelta = useMemo(() => {
    const scoreDelta = Math.abs(item.draftScore - finalScore) / item.maxScore * 100;
    return Math.round(scoreDelta);
  }, [item.draftScore, item.maxScore, finalScore]);

  /** dirty = any value diverges from the original AI draft. */
  const dirty = useMemo(() => {
    const scoreChanged = finalScore !== item.draftScore;
    const commentChanged = finalComment !== item.draftComment;
    const rubricChanged = rubricTotal !== initialRubricTotal(item);
    return scoreChanged || commentChanged || rubricChanged;
  }, [finalScore, finalComment, rubricTotal, item]);

  const isCrisis = (item.type === 'essay' && item.responsePreview.length < 25) || /모르겠|어려워|힘들/.test(item.responsePreview);

  function handleApprove() {
    setIsApproved(true);
  }

  function handleApproveWithEdit() {
    setIsApproved(true);
  }

  return (
    <div className="space-y-4 py-4 lg:py-6">
      {/* 네비 */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/grading"
          className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="h-3 w-3" />
          채점 큐로
        </Link>
        <div className="flex items-center gap-1">
          {prevId ? (
            <Link
              href={`/teacher/grading/${prevId}`}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            >
              <ChevronLeft className="h-3 w-3" /> 이전 학생
            </Link>
          ) : null}
          {nextId ? (
            <Link
              href={`/teacher/grading/${nextId}`}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            >
              다음 학생 <ChevronRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>

      <PageHeader
        eyebrow={{ icon: FileText, text: `${item.assignmentTitle} · ${item.topic}` }}
        title={<>{item.studentName} 학생 검수</>}
        description={`제출 ${item.submittedAt} · ${item.type === 'essay' ? '서술형' : item.type === 'short' ? '단답' : '수치'} · AI 신뢰도 ${item.aiConfidence}%`}
        action={
          isApproved ? (
            <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold">
              <Check className="h-3 w-3" /> 승인 완료
            </span>
          ) : null
        }
      />

      {/* 위기 게이트 — 점수 영역 위 */}
      {isCrisis && <CrisisGate studentName={item.studentName} />}

      {/* 메인 2-col */}
      <ContextRail
        railWidth="lg"
        stickyRail
        rail={<>
          <OverrideDeltaMeter currentDelta={overrideDelta} />

          {/* 학생 최근 5회 이력 */}
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading
              title="이 학생 최근 채점"
              description={`${item.studentName} 학생의 추세`}
            />
            {history.length === 0 ? (
              <EmptyState title="이력 없음" size="sm" tone="plain" />
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 5).map((h, i) => {
                  return (
                    <li key={i} className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg p-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-pullim-slate-700 truncate text-[11px] font-semibold">{h.assignmentTitle}</div>
                        <div className="text-pullim-slate-400 text-[10px]">{h.gradedAt}</div>
                      </div>
                      <ScoreDisplay score={h.score} max={h.maxScore} size="sm" tone="threshold" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 면담 메모 안내 */}
          <AlertCard tone="info" icon={MessageSquare} title="1:1 면담 메모">
            <p className="text-pullim-slate-500 text-[11px] leading-relaxed">
              여기서 작성한 메모는 학생 개인 리포트에 자동 첨부돼 학생에게 부드러운 형태로 전달돼요.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              aria-disabled="true"
              title="준비 중 (v2 — 면담 메모)"
              className="mt-2 w-full opacity-60 cursor-not-allowed"
            >
              메모 작성하기
            </Button>
          </AlertCard>
        </>}
      >
        {/* 학생 응답 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading title="학생 응답" description="원본 그대로 노출됩니다." />
          <div className="bg-pullim-slate-50 rounded-xl p-4">
            <p className="text-pullim-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {item.responsePreview}
            </p>
          </div>
        </section>

        {/* 루브릭 */}
        <RubricEditor
          initialRubric={item.rubric}
          onChange={(_next, total) => {
            setRubricTotal(total);
          }}
        />

        {/* 코멘트 편집 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title="AI 초안 코멘트"
            description="필요하면 직접 수정하거나 한 줄 더해주세요."
          />
          <Textarea
            value={finalComment}
            onChange={(e) => setFinalComment(e.target.value)}
            rows={4}
            maxLength={500}
            aria-label="AI 초안 코멘트"
            className="rounded-xl text-sm leading-relaxed"
          />
          <div className="text-pullim-slate-400 mt-1 text-right text-[10px] font-mono">
            {finalComment.length}/500
          </div>
        </section>

        {/* 액션 바 */}
        <section className="bg-card border sticky bottom-4 rounded-2xl p-3 shadow-pullim-md">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">최종 점수</div>
              <ScoreDisplay score={finalScore} max={item.maxScore} size="xl" tone="threshold" />
            </div>
            <Button
              type="button"
              size="lg"
              onClick={handleApprove}
              disabled={isApproved || dirty}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-800"
            >
              그대로 승인
            </Button>
            <Button
              type="button"
              variant="pullim-lemon"
              size="lg"
              onClick={handleApproveWithEdit}
              disabled={isApproved || !dirty}
            >
              <Check />
              수정 후 승인
            </Button>
          </div>
        </section>
      </ContextRail>
    </div>
  );
}
