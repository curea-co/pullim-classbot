'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, MessageSquare, FileText, UserRound } from 'lucide-react';
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
import { gradingStudentName, studentHrefOfGrading } from '@/lib/mock/classbot-grading-roster';
import {
  useGradingStore,
  useGradingDecision,
  type GradingRubricItem,
} from '@/lib/store/grading';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 루브릭이 AI 초안에서 달라졌는지 — **항목별로** 본다.
 * 총합만 비교하면 40/30/20/10 → 35/35/20/10 처럼 배분만 바꾼 수정이 「안 고침」으로 읽혀
 * 「수정 후 승인」이 잠긴 채 저장할 수 없다. 항목별 배분 조정이 채점 허브의 핵심이다.
 */
function rubricChangedFrom(item: GradingItem, rubric: GradingRubricItem[]): boolean {
  if (rubric.length !== item.rubric.length) return true;
  return rubric.some((r, i) => r.score !== item.rubric[i].score);
}

export function GradingDetail({
  item, history, prevId, nextId,
}: {
  item: GradingItem;
  history: GradingHistoryEntry[];
  prevId: string | null;
  nextId: string | null;
}) {
  // 확정은 store(localStorage persist)가 진실 — 화면 상태로만 들고 있으면 새로고침에 사라진다.
  const decision = useGradingDecision(item.id);
  const hydrated = useStoresHydrated(useGradingStore);
  const approve = useGradingStore((s) => s.approve);
  const approveWithEdit = useGradingStore((s) => s.approveWithEdit);

  // 편집 중 값 — 확정 전까지만 쓰인다.
  const [commentDraft, setCommentDraft] = useState(item.draftComment);
  const [rubricDraft, setRubricDraft] = useState<GradingRubricItem[]>(item.rubric);

  /**
   * rehydrate 전에는 확정본을 모른다 — 시드만 보고 판단해 SSR 결과와 같게 두고,
   * 복원된 뒤에야 확정본이 편집 중 값을 이긴다(잘못된 상태가 번쩍이지 않게).
   */
  const decided = hydrated ? decision : undefined;
  const finalComment = decided?.comment ?? commentDraft;
  const rubric = decided?.rubric ?? rubricDraft;
  const rubricTotal = useMemo(() => rubric.reduce((s, r) => s + r.score, 0), [rubric]);

  /** 확정 방식 — store 확정이 시드 status 를 이긴다. null = 아직 미확정. */
  const seedDecided = item.status === 'approved' || item.status === 'overridden' ? item.status : null;
  const decidedKind = decided?.kind ?? seedDecided;
  const isApproved = decidedKind !== null;

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
    return scoreChanged || commentChanged || rubricChangedFrom(item, rubric);
  }, [finalScore, finalComment, rubric, item]);

  const isCrisis = (item.type === 'essay' && item.responsePreview.length < 25) || /모르겠|어려워|힘들/.test(item.responsePreview);

  /** 그대로 승인 — AI 초안(점수·의견·루브릭)을 손대지 않은 확정. */
  function handleApprove() {
    approve({
      itemId: item.id,
      finalScore: item.draftScore,
      maxScore: item.maxScore,
      comment: item.draftComment,
      rubric: item.rubric,
    });
  }

  /** 수정 후 승인 — 교사가 고친 점수·의견·루브릭과 변경률을 함께 남긴다. */
  function handleApproveWithEdit() {
    approveWithEdit({
      itemId: item.id,
      finalScore,
      maxScore: item.maxScore,
      comment: finalComment,
      rubric,
      overrideDelta,
    });
  }

  // 이름은 등록 학생 명단 쪽(성 포함)으로 — 채점 시드 이름과 학생 상세 이름이 갈리지 않게.
  const studentName = gradingStudentName(item);
  const studentHref = studentHrefOfGrading(item);

  return (
    <div className="space-y-4 py-4 lg:py-6">
      {/* 네비 */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/grading?view=queue"
          className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="h-3 w-3" />
          채점 대기 큐로
        </Link>
        <div className="flex items-center gap-1">
          {/* 점수 옆에서 바로 「무슨 대화를 했는지」로 건너간다 — 상세는 이미 있는 화면이다 */}
          {studentHref ? (
            <Link
              href={studentHref}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 mr-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-bold"
            >
              <UserRound className="h-3 w-3" />
              대화 기록
            </Link>
          ) : null}
          {prevId ? (
            <Link
              href={`/teacher/grading/${prevId}`}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-bold"
            >
              <ChevronLeft className="h-3 w-3" /> 이전 학생
            </Link>
          ) : null}
          {nextId ? (
            <Link
              href={`/teacher/grading/${nextId}`}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-2xs font-bold"
            >
              다음 학생 <ChevronRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>

      <PageHeader
        eyebrow={{ icon: FileText, text: `${item.assignmentTitle} · ${item.topic}` }}
        title={<>{studentName} 학생 검수</>}
        description={`제출 ${item.submittedAt} · ${item.type === 'essay' ? '서술형' : item.type === 'short' ? '단답' : '수치'} · AI 신뢰도 ${item.aiConfidence}%`}
        action={
          decidedKind ? (
            <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold">
              <Check className="h-3 w-3" />
              {decidedKind === 'overridden' ? '수정 후 승인 완료' : '승인 완료'}
            </span>
          ) : null
        }
      />

      {/* 위기 게이트 — 점수 영역 위 */}
      {isCrisis && <CrisisGate studentName={studentName} />}

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
              description={`${studentName} 학생의 추세`}
            />
            {history.length === 0 ? (
              <EmptyState title="이력 없음" size="sm" tone="plain" />
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 5).map((h, i) => {
                  return (
                    <li key={i} className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg p-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-pullim-slate-700 truncate text-2xs font-semibold">{h.assignmentTitle}</div>
                        <div className="text-pullim-slate-400 text-micro">{h.gradedAt}</div>
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
            <p className="text-pullim-slate-500 text-2xs leading-relaxed">
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
          // 확정본이 복원되면 remount 해 슬라이더까지 저장값으로 되돌린다.
          key={decided ? `decided:${decided.decidedAt}` : 'draft'}
          initialRubric={rubric}
          onChange={(next) => {
            setRubricDraft(next);
          }}
          // 확정한 채점은 잠근다 — 저장값이 진실이라 여기서 고쳐도 반영되지 않는다(코멘트와 같은 규칙).
          readOnly={isApproved}
        />

        {/* 코멘트 편집 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title="AI 초안 코멘트"
            description="필요하면 직접 수정하거나 한 줄 더해주세요."
          />
          <Textarea
            value={finalComment}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={4}
            maxLength={500}
            // 확정한 채점은 잠근다 — 저장값이 진실이라 여기서 고쳐도 반영되지 않는다.
            readOnly={isApproved}
            aria-label="AI 초안 코멘트"
            className="rounded-xl text-sm leading-relaxed"
          />
          <div className="text-pullim-slate-400 mt-1 text-right text-micro font-mono">
            {finalComment.length}/500
          </div>
        </section>

        {/* 액션 바 */}
        <section className="bg-card border sticky bottom-4 rounded-2xl p-3 shadow-pullim-md">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-pullim-slate-500 text-micro font-bold tracking-wider uppercase">최종 점수</div>
              <ScoreDisplay score={finalScore} max={item.maxScore} size="xl" tone="threshold" />
            </div>
            <Button
              type="button"
              size="lg"
              onClick={handleApprove}
              disabled={!hydrated || isApproved || dirty}
              className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-800"
            >
              그대로 승인
            </Button>
            <Button
              type="button"
              variant="pullim-lemon"
              size="lg"
              onClick={handleApproveWithEdit}
              disabled={!hydrated || isApproved || !dirty}
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
