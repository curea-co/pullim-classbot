'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Save, Eye, Sparkles,
  CheckCircle2, Users, Calendar, BookOpen, Shield, Plus, Scale, Split,
} from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { BotNote } from '@/components/classbot/bot-note';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  classBots, classRoster, getBotCurriculum,
  type AssignmentMode, type ClassBot, type BotCurriculumUnit,
  type Assignment, type ScopeLevel,
} from '@/lib/mock';
import { useAssignmentStore, nextAssignmentId, type UserAssignment } from '@/lib/store/assignments';
import {
  QuestionListEditor, PointsTally, createDefaultQuestions, makeQuestion,
  evenlySplitPoints, sumPoints, authoredCount, gradingTally, toAssignmentQuestions,
  missingAnswerNumbers, isPartiallyAuthored, maxQuestionsFor,
  MIN_QUESTIONS, TOTAL_POINTS, type DraftQuestion,
} from './question-editor';
import { formatDueLabel, computeDDay } from '@/lib/assignment-due';
import { cn } from '@/lib/utils';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

type ModeMeta = { label: string; description: string; color: string; defaultScope: ScopeLevel };

const modeOptions: Record<AssignmentMode, ModeMeta> = {
  practice: {
    label: '연습',
    description: '봇이 단계별 힌트로 도와주는 학습용 과제',
    color: assignmentModeBadge.practice.outline,
    defaultScope: 4,
  },
  exam: {
    label: '시험',
    description: '봇 잠금 + 시간 제한 — 평가 환경',
    color: assignmentModeBadge.exam.outline,
    defaultScope: 1,
  },
  'wrong-conquest': {
    label: '오답정복',
    description: '봇이 정답·반례까지 즉시 노출 — 패턴 정복용',
    color: assignmentModeBadge['wrong-conquest'].outline,
    defaultScope: 5,
  },
};

const difficultyOptions = ['하', '중', '상'] as const;

function defaultDueLabel(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(22, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

// formatDueLabel/computeDDay 는 재발사(제출 현황 시트)와 공유 — lib/assignment-due.ts 로 추출됨.

export function AssignmentForm() {
  const router = useRouter();
  const dispatch = useAssignmentStore((s) => s.dispatch);

  // 입력 state — 초기값으로 자동 채움
  const [botId, setBotId] = useState<string>('cb_001');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<AssignmentMode>('practice');
  const [difficulty, setDifficulty] = useState<'하' | '중' | '상'>('중');
  const [unitId, setUnitId] = useState<string>(() => getBotCurriculum('cb_001')[0]?.id ?? '');
  const [questions, setQuestions] = useState<DraftQuestion[]>(createDefaultQuestions);
  const [targetIds, setTargetIds] = useState<string[]>(() => classRoster.map(s => s.id));
  const [dueIso, setDueIso] = useState(defaultDueLabel());
  const [botMessage, setBotMessage] = useState('');
  const [examTimeLimit, setExamTimeLimit] = useState(60);

  const [preview, setPreview] = useState(false);

  // 자동 채움
  const bot = useMemo<ClassBot | undefined>(() => classBots.find(b => b.id === botId), [botId]);
  const curriculum = useMemo<BotCurriculumUnit[]>(() => getBotCurriculum(botId), [botId]);
  const selectedUnit = curriculum.find(u => u.id === unitId) ?? curriculum[0];

  // 봇 변경 핸들러 — 단원 첫 항목으로 자동 reset
  function handleBotChange(nextBotId: string) {
    setBotId(nextBotId);
    const nextCurriculum = getBotCurriculum(nextBotId);
    if (nextCurriculum.length > 0) {
      setUnitId(nextCurriculum[0].id);
    }
  }

  // 검증
  const titleValid = title.trim().length >= 5 && title.trim().length <= 50;
  const targetValid = targetIds.length >= 1;
  const dueValid = new Date(dueIso).getTime() > Date.now();
  const pointsTotal = sumPoints(questions);
  // 문항 수 상한 — 종전 `문항 수` 슬라이더의 max 를 편집기가 물려받는다(연습·오답정복 50 / 시험 60).
  const maxQuestions = maxQuestionsFor(mode);
  const countValid = questions.length >= MIN_QUESTIONS && questions.length <= maxQuestions;
  const atMaxQuestions = questions.length >= maxQuestions;
  // 발문을 일부만 쓴 채 발사하면 쓴 발문이 통째로 버려지고 단원 RAG 로 대체된다 — 그 전에 막는다.
  const partiallyAuthored = isPartiallyAuthored(questions);
  // 정답을 안 정한 자동 채점 문항이 있으면 발사를 막는다 — 그대로 나가면 그 문항이 채점에서
  // 통째로 빠지거나(단답·수치), 선생님이 고르지 않은 보기가 정답으로 굳는다(객관식).
  const missingAnswers = missingAnswerNumbers(questions);
  const answersValid = missingAnswers.length === 0;

  /**
   * ② 문항 섹션이 발사를 막는 이유 한 줄 — null 이면 걸린 게 없다.
   * 먼저 걸리는 것부터 하나만 보여 준다(문항 수 → 배점 → 발문 → 정답).
   */
  function questionBlockedReason(): string | null {
    if (questions.length < MIN_QUESTIONS) return '문항을 최소 1개는 넣어야 발사할 수 있어요';
    if (questions.length > maxQuestions) {
      return `${modeOptions[mode].label} 과제는 ${maxQuestions}문항까지예요 — 지금 ${questions.length}문항`;
    }
    if (pointsTotal !== TOTAL_POINTS) return `배점 합계 ${pointsTotal}/${TOTAL_POINTS}점 — 맞춰야 발사할 수 있어요`;
    if (partiallyAuthored) {
      return `발문은 전부 쓰거나 전부 비워야 해요 — 지금 ${authoredCount(questions)}/${questions.length}개`;
    }
    if (!answersValid) return `${missingAnswers.join('·')}번 문항 정답을 정해야 발사할 수 있어요`;
    return null;
  }
  const blockedReason = questionBlockedReason();

  const canDispatch = !!bot && titleValid && targetValid && dueValid && blockedReason === null;

  function buildAssignment(): UserAssignment {
    const id = nextAssignmentId();
    // 발문을 전부 채웠을 때만 문항을 실어 보낸다 — 하나라도 비면 단원 RAG 자동 추출 규약.
    const authored = toAssignmentQuestions(id, questions);
    const assignment: UserAssignment = {
      id,
      botId,
      title: title.trim(),
      scope: selectedUnit?.fullPath ?? '단원 미정',
      subject: bot?.subject ?? '',
      grade: bot?.grade ?? '',
      chapterFrom: selectedUnit?.fullPath ?? '',
      chapterTo: selectedUnit?.fullPath ?? '',
      achievementCodes: selectedUnit?.achievementCodes ?? [],
      questionCount: questions.length,
      difficulty,
      mode,
      scopeOverride: mode === 'exam' ? 1 : undefined,
      source: 'teacher-assigned',
      assignedBy: bot?.name ?? '',
      assignedAt: '방금 발사',
      dueLabel: formatDueLabel(dueIso),
      dDay: computeDDay(dueIso),
      completedCount: 0,
      state: 'todo',
      reasonHint: botMessage.trim() || undefined,
      solveHref: `/classbot/assignment/${id}/solve?step=1`,
      // UserAssignment 확장 필드
      dispatchStatus: 'sent',
      targetStudentIds: targetIds.length === classRoster.length ? [] : targetIds,
      examTimeLimitMin: mode === 'exam' ? examTimeLimit : undefined,
      questions: authored ?? undefined,
    };
    return assignment;
  }

  function handleDispatch() {
    if (!canDispatch) return;
    const a = buildAssignment();
    dispatch(a);
    toast.success(`${a.assignedBy}이 ${targetIds.length}명에게 보냈어요`, {
      description: `"${a.title}" · ${a.dueLabel}`,
    });
    router.push('/teacher/classbot');
  }

  // 진행도
  const progress = [
    !!botId,
    titleValid,
    !!unitId && blockedReason === null,
    targetValid,
    dueValid,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 py-4 lg:py-6">
      {/* 상단 컨텍스트 바 */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/classbot"
          className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="h-3 w-3" />
          취소
        </Link>
        <span className="text-pullim-slate-400 font-mono text-micro">진행도 {progress}/5</span>
      </div>

      <PageHeader
        eyebrow={{ icon: Send, text: '새 과제' }}
        title="과제 발사하기"
        description={bot ? `${bot.name} · ${bot.subject} ${bot.grade}` : '먼저 봇을 선택해주세요'}
      />

      <div className="max-w-3xl space-y-4">
        {/* ① 정체성 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">①</span> 정체성</>}
          />

          <div className="space-y-3">
            <Field label="발사 봇" htmlFor="af-bot">
              <select
                id="af-bot"
                value={botId}
                onChange={(e) => handleBotChange(e.target.value)}
                data-testid="bot-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {classBots.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.avatarEmoji} {b.name} — {b.subject} {b.grade} ({b.enrolledCount}명)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="과제 제목" hint="5~50자" htmlFor="af-title">
              <Input
                id="af-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                placeholder="예: 일차함수 그래프 마무리 2탄"
                data-testid="title-input"
                aria-invalid={title !== '' && !titleValid}
                aria-describedby={title !== '' && !titleValid ? 'af-title-err' : undefined}
                className="h-10 text-sm"
              />
              {title !== '' && !titleValid && (
                <p id="af-title-err" className="text-pullim-danger mt-1 text-micro">제목은 5~50자 사이여야 해요.</p>
              )}
            </Field>

            <Field label="봇 개입 강도 (모드)">
              <p className="text-pullim-slate-500 mb-1.5 text-2xs leading-relaxed">
                모드는 <b>푸는 동안</b> 봇이 어디까지 도와줄지를 정해요. 점수를 누가 매기는지(채점 방식)는
                아래 ② 문항의 <b>유형</b>이 정해요 — 서로 다른 축이에요.
              </p>
              <div role="radiogroup" aria-label="과제 모드" className="grid grid-cols-3 gap-2">
                {(['practice', 'exam', 'wrong-conquest'] as AssignmentMode[]).map(m => {
                  const meta = modeOptions[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMode(m)}
                      data-testid={`mode-${m}`}
                      className={cn(
                        'rounded-lg border-2 px-3 py-2 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                        active
                          ? meta.color
                          : 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                      )}
                    >
                      <div className="text-pullim-slate-900 text-xs font-bold">{meta.label}</div>
                      <div className="text-pullim-slate-500 mt-0.5 text-micro leading-tight">{meta.description}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="난이도">
              <div role="radiogroup" aria-label="난이도" className="flex gap-1.5">
                {difficultyOptions.map(d => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'flex-1 rounded-lg border-2 py-1.5 text-xs font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                      difficulty === d
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-pullim-slate-200 bg-white text-pullim-slate-600',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* ② 문항 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">②</span> 문항</>}
            description="유형을 고르면 채점 방식이 자동으로 갈려요."
          />

          <div className="space-y-3">
            <Field label="단원" htmlFor="af-unit">
              <select
                id="af-unit"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                data-testid="unit-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              >
                {curriculum.map(u => (
                  <option key={u.id} value={u.id}>{u.fullPath}</option>
                ))}
              </select>
              <BotNote icon={BookOpen} className="mt-1">
                발문은 <b>전부 쓰거나 전부 비우거나</b> 둘 중 하나예요 — 전부 비우면 선택 단원의
                RAG 인덱스에서 자동 추출돼요. 일부만 쓰면 쓴 발문이 버려지니 발사를 막아요.
                {' '}지금 직접 쓴 발문 {authoredCount(questions)}/{questions.length}개.
              </BotNote>
            </Field>

            <PointsTally questions={questions} />

            <BotNote icon={Scale}>
              <b>객관식 · 단답 · 수치</b>는 봇이 자동으로 채점하고, <b>서술형</b>은 선생님이 채점 허브에서 직접 봐요.
              서술형은 기준을 미리 적어 두면 채점이 빨라져요.
            </BotNote>

            <QuestionListEditor questions={questions} onChange={setQuestions} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuestions([...questions, makeQuestion('mc', 0)])}
                data-testid="question-add"
                // 상한에 닿으면 잠근다 — 51번째 문항을 만들어 두고 발사에서 막는 것보다 앞에서 막는다.
                disabled={atMaxQuestions}
                title={atMaxQuestions ? `${modeOptions[mode].label} 과제는 ${maxQuestions}문항까지예요` : undefined}
              >
                <Plus />
                문항 더하기
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuestions(evenlySplitPoints(questions))}
                data-testid="question-even-split"
                className="text-pullim-blue-600 hover:text-pullim-blue-700"
              >
                <Split />
                배점 고르게 나누기
              </Button>
              <span
                className={cn('ml-auto font-mono text-micro', countValid ? 'text-pullim-slate-400' : 'text-pullim-danger font-bold')}
                data-testid="question-count"
              >
                {questions.length}/{maxQuestions}문항 · {pointsTotal}점
              </span>
            </div>
          </div>
        </section>

        {/* ③ 대상 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">③</span> 대상</>}
            description={`${targetIds.length}/${classRoster.length}명 선택됨`}
            action={
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => setTargetIds(targetIds.length === classRoster.length ? [] : classRoster.map(s => s.id))}
                className="text-pullim-blue-600 hover:text-pullim-blue-700"
              >
                <Users />
                {targetIds.length === classRoster.length ? '전체 해제' : '전체 선택'}
              </Button>
            }
          />

          <div role="group" aria-label="대상 학생" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {classRoster.map(s => {
              const active = targetIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTargetIds(
                    active ? targetIds.filter(id => id !== s.id) : [...targetIds, s.id]
                  )}
                  data-testid={`student-${s.id}`}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                    active
                      ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                      : 'border-pullim-slate-200 bg-white text-pullim-slate-600 hover:border-pullim-slate-400',
                  )}
                >
                  {active && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                  {s.name}
                </button>
              );
            })}
          </div>
          {!targetValid && (
            <p className="text-pullim-danger mt-2 text-micro">최소 1명을 선택해주세요.</p>
          )}
        </section>

        {/* ④ 일정 */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">④</span> 일정</>}
          />

          <div className="space-y-3">
            <Field label="마감 일시" htmlFor="af-due">
              <Input
                id="af-due"
                type="datetime-local"
                value={dueIso}
                onChange={(e) => setDueIso(e.target.value)}
                data-testid="due-input"
                aria-invalid={!dueValid}
                aria-describedby={!dueValid ? 'af-due-err' : 'af-due-hint'}
                className="h-10 text-sm"
              />
              <p id="af-due-hint" className="text-pullim-slate-500 mt-1 text-micro">
                <Calendar className="-mt-0.5 mr-0.5 inline h-3 w-3" />
                {formatDueLabel(dueIso)} ({computeDDay(dueIso)})
              </p>
              {!dueValid && (
                <p id="af-due-err" className="text-pullim-danger mt-1 text-micro">미래 시각으로 설정해주세요.</p>
              )}
            </Field>

            <Field label="봇 한 마디 (선택)" hint="200자" htmlFor="af-message">
              <Textarea
                id="af-message"
                value={botMessage}
                onChange={(e) => setBotMessage(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="예: 어제 부호 변화에서 막혔던 사람들 다시 짚자"
                className="text-sm"
              />
            </Field>
          </div>
        </section>

        {/* 시험 모드 추가 */}
        {mode === 'exam' && (
          <AlertCard tone="danger" icon={Shield} title="시험 모드 설정">
            <p className="text-pullim-slate-500 mb-3 text-2xs">발사 후 봇이 자동 잠기고 시간이 측정돼요</p>
            <div className="space-y-3">
              <Field label="시간 제한 (분)" htmlFor="af-time">
                <div className="flex items-center gap-3">
                  <Slider
                    id="af-time"
                    min={10}
                    max={180}
                    step={10}
                    value={examTimeLimit}
                    onValueChange={(v) => setExamTimeLimit(Array.isArray(v) ? v[0] : v)}
                    aria-valuetext={`${examTimeLimit}분`}
                    accentClassName="bg-pullim-danger"
                    thumbClassName="bg-pullim-danger focus-visible:ring-pullim-danger/50"
                    className="flex-1"
                  />
                  <span className="bg-white text-pullim-danger inline-flex h-8 w-12 items-center justify-center rounded-lg font-mono text-sm font-bold">
                    {examTimeLimit}분
                  </span>
                </div>
              </Field>

              <BotNote icon={Shield}>Scope L1 자동 — 발사 후엔 변경할 수 없어요.</BotNote>
            </div>
          </AlertCard>
        )}
      </div>

      {/* Sticky bottom 액션 바 */}
      <div className="bg-card sticky bottom-2 mt-6 flex items-center gap-2 rounded-2xl border p-3 shadow-pullim-md">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPreview(true)}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700"
        >
          <Eye />
          미리보기
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          aria-disabled="true"
          title="준비 중 (v2)"
          className="bg-pullim-slate-50 text-pullim-slate-400"
        >
          <Save />
          임시저장
        </Button>
        {blockedReason && (
          <span className="text-pullim-danger ml-auto text-2xs font-bold" data-testid="dispatch-blocked">
            {blockedReason}
          </span>
        )}
        <Button
          type="button"
          variant={mode === 'exam' ? 'pullim-danger' : 'pullim'}
          size="lg"
          onClick={handleDispatch}
          disabled={!canDispatch}
          data-testid="dispatch-btn"
          className={cn(blockedReason ? 'ml-2' : 'ml-auto')}
        >
          <Send />
          발사 →
        </Button>
      </div>

      {/* 미리보기 모달 */}
      {preview && bot && (
        <PreviewModal
          assignment={buildAssignment()}
          bot={bot}
          questions={questions}
          targetCount={targetIds.length}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}

function Field({
  label, hint, htmlFor, children,
}: {
  label: string; hint?: string; htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="text-pullim-slate-700 mb-1 flex items-center justify-between text-xs font-bold"
      >
        <span>{label}</span>
        {hint && <span className="text-pullim-slate-400 font-mono text-micro">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function PreviewModal({
  assignment, bot, questions, targetCount, onClose,
}: {
  assignment: Assignment; bot: ClassBot; questions: DraftQuestion[];
  targetCount: number; onClose: () => void;
}) {
  const meta = modeOptions[assignment.mode];
  const tally = gradingTally(questions);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-pullim-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-3xl p-6 shadow-pullim-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-pullim-slate-900 text-base font-bold">학생들에게 이렇게 보여요</h3>
        <p className="text-pullim-slate-500 mt-1 text-xs">{targetCount}명 학생 홈에 등장</p>

        <div className={cn('mt-4 rounded-2xl border-2 p-4', meta.color)}>
          <div className="flex items-center gap-2 text-micro">
            <span className="bg-pullim-slate-900 text-white rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
              {meta.label}
            </span>
            <span className="text-pullim-slate-700 font-bold">{assignment.dDay}</span>
          </div>
          <h4 className="text-pullim-slate-900 mt-2 text-base font-bold">{assignment.title}</h4>
          <p className="text-pullim-slate-600 mt-0.5 text-xs">{assignment.scope}</p>
          <p className="text-pullim-slate-500 mt-1 text-2xs">
            {assignment.questionCount}문항 · {sumPoints(questions)}점 · 난이도 {assignment.difficulty} · {bot.name}
          </p>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            자동 채점 {tally.auto.count}문항 · 선생님이 채점 {tally.teacher.count}문항
          </p>
          {assignment.reasonHint && (
            <p className="bg-white mt-2 rounded-lg p-2 text-2xs">
              <Sparkles className="text-pullim-blue-600 -mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {assignment.reasonHint}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 mt-4 w-full rounded-xl"
        >
          닫기
        </Button>
      </div>
    </div>
  );
}
