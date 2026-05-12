'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, MessageSquare, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { RubricEditor } from '@/components/classbot/rubric-editor';
import { OverrideDeltaMeter } from '@/components/classbot/override-delta-meter';
import { CrisisGate } from '@/components/classbot/crisis-gate';
import type { GradingItem, GradingHistoryEntry } from '@/lib/mock';
import { cn } from '@/lib/utils';

export function GradingDetail({
  item, history, prevId, nextId,
}: {
  item: GradingItem;
  history: GradingHistoryEntry[];
  prevId: string | null;
  nextId: string | null;
}) {
  const [finalScore, setFinalScore] = useState(item.draftScore);
  const [finalComment, setFinalComment] = useState(item.draftComment);
  const [isApproved, setIsApproved] = useState(item.status === 'approved' || item.status === 'overridden');

  const overrideDelta = useMemo(() => {
    const scoreDelta = Math.abs(item.draftScore - finalScore) / item.maxScore * 100;
    return Math.round(scoreDelta);
  }, [item.draftScore, item.maxScore, finalScore]);

  const isCrisis = item.responsePreview.length < 25 || /모르겠|어려워|힘들/.test(item.responsePreview);

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
            <span className="bg-pullim-success-bg text-pullim-success inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold">
              <Check className="h-3 w-3" /> 승인 완료
            </span>
          ) : null
        }
      />

      {/* 위기 게이트 — 점수 영역 위 */}
      {isCrisis && <CrisisGate studentName={item.studentName} />}

      {/* 메인 2-col */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
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
              const ratio = total / 100;
              setFinalScore(Math.round(item.maxScore * ratio));
            }}
          />

          {/* 코멘트 편집 */}
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading
              title="AI 초안 코멘트"
              description="필요하면 직접 수정하거나 한 줄 더해주세요."
            />
            <textarea
              value={finalComment}
              onChange={(e) => setFinalComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-xl border p-3 text-sm leading-relaxed outline-none"
            />
            <div className="text-pullim-slate-400 mt-1 text-right text-[10px] font-mono">
              {finalComment.length}/500
            </div>
          </section>

          {/* 액션 바 */}
          <section className="bg-pullim-slate-900 sticky bottom-4 rounded-2xl p-3 shadow-pullim-md">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-pullim-slate-300 text-[10px] font-bold tracking-wider uppercase">최종 점수</div>
                <div className="font-mono text-2xl font-bold text-white">
                  {finalScore}<span className="text-pullim-slate-400 text-base">/{item.maxScore}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproved || finalScore !== item.draftScore}
                className="bg-pullim-slate-700 hover:bg-pullim-slate-600 disabled:opacity-40 rounded-lg px-4 py-2 text-xs font-bold text-white"
              >
                그대로 승인
              </button>
              <button
                type="button"
                onClick={handleApproveWithEdit}
                disabled={isApproved}
                className="bg-pullim-lemon hover:opacity-90 text-pullim-lemon-ink disabled:opacity-40 rounded-lg px-4 py-2 text-xs font-bold"
              >
                <Check className="-mt-0.5 mr-1 inline h-3 w-3" />
                수정 후 승인
              </button>
            </div>
          </section>
        </div>

        {/* 사이드 */}
        <aside className="space-y-4">
          <OverrideDeltaMeter currentDelta={overrideDelta} />

          {/* 학생 최근 5회 이력 */}
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading
              title="이 학생 최근 채점"
              description={`${item.studentName} 학생의 추세`}
            />
            {history.length === 0 ? (
              <p className="text-pullim-slate-400 text-[11px]">이력 없음</p>
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 5).map((h, i) => {
                  const pct = (h.score / h.maxScore) * 100;
                  return (
                    <li key={i} className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg p-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-pullim-slate-700 truncate text-[11px] font-semibold">{h.assignmentTitle}</div>
                        <div className="text-pullim-slate-400 text-[10px]">{h.gradedAt}</div>
                      </div>
                      <div className="font-mono text-xs font-bold">
                        <span className={cn(pct >= 80 ? 'text-pullim-success' : pct >= 60 ? 'text-pullim-blue-600' : 'text-pullim-warn')}>
                          {h.score}
                        </span>
                        <span className="text-pullim-slate-400">/{h.maxScore}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 면담 메모 안내 */}
          <section className="bg-pullim-slate-50 rounded-2xl p-4">
            <h4 className="text-pullim-slate-900 inline-flex items-center gap-1 text-xs font-bold">
              <MessageSquare className="h-3 w-3" />
              1:1 면담 메모
            </h4>
            <p className="text-pullim-slate-500 mt-1 text-[11px] leading-relaxed">
              여기서 작성한 메모는 학생 개인 리포트에 자동 첨부돼 학생에게 부드러운 형태로 전달돼요.
            </p>
            <button
              type="button"
              className="border-pullim-slate-300 text-pullim-slate-700 hover:bg-pullim-slate-100 mt-2 w-full rounded-lg border px-3 py-1.5 text-[11px] font-bold"
            >
              메모 작성하기
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
