'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Save, Eye, Sparkles, Users, Calendar, BookOpen, Shield, Plus, Scale, Split, School, Info,
} from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { BotNote } from '@/components/classbot/bot-note';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getBotCurriculum, type AssignmentMode, type BotCurriculumUnit, type ScopeLevel } from '@/lib/mock';
import type { DispatchAssignmentBody } from '@/lib/api/classbot-dto';
import { useDispatchAssignment } from '@/hooks/api/assignment-dispatch';
import { useOperatorClasses } from '@/hooks/api/classroom';
import { toTeacherClass, type TeacherClass } from '../assignment-filters';
import {
  QuestionListEditor, PointsTally, createDefaultQuestions, makeQuestion,
  evenlySplitPoints, sumPoints, authoredCount, gradingTally,
  missingAnswerNumbers, missingRubricNumbers, rubricWeightMismatchNumbers, maxQuestionsFor,
  MIN_QUESTIONS, TOTAL_POINTS, type DraftQuestion,
} from './question-editor';
import { invalidNumericAnswerNumbers, toDispatchQuestions } from './dispatch-body';
import { formatDueLabel, computeDDay, computeDDayNumber } from '@/lib/assignment-due';
import { cn } from '@/lib/utils';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

/**
 * 과제 내기 — **정본 한 요청**(2026-09-16 계획 §05 R6 · §06 「문항까지 한 요청 · 대상 반은 반 상세에서 진입한 그 반」).
 *
 * 무엇이 바뀌었나(FE PR 6):
 *  - 고르는 반은 `useOperatorClasses`(`hooks/api/classroom.ts` · `GET /classbot/bots?role=teacher`, #351) — 내가 operator 인
 *    반이다. 카드에서 과제 축이 읽는 칸만 뽑는 것이 `toTeacherClass`(`../assignment-filters.ts`). 같은 오리진 B 세계 반
 *    (`useTeacherClassrooms`)은 여기서 더 읽지 않는다 — 그 반 id 를 정본에 보내면 403 이다.
 *  - 내기는 `useDispatchAssignment`(`POST /classbot/classes/:classId/assignments`)에 **문항을 실어** 한 번 보낸다.
 *    종전의 로컬 사본 쓰기(`useAssignmentStore.dispatch`)와 비로그인 데모 분기(`signedOut`)는 걷었다 — 비로그인은
 *    이 화면에 오지 않는다(PR 4 RoleGuard).
 *  - **발문은 전부 써야 낸다.** 「전부 비우면 단원 RAG 자동 추출」 규약과 mode 시드 폴백은 정본에 없다.
 *  - **대상은 반 전체다.** `targetStudentIds` 를 고르려면 그 반의 정본 명단(`GET /classes/:id/members` — pullim-api PR 2·
 *    FE PR 5)이 있어야 한다. B 세계 명단의 학생 id 는 정본 sub 가 아니라 보내면 400 이다. 그래서 ③ 대상은 고르는 칸이
 *    아니라 「반 전체」 한 줄이다.
 *  - 정본에 칸이 없어 **보내지 않는 것**: 봇 한 마디(`reasonHint`) · 마감 시각(`dueAt`) · 문항 배점·채점 기준.
 *    배점은 편집기 안 규칙(합 100)으로만 남고, 서버 채점은 자동 채점 문항을 균등하게 센다.
 */

type ModeMeta = { label: string; description: string; color: string; defaultScope: ScopeLevel };

const modeOptions: Record<AssignmentMode, ModeMeta> = {
  practice: {
    label: '연습',
    description: '힌트는 주고 정답은 안 알려 줘요',
    color: assignmentModeBadge.practice.outline,
    defaultScope: 4,
  },
  exam: {
    label: '시험',
    description: '봇이 잠기고 시간을 재요',
    color: assignmentModeBadge.exam.outline,
    defaultScope: 1,
  },
  'wrong-conquest': {
    label: '오답정복',
    description: '정답도 해설도 바로 보여 줘요',
    color: assignmentModeBadge['wrong-conquest'].outline,
    defaultScope: 5,
  },
};

const difficultyOptions = ['하', '중', '상'] as const;
type Difficulty = (typeof difficultyOptions)[number];

/**
 * `datetime-local` 의 기본값 — **내일 22:00, 로컬 시각**(spec 14 § 3.3.1 · `lib/assignment-due.ts`).
 *
 * `toISOString()` 을 쓰면 안 된다. 그건 **UTC 로 바꾼 뒤** 문자열을 주는데 `datetime-local` 은
 * 받은 문자열을 **로컬로 읽는다** — KST 에서 22:00 을 넣으면 화면에 `13:00` 이 뜬다(9시간 증발).
 * 교사가 마감을 안 건드리면 그대로 나가므로, 화면을 열자마자 틀린 값이 기본값이 된다.
 * 그래서 로컬 필드를 직접 조립한다.
 */
function defaultDueLabel(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(22, 0, 0, 0);
  return toLocalDatetimeInput(tomorrow);
}

/**
 * `Date` → `datetime-local` 이 로컬로 읽는 `YYYY-MM-DDTHH:mm`. UTC 로 새지 않는다.
 *
 * **로컬 게터만 쓴다** — `toISOString()` 을 타면 안 된다. 테스트가 그것을 가르려고
 * 이 함수를 직접 부른다(호스트 TZ 가 UTC 면 두 구현의 출력이 같아져 구별이 안 된다).
 */
export function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 서버가 `NotEmpty` 로 막는 두 칸 — 프로필이 없는 반은 비어 오므로 「미정」으로 채운다. 지어낸 과목을 넣지 않는다. */
const SUBJECT_FALLBACK = '과목 미정';
const GRADE_FALLBACK = '학년 미정';

/**
 * `initialClassId` — 반 상세·봇 운영 화면의 「과제 내기」가 어느 반에서 눌렸는지(`?classId=`).
 * 실어 오지 않거나 내 반이 아닌 id 면 목록 첫 반으로 연다.
 */
export function AssignmentForm({ initialClassId = '' }: { initialClassId?: string }) {
  const router = useRouter();
  const classesQuery = useOperatorClasses();
  const dispatchAssignment = useDispatchAssignment();

  // 입력 state — 초기값으로 자동 채움
  const [classId, setClassId] = useState<string>(initialClassId);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<AssignmentMode>('practice');
  const [difficulty, setDifficulty] = useState<Difficulty>('중');
  const [unitId, setUnitId] = useState<string>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>(createDefaultQuestions);
  const [dueIso, setDueIso] = useState(defaultDueLabel());
  const [examTimeLimit, setExamTimeLimit] = useState(60);
  const [preview, setPreview] = useState(false);

  /*
    고른 반은 **state 가 아니라 파생**이다 — 목록이 늦게 도착하므로, 첫 반으로 되돌리는 일을
    effect 로 하면 교사가 고른 반을 나중에 덮어쓸 수 있다. 고른 id 가 목록에 없으면
    (아직 안 왔거나 남의 반이면) 그때만 첫 반으로 읽는다.
  */
  const classes = useMemo<TeacherClass[]>(() => (classesQuery.data ?? []).map(toTeacherClass), [classesQuery.data]);
  const klass = classes.find((c) => c.id === classId) ?? classes[0];
  const selectedClassId = klass?.id ?? '';
  const noClasses = classesQuery.isSuccess && classes.length === 0;

  // 자동 채움 — 단원 카탈로그는 mock 이 소유한다(정본에 커리큘럼 문이 없다). 정본 반 id 는 카탈로그에 없어
  // 단원이 비는데, 그때는 「단원 미정」으로 낸다.
  const curriculum = useMemo<BotCurriculumUnit[]>(() => getBotCurriculum(selectedClassId), [selectedClassId]);
  const selectedUnit = curriculum.find((u) => u.id === unitId) ?? curriculum[0];

  function handleClassChange(next: string) {
    setClassId(next);
    setUnitId('');
  }

  // 검증
  const titleValid = title.trim().length >= 5 && title.trim().length <= 50;
  const dueValid = new Date(dueIso).getTime() > Date.now();
  const pointsTotal = sumPoints(questions);
  // 문항 수 상한 — 종전 `문항 수` 슬라이더의 max 를 편집기가 물려받는다(연습·오답정복 50 / 시험 60).
  const maxQuestions = maxQuestionsFor(mode);
  const countValid = questions.length >= MIN_QUESTIONS && questions.length <= maxQuestions;
  const atMaxQuestions = questions.length >= maxQuestions;
  const authored = authoredCount(questions);
  const allAuthored = questions.length > 0 && authored === questions.length;
  // 정답을 안 정한 자동 채점 문항이 있으면 내기를 막는다 — 서버도 400 으로 거절한다(정답키 없는 자동 채점 문항 차단).
  const missingAnswers = missingAnswerNumbers(questions);
  const invalidNumeric = invalidNumericAnswerNumbers(questions);
  const missingRubric = missingRubricNumbers(questions);
  const rubricMismatch = rubricWeightMismatchNumbers(questions);

  /**
   * ② 문항 섹션이 내기를 막는 이유 한 줄 — null 이면 걸린 게 없다.
   * 먼저 걸리는 것부터 하나만 보여 준다(문항 수 → 배점 → 발문 → 정답 → 기준).
   */
  function questionBlockedReason(): string | null {
    if (questions.length < MIN_QUESTIONS) return '문항을 최소 1개는 넣어야 낼 수 있어요';
    if (questions.length > maxQuestions) {
      return `${modeOptions[mode].label} 과제는 ${maxQuestions}문항까지예요 — 지금 ${questions.length}문항`;
    }
    if (pointsTotal !== TOTAL_POINTS) return `배점 합계 ${pointsTotal}/${TOTAL_POINTS}점 — 맞춰야 낼 수 있어요`;
    // 정본은 문항마다 발문을 요구한다 — 비운 발문을 단원에서 자동으로 채우는 길은 없다.
    if (!allAuthored) return `모든 문항의 발문을 써야 낼 수 있어요 — 지금 ${authored}/${questions.length}개`;
    if (missingAnswers.length > 0) return `${missingAnswers.join('·')}번 문항 정답을 정해야 낼 수 있어요`;
    // 수치 정답은 서버가 number 로 받는다 — 글자를 보내면 400 이라 여기서 먼저 막는다.
    if (invalidNumeric.length > 0) return `${invalidNumeric.join('·')}번 수치 문항 정답은 숫자여야 해요`;
    /*
      서술형 채점 기준 — 위 정답 검사가 서술형을 안 본다(`hasGradableAnswer` 가 언제나 true). 정본에 기준을 실을
      칸은 없지만, 편집기가 빨간 글씨로 어긋남을 보여 주는 이상 그대로 내보내지 않는다(빨간 경고에 결과가 있어야 한다).
    */
    if (missingRubric.length > 0) return `서술형 ${missingRubric.join('·')}번 채점 기준을 적어야 낼 수 있어요`;
    if (rubricMismatch.length > 0) return `${rubricMismatch.join('·')}번 기준 배점 합이 문항 배점과 달라요`;
    return null;
  }
  const blockedReason = questionBlockedReason();

  const canDispatch =
    !!klass && titleValid && dueValid && blockedReason === null && !dispatchAssignment.isPending;

  /** 정본 본문 — 화면이 고른 것을 서버 DTO 모양으로. 검증은 위에서 끝났다. */
  function buildBody(target: TeacherClass): DispatchAssignmentBody {
    return {
      title: title.trim(),
      scope: selectedUnit?.fullPath ?? '단원 미정',
      subject: target.subject || SUBJECT_FALLBACK,
      grade: target.grade || GRADE_FALLBACK,
      mode,
      // 서버가 `questions.length` 로 덮어 쓴다 — 같은 값을 보내 어긋남이 없게 한다.
      questionCount: questions.length,
      difficulty,
      dueLabel: formatDueLabel(dueIso),
      dDay: computeDDayNumber(dueIso),
      state: 'todo',
      chapterFrom: selectedUnit?.fullPath ?? null,
      chapterTo: selectedUnit?.fullPath ?? null,
      // 성취기준 — 단원에 딸려 오는 값이다(14 §5.4). 한 번 빈 배열로 저장되면 되살릴 방법이 없다.
      achievementCodes: selectedUnit?.achievementCodes ?? [],
      // 시험 시간 제한 — 슬라이더가 10~180(step 10). 시험이 아닌 모드에서는 null.
      examTimeLimitMin: mode === 'exam' ? examTimeLimit : null,
      // 반 전체 — 학생을 골라 내는 길은 정본 명단이 붙으면 열린다(머리주석).
      targetStudentIds: [],
      questions: toDispatchQuestions(questions),
    };
  }

  /** 내기 — 서버가 행을 만들면 낸 과제 목록으로 간다. 실패하면 화면에 남아 다시 누를 수 있다. */
  async function handleDispatch() {
    if (!canDispatch || !klass) return;
    try {
      const created = await dispatchAssignment.mutateAsync({ classId: klass.id, body: buildBody(klass) });
      toast.success(`${klass.name} 반 전체에게 보냈어요`, {
        description: `"${created.title}" · ${created.dueLabel}`,
      });
      router.push('/teacher/assignment');
    } catch (error) {
      // ApiError.message 는 서버가 준 문구(NestJS 검증 메시지 포함)다 — 그대로 보여준다.
      toast.error(error instanceof Error ? error.message : '과제를 내지 못했어요.');
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        {/* 상단 컨텍스트 바 — 본문과 같은 폭 안이다(`max-w-3xl`, spec 14 § 9.3). */}
        <div className="max-w-3xl">
          <Link
            href="/teacher/assignment"
            className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            취소
          </Link>
        </div>

        <PageHeader
          eyebrow={{ icon: Send, text: '새 과제' }}
          title="과제 내기"
          description={
            klass
              ? `${klass.name} · ${klass.subject || SUBJECT_FALLBACK} ${klass.grade || GRADE_FALLBACK}`.trim()
              : '먼저 반을 선택해주세요'
          }
        />
      </div>

      <div className="max-w-3xl space-y-6">
        {/* 반을 못 읽으면 고를 수 있는 반이 없어 폼 전체가 뜻을 잃는다 — 이유를 먼저 말한다. 401 은 로그인으로 갔다. */}
        {classesQuery.isError && (
          <AlertCard tone="danger" icon={School} title="반을 불러오지 못했어요">
            <p className="text-pullim-slate-700 text-sm" data-testid="rooms-error">
              {classesQuery.error.message}
            </p>
          </AlertCard>
        )}

        {/* 반이 없으면 낼 곳이 없다 — 폼을 붙잡고 있게 두지 않고 만들러 보낸다 */}
        {noClasses && (
          <AlertCard tone="notice" icon={School} title="아직 운영하는 반이 없어요">
            <p className="text-pullim-slate-700 text-sm" data-testid="rooms-empty">
              과제는 반에 내는 거예요. 먼저 반을 열고 참여 코드를 학생에게 알려주세요.
            </p>
            <Link
              href="/teacher/classroom"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              내 수업방으로
            </Link>
          </AlertCard>
        )}

        {/* ① 정체성 */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">①</span> 정체성</>}
          />

          <div className="space-y-3">
            <Field label="반" htmlFor="af-class">
              <select
                id="af-class"
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={classes.length === 0}
                data-testid="class-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:bg-pullim-slate-50 disabled:text-pullim-slate-400"
              >
                {classes.length === 0 ? (
                  <option value="">
                    {classesQuery.isPending ? '반을 불러오는 중…' : '아직 운영하는 반이 없어요'}
                  </option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {(c.subject || c.grade) && ` — ${c.subject} ${c.grade}`.trimEnd()}
                      {c.enrolledCount !== null && ` (${c.enrolledCount}명)`}
                    </option>
                  ))
                )}
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
                <p id="af-title-err" className="text-pullim-danger mt-1 text-xs">제목은 5~50자 사이여야 해요.</p>
              )}
            </Field>

            <Field label="봇이 답해 주는 범위">
              <div role="radiogroup" aria-label="봇이 답해 주는 범위" className="grid grid-cols-3 gap-2">
                {(['practice', 'exam', 'wrong-conquest'] as AssignmentMode[]).map((m) => {
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
                      <div className="text-pullim-slate-500 mt-0.5 text-xs leading-tight">{meta.description}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="난이도">
              <div role="radiogroup" aria-label="난이도" className="flex gap-1.5">
                {difficultyOptions.map((d) => (
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
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">②</span> 문항</>}
          />

          <div className="space-y-3">
            <Field label="단원" htmlFor="af-unit">
              <select
                id="af-unit"
                value={selectedUnit?.id ?? ''}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={curriculum.length === 0}
                data-testid="unit-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:bg-pullim-slate-50 disabled:text-pullim-slate-400"
              >
                {/* 정본 반은 단원 카탈로그에 아직 없다 — 그때는 「단원 미정」으로 낸다 */}
                {curriculum.length === 0 ? (
                  <option value="">단원 미정</option>
                ) : (
                  curriculum.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullPath}</option>
                  ))
                )}
              </select>
              <BotNote icon={BookOpen} className="mt-1">
                문항은 <b>발문·정답까지 그대로 서버에 저장</b>되고, 학생은 어느 기기에서든 선생님이 쓴 그 문항을 받아요.
                {' '}지금 쓴 발문 {authored}/{questions.length}개.
              </BotNote>
              <BotNote icon={Info} className="mt-1">
                배점과 서술형 채점 기준은 아직 서버에 담을 자리가 없어 이 화면에서만 맞춰요 — 서버 점수는 자동 채점 문항을
                같은 무게로 세고, 서술형이 있으면 채점 허브에서 선생님이 매겨요.
              </BotNote>
            </Field>

            <PointsTally questions={questions} />

            <BotNote icon={Scale}>
              <b>객관식 · 단답 · 수치</b>는 서버가 자동으로 채점하고, <b>서술형</b>은 선생님이 채점 허브에서 직접 봐요.
            </BotNote>

            <QuestionListEditor questions={questions} onChange={setQuestions} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuestions([...questions, makeQuestion('mc', 0)])}
                data-testid="question-add"
                // 상한에 닿으면 잠근다 — 51번째 문항을 만들어 두고 낼 때 막는 것보다 앞에서 막는다.
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
                aria-label="점수 자동 분배"
                className="text-pullim-blue-600 hover:text-pullim-blue-700"
              >
                <Split />
                점수 자동 분배
              </Button>
              <span
                className={cn('ml-auto font-mono text-2xs', countValid ? 'text-pullim-slate-500' : 'text-pullim-danger font-bold')}
                data-testid="question-count"
              >
                {questions.length}/{maxQuestions}문항 · {pointsTotal}점
              </span>
            </div>
          </div>
        </section>

        {/* ③ 대상 — 반 전체. 고르는 칸이 아니다(머리주석). */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">③</span> 대상</>}
            description="이 반에 들어와 있는 학생 전체"
          />
          <BotNote icon={Users}>
            <b>반 전체</b>로 나가요 — 나중에 참여 코드로 들어오는 학생도 이 과제를 받아요. 학생을 골라 내는 것은 반 명단이
            정본에 붙으면 열려요.
          </BotNote>
        </section>

        {/* ④ 일정 */}
        <section className="bg-card rounded-2xl border p-5">
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
              <p id="af-due-hint" className="text-pullim-slate-500 mt-1 text-2xs">
                <Calendar className="-mt-0.5 mr-0.5 inline h-3 w-3" />
                {formatDueLabel(dueIso)} ({computeDDay(dueIso)})
              </p>
              {!dueValid && (
                <p id="af-due-err" className="text-pullim-danger mt-1 text-xs">미래 시각으로 설정해주세요.</p>
              )}
            </Field>
          </div>
        </section>

        {/* 시험 모드 추가 */}
        {mode === 'exam' && (
          <AlertCard tone="danger" icon={Shield} title="시험 모드 설정">
            <p className="text-pullim-slate-500 mb-3 text-2xs">낸 뒤 봇이 자동 잠기고 시간이 측정돼요</p>
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

              <BotNote icon={Shield}>Scope L1 자동 — 낸 뒤엔 변경할 수 없어요.</BotNote>
            </div>
          </AlertCard>
        )}
      </div>

      {/* Sticky bottom 액션 바 — 본문과 같은 캡 안이다(§ 9.3). */}
      <div className="bg-card sticky bottom-2 flex max-w-3xl items-center gap-2 rounded-2xl border p-4 shadow-pullim-md">
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
        {blockedReason ? (
          <span className="text-pullim-danger ml-auto text-2xs font-bold" data-testid="dispatch-blocked">
            {blockedReason}
          </span>
        ) : dispatchAssignment.isError ? (
          /* 서버가 막은 이유 — 문구는 서버가 준 것 그대로다(대상·소유권·입력) */
          <span className="text-pullim-danger ml-auto text-2xs font-bold" role="alert" data-testid="dispatch-error">
            {dispatchAssignment.error.message}
          </span>
        ) : null}
        <Button
          type="button"
          variant={mode === 'exam' ? 'pullim-danger' : 'pullim'}
          size="lg"
          onClick={handleDispatch}
          disabled={!canDispatch}
          data-testid="dispatch-btn"
          className={cn(blockedReason || dispatchAssignment.isError ? 'ml-2' : 'ml-auto')}
        >
          <Send />
          {dispatchAssignment.isPending ? '보내는 중…' : '과제 내기'}
        </Button>
      </div>

      {/* 미리보기 모달 */}
      {preview && klass && (
        <PreviewModal
          title={title.trim() || '(제목 없음)'}
          scope={selectedUnit?.fullPath ?? '단원 미정'}
          mode={mode}
          difficulty={difficulty}
          dDay={computeDDay(dueIso)}
          className={klass.name}
          questions={questions}
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
        {hint && <span className="text-pullim-slate-500 font-mono text-2xs">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function PreviewModal({
  title, scope, mode, difficulty, dDay, className, questions, onClose,
}: {
  title: string;
  scope: string;
  mode: AssignmentMode;
  difficulty: Difficulty;
  dDay: string;
  className: string;
  questions: DraftQuestion[];
  onClose: () => void;
}) {
  const meta = modeOptions[mode];
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
        <p className="text-pullim-slate-500 mt-1 text-xs">{className} 반 전체의 받은 과제에 등장</p>

        <div className={cn('mt-4 rounded-2xl border-2 p-4', meta.color)}>
          <div className="flex items-center gap-2 text-2xs">
            <span className="bg-pullim-slate-900 text-white rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
              {meta.label}
            </span>
            <span className="text-pullim-slate-700 font-bold">{dDay}</span>
          </div>
          <h4 className="text-pullim-slate-900 mt-2 text-base font-bold">{title}</h4>
          <p className="text-pullim-slate-600 mt-0.5 text-xs">{scope}</p>
          <p className="text-pullim-slate-500 mt-1 text-2xs">
            {questions.length}문항 · 난이도 {difficulty} · {className}
          </p>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            <Sparkles className="text-pullim-blue-600 -mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            자동 채점 {tally.auto.count}문항 · 선생님이 채점 {tally.teacher.count}문항
          </p>
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
