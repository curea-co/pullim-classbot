'use client';

import {
  Plus, Trash2, Sparkles, Pencil, ClipboardList, AlertTriangle, CheckCircle2, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  gradingModeOf,
  type AssignmentMode, type AssignmentQuestion, type GradingMode, type QuestionType,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

/** 과제 한 개의 배점 합 — 이 값과 어긋나면 발사를 막는다. */
export const TOTAL_POINTS = 100;

/** 문항 수 하한 — 문항이 하나도 없는 과제는 발사할 수 없다. */
export const MIN_QUESTIONS = 1;
/** 문항 수 상한 — 시험은 60, 연습·오답정복은 50 (spec 14 §5.1). */
export const MAX_QUESTIONS_EXAM = 60;
export const MAX_QUESTIONS_DEFAULT = 50;

/**
 * 모드별 문항 수 상한. 종전 `문항 수` 슬라이더의 `max` 를 문항 목록 편집기가 물려받는다 —
 * 슬라이더를 걷어내면서 상한이 따라오지 않아 51문항·61문항이 그대로 발사되던 결함의 진실원.
 */
export function maxQuestionsFor(mode: AssignmentMode): number {
  return mode === 'exam' ? MAX_QUESTIONS_EXAM : MAX_QUESTIONS_DEFAULT;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;
const MIN_CRITERIA = 2;
const MAX_CRITERIA = 3;

/** 출제 화면에서 편집 중인 문항 — 발사 시 AssignmentQuestion 으로 굳는다. */
export type DraftQuestion = {
  /** React key 전용 — 문항 id 는 발사 시점에 과제 id 로부터 만든다 */
  key: string;
  type: QuestionType;
  prompt: string;
  points: number;
  /** 객관식 보기 */
  options: string[];
  /** 객관식 정답 인덱스 */
  answerIndex: number;
  /** 단답·수치 정답 */
  answerKey: string;
  /** 서술형 채점 기준 */
  rubric: { criterion: string; weight: number }[];
};

const typeOptions: { value: QuestionType; label: string }[] = [
  { value: 'mc', label: '객관식' },
  { value: 'short', label: '단답' },
  { value: 'numeric', label: '수치' },
  { value: 'essay', label: '서술형' },
];

/** 채점 방식 배지 — 라벨·색은 gradingModeOf 결과에만 달려 있다(유형과 어긋날 수 없음). */
const gradingMeta: Record<GradingMode, { label: string; note: string; icon: LucideIcon; className: string }> = {
  auto: {
    label: '자동 채점',
    note: '봇이 답을 바로 맞혀 봐요',
    icon: Sparkles,
    className: 'bg-pullim-blue-50 text-pullim-blue-700',
  },
  teacher: {
    label: '선생님이 채점',
    note: '낸 뒤에 선생님이 직접 봐요',
    icon: Pencil,
    className: 'bg-pullim-warn-bg text-pullim-warn',
  },
};

// SSR/CSR 양쪽에서 같은 순서로 증가 — 난수·시각을 쓰면 hydration 이 어긋난다.
let questionSeq = 0;
function nextQuestionKey(): string {
  questionSeq += 1;
  return `dq_${questionSeq}`;
}

function defaultRubric(points: number): DraftQuestion['rubric'] {
  const half = Math.floor(points / 2);
  return [
    { criterion: '', weight: half },
    { criterion: '', weight: points - half },
  ];
}

export function makeQuestion(type: QuestionType, points: number): DraftQuestion {
  return {
    key: nextQuestionKey(),
    type,
    prompt: '',
    points,
    options: type === 'mc' ? ['', '', '', ''] : [],
    answerIndex: 0,
    answerKey: '',
    rubric: type === 'essay' ? defaultRubric(points) : [],
  };
}

/** 첫 진입 기본 문항 — 합 100점. 발문은 비어 있고, 비운 채 발사하면 단원 RAG 자동 추출 규약이다. */
export function createDefaultQuestions(): DraftQuestion[] {
  return [
    makeQuestion('mc', 20),
    makeQuestion('mc', 20),
    makeQuestion('short', 20),
    makeQuestion('numeric', 20),
    makeQuestion('essay', 20),
  ];
}

export function sumPoints(questions: DraftQuestion[]): number {
  return questions.reduce((s, q) => s + q.points, 0);
}

/** 채점 방식별 집계 — 배지·상단 합계 바가 같은 값을 본다. */
export function gradingTally(questions: DraftQuestion[]): Record<GradingMode, { count: number; points: number }> {
  const tally = { auto: { count: 0, points: 0 }, teacher: { count: 0, points: 0 } };
  for (const q of questions) {
    const cell = tally[gradingModeOf(q)];
    cell.count += 1;
    cell.points += q.points;
  }
  return tally;
}

/** 발문을 채운 문항 수 — 전부 채웠을 때만 과제에 문항을 실어 보낸다. */
export function authoredCount(questions: DraftQuestion[]): number {
  return questions.filter((q) => q.prompt.trim().length > 0).length;
}

/**
 * 발문을 일부만 쓴 상태. 전부 채우거나(직접 출제) 전부 비우거나(단원 RAG 자동 추출) 둘 중 하나여야 한다 —
 * 중간 상태로 발사하면 `toAssignmentQuestions` 가 `null` 을 돌려 **선생님이 쓴 발문이 조용히 버려진다.**
 */
export function isPartiallyAuthored(questions: DraftQuestion[]): boolean {
  const authored = authoredCount(questions);
  return authored > 0 && authored < questions.length;
}

/**
 * 자동 채점 문항이 정답을 갖췄는지. 서술형은 선생님이 직접 보므로 언제나 true.
 * 객관식은 **고른 보기에 글자가 있어야** 한다 — 비어 있으면 저장할 때 정답이 사라진다.
 */
export function hasGradableAnswer(q: DraftQuestion): boolean {
  if (q.type === 'mc') {
    const trimmed = q.options.map((o) => o.trim());
    const filled = trimmed.filter((o) => o.length > 0);
    return filled.length >= MIN_OPTIONS && (trimmed[q.answerIndex] ?? '').length > 0;
  }
  if (q.type === 'short' || q.type === 'numeric') return q.answerKey.trim().length > 0;
  return true;
}

/**
 * 정답이 빠진 자동 채점 문항 번호(1-based) — 발사를 막는 근거.
 * 발문을 전부 쓴 과제에만 따진다. 발문을 비워 두면 문항 자체를 싣지 않고 단원 RAG 로
 * 넘기는 기존 규약이라 정답도 따질 게 없다.
 */
export function missingAnswerNumbers(questions: DraftQuestion[]): number[] {
  if (questions.length === 0 || authoredCount(questions) < questions.length) return [];
  return questions.flatMap((q, i) => (hasGradableAnswer(q) ? [] : [i + 1]));
}

/** 100점을 문항 수로 고르게 나눈다(나머지는 앞 문항부터). 서술형 기준 가중치도 새 배점에 맞춘다. */
export function evenlySplitPoints(questions: DraftQuestion[]): DraftQuestion[] {
  if (questions.length === 0) return questions;
  const base = Math.floor(TOTAL_POINTS / questions.length);
  const remainder = TOTAL_POINTS - base * questions.length;
  return questions.map((q, i) => withPoints(q, base + (i < remainder ? 1 : 0)));
}

/** 배점 변경 — 서술형 기준 가중치는 새 배점 안으로 다시 맞춘다(합 = 배점). */
export function withPoints(q: DraftQuestion, points: number): DraftQuestion {
  const next = { ...q, points };
  if (q.type !== 'essay' || q.rubric.length === 0) return next;
  const base = Math.floor(points / q.rubric.length);
  const remainder = points - base * q.rubric.length;
  next.rubric = q.rubric.map((c, i) => ({ ...c, weight: base + (i < remainder ? 1 : 0) }));
  return next;
}

/**
 * 편집 중 문항 → 저장 문항. **발문을 전부 채웠을 때만** 과제에 싣는다.
 * 하나라도 비어 있으면 `null` — 그 과제는 기존 규약대로 단원 RAG(=mock 시드)에서 문항을 해석한다.
 */
export function toAssignmentQuestions(
  assignmentId: string,
  questions: DraftQuestion[],
): AssignmentQuestion[] | null {
  if (questions.length === 0 || authoredCount(questions) < questions.length) return null;
  return questions.map((q, i) => {
    const base: AssignmentQuestion = {
      id: `${assignmentId}_q${i + 1}`,
      assignmentId,
      order: i + 1,
      type: q.type,
      prompt: q.prompt.trim(),
      points: q.points,
    };
    if (q.type === 'mc') {
      // 빈 보기는 버리되 정답은 텍스트로 따라간다 — 인덱스가 밀려 오답이 되지 않게.
      const trimmed = q.options.map((o) => o.trim());
      const answerText = trimmed[q.answerIndex] ?? '';
      const options = trimmed.filter((o) => o.length > 0);
      base.options = options;
      // 고른 보기가 비었거나 정리하다 사라졌으면 정답을 아예 싣지 않는다.
      // 0번으로 되돌리면 선생님이 고르지 않은 보기가 정답으로 굳어 자동 채점의 진실값이 뒤바뀐다.
      // (발사 검증에서 먼저 막지만, 직렬화 단계에서도 엉뚱한 정답을 만들지 않는다.)
      const answerIndex = answerText.length > 0 ? options.indexOf(answerText) : -1;
      if (answerIndex >= 0) base.answerIndex = answerIndex;
      return base;
    }
    if (q.type === 'short' || q.type === 'numeric') {
      const key = q.answerKey.trim();
      if (key) base.answerKey = key;
      return base;
    }
    const rubric = q.rubric
      .map((c) => ({ criterion: c.criterion.trim(), weight: c.weight }))
      .filter((c) => c.criterion.length > 0);
    if (rubric.length > 0) base.rubric = rubric;
    return base;
  });
}

/**
 * 문항 목록 편집기 — 유형·발문·배점을 문항마다 정한다.
 * 채점 방식은 입력 항목이 아니라 유형에서 파생된 배지로만 보여 준다(gradingModeOf).
 */
export function QuestionListEditor({
  questions,
  onChange,
}: {
  questions: DraftQuestion[];
  onChange: (next: DraftQuestion[]) => void;
}) {
  function update(index: number, patch: Partial<DraftQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function changeType(index: number, type: QuestionType) {
    const q = questions[index];
    onChange(questions.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        type,
        options: type === 'mc' ? (item.options.length > 0 ? item.options : ['', '', '', '']) : item.options,
        rubric: type === 'essay' ? (item.rubric.length > 0 ? item.rubric : defaultRubric(q.points)) : item.rubric,
      };
    }));
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <ol className="space-y-2">
      {questions.map((q, i) => {
        const grading = gradingMeta[gradingModeOf(q)];
        const GradingIcon = grading.icon;
        return (
          <li key={q.key} className="border-pullim-slate-200 rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-pullim-slate-100 text-pullim-slate-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-2xs font-bold">
                {i + 1}
              </span>

              <label className="sr-only" htmlFor={`af-q${i}-type`}>{i + 1}번 문항 유형</label>
              <select
                id={`af-q${i}-type`}
                value={q.type}
                onChange={(e) => changeType(i, e.target.value as QuestionType)}
                data-testid={`question-type-${i}`}
                className="border-pullim-slate-200 focus:border-pullim-blue-500 rounded-lg border px-2 py-1 text-xs outline-none"
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <span
                data-testid={`question-grading-${i}`}
                className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold', grading.className)}
              >
                <GradingIcon className="h-3 w-3" aria-hidden />
                {grading.label}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <label className="sr-only" htmlFor={`af-q${i}-points`}>{i + 1}번 문항 배점</label>
                <Input
                  id={`af-q${i}-points`}
                  type="number"
                  min={0}
                  max={TOTAL_POINTS}
                  step={5}
                  inputMode="numeric"
                  value={q.points}
                  onChange={(e) => onChange(questions.map((item, idx) => (
                    idx === i ? withPoints(item, clampPoints(e.target.value)) : item
                  )))}
                  data-testid={`question-points-${i}`}
                  className="h-8 w-16 text-center font-mono text-sm"
                />
                <span className="text-pullim-slate-500 text-2xs">점</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${i + 1}번 문항 지우기`}
                  disabled={questions.length <= 1}
                  onClick={() => removeQuestion(i)}
                  className="text-pullim-slate-400 hover:text-pullim-danger"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            <p className="text-pullim-slate-400 mt-1 text-micro">{grading.note}</p>

            <label className="sr-only" htmlFor={`af-q${i}-prompt`}>{i + 1}번 문항 발문</label>
            <Textarea
              id={`af-q${i}-prompt`}
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              rows={2}
              placeholder="발문을 적어주세요. 비워 두면 선택한 단원에서 자동으로 뽑아 와요."
              data-testid={`question-prompt-${i}`}
              className="mt-2 text-sm"
            />

            {q.type === 'mc' && (
              <McOptions
                index={i}
                question={q}
                onChange={(patch) => update(i, patch)}
              />
            )}

            {(q.type === 'short' || q.type === 'numeric') && (
              <div className="mt-2">
                <label className="sr-only" htmlFor={`af-q${i}-answer`}>{i + 1}번 문항 정답</label>
                <Input
                  id={`af-q${i}-answer`}
                  value={q.answerKey}
                  onChange={(e) => update(i, { answerKey: e.target.value })}
                  placeholder={q.type === 'numeric' ? '정답 숫자 (예: 33400)' : '정답 (예: 증발)'}
                  data-testid={`question-answer-${i}`}
                  className="h-9 text-sm"
                />
                <p className="text-pullim-slate-400 mt-1 text-micro">
                  띄어쓰기·대소문자 차이는 정답으로 봐요{q.type === 'numeric' ? ' (숫자는 값으로 비교해요)' : ''}.
                </p>
              </div>
            )}

            {q.type === 'essay' && (
              <RubricRows index={i} question={q} onChange={(patch) => update(i, patch)} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function clampPoints(raw: string): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.min(TOTAL_POINTS, Math.max(0, n));
}

function McOptions({
  index, question, onChange,
}: {
  index: number; question: DraftQuestion; onChange: (patch: Partial<DraftQuestion>) => void;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-pullim-slate-500 text-micro font-bold">보기 · 정답 고르기</p>
      {question.options.map((opt, j) => (
        <div key={j} className="flex items-center gap-2">
          <input
            type="radio"
            name={`af-q${index}-answer`}
            checked={question.answerIndex === j}
            onChange={() => onChange({ answerIndex: j })}
            aria-label={`${index + 1}번 문항 ${j + 1}번 보기를 정답으로`}
            data-testid={`question-option-correct-${index}-${j}`}
            className="accent-pullim-blue-600 h-3.5 w-3.5 shrink-0"
          />
          <Input
            value={opt}
            onChange={(e) => onChange({
              options: question.options.map((o, k) => (k === j ? e.target.value : o)),
            })}
            placeholder={`${j + 1}번 보기`}
            aria-label={`${index + 1}번 문항 ${j + 1}번 보기`}
            data-testid={`question-option-${index}-${j}`}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${index + 1}번 문항 ${j + 1}번 보기 지우기`}
            disabled={question.options.length <= MIN_OPTIONS}
            onClick={() => {
              const options = question.options.filter((_, k) => k !== j);
              const answerIndex = question.answerIndex > j
                ? question.answerIndex - 1
                : Math.min(question.answerIndex, options.length - 1);
              onChange({ options, answerIndex });
            }}
            className="text-pullim-slate-400 hover:text-pullim-danger"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {question.options.length < MAX_OPTIONS && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange({ options: [...question.options, ''] })}
          className="text-pullim-blue-600 hover:text-pullim-blue-700"
        >
          <Plus />
          보기 더하기
        </Button>
      )}
    </div>
  );
}

function RubricRows({
  index, question, onChange,
}: {
  index: number; question: DraftQuestion; onChange: (patch: Partial<DraftQuestion>) => void;
}) {
  const weightSum = question.rubric.reduce((s, c) => s + c.weight, 0);
  const matched = weightSum === question.points;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-pullim-slate-500 flex items-center gap-1 text-micro font-bold">
        <ClipboardList className="h-3 w-3" aria-hidden />
        채점 기준 — 미리 적어 두면 채점이 빨라져요
      </p>
      {question.rubric.map((c, j) => (
        <div key={j} className="flex items-center gap-2">
          <span className="text-pullim-slate-400 w-4 shrink-0 font-mono text-micro">{j + 1}</span>
          <Input
            value={c.criterion}
            onChange={(e) => onChange({
              rubric: question.rubric.map((item, k) => (k === j ? { ...item, criterion: e.target.value } : item)),
            })}
            placeholder="예: 입자 배열 변화를 썼어요"
            aria-label={`${index + 1}번 문항 ${j + 1}번 채점 기준`}
            data-testid={`question-criterion-${index}-${j}`}
            className="h-8 flex-1 text-sm"
          />
          <Slider
            min={0}
            max={question.points || TOTAL_POINTS}
            step={1}
            value={c.weight}
            onValueChange={(v) => onChange({
              rubric: question.rubric.map((item, k) => (
                k === j ? { ...item, weight: Array.isArray(v) ? v[0] : v } : item
              )),
            })}
            aria-label={`${index + 1}번 문항 ${j + 1}번 기준 배점`}
            aria-valuetext={`${c.weight}점`}
            data-testid="rubric-weight-slider"
            className="w-20 shrink-0"
          />
          <span className="text-pullim-slate-600 w-8 shrink-0 text-right font-mono text-2xs">{c.weight}점</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${index + 1}번 문항 ${j + 1}번 채점 기준 지우기`}
            disabled={question.rubric.length <= MIN_CRITERIA}
            onClick={() => onChange({ rubric: question.rubric.filter((_, k) => k !== j) })}
            className="text-pullim-slate-400 hover:text-pullim-danger"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {question.rubric.length < MAX_CRITERIA && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onChange({ rubric: [...question.rubric, { criterion: '', weight: 0 }] })}
            className="text-pullim-blue-600 hover:text-pullim-blue-700"
          >
            <Plus />
            기준 더하기
          </Button>
        )}
        <span className={cn('ml-auto font-mono text-micro', matched ? 'text-pullim-slate-500' : 'text-pullim-warn font-bold')}>
          기준 배점 {weightSum} / 문항 배점 {question.points}점
        </span>
      </div>
    </div>
  );
}

/** 배점 합계 바 — 100점과 맞는지 실시간으로 보여 주고, 어긋나면 눈에 띄게 알린다. */
export function PointsTally({ questions }: { questions: DraftQuestion[] }) {
  const total = sumPoints(questions);
  const tally = gradingTally(questions);
  const gap = TOTAL_POINTS - total;
  const ok = gap === 0;
  return (
    <div
      data-testid="points-tally"
      aria-live="polite"
      className={cn(
        'rounded-xl border-2 p-3',
        ok ? 'border-pullim-blue-200 bg-pullim-blue-50' : 'border-pullim-danger/40 bg-pullim-danger-bg',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-pullim-slate-700 text-xs font-bold">배점 합계</span>
        <span className={cn('font-mono text-base font-bold', ok ? 'text-pullim-blue-700' : 'text-pullim-danger')}>
          {total}
          <span className="text-pullim-slate-400 text-xs"> / {TOTAL_POINTS}점</span>
        </span>
        <span className="text-pullim-slate-500 ml-auto text-micro">
          자동 채점 {tally.auto.count}문항 · {tally.auto.points}점 · 선생님이 채점 {tally.teacher.count}문항 · {tally.teacher.points}점
        </span>
      </div>
      <p className={cn('mt-1 flex items-center gap-1 text-2xs font-bold', ok ? 'text-pullim-blue-700' : 'text-pullim-danger')}>
        {ok ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <AlertTriangle className="h-3 w-3" aria-hidden />}
        {ok
          ? '100점에 딱 맞아요.'
          : gap > 0
            ? `${gap}점 모자라요 — 100점을 맞춰야 발사할 수 있어요.`
            : `${-gap}점 넘었어요 — 100점을 맞춰야 발사할 수 있어요.`}
      </p>
    </div>
  );
}
