/**
 * chat-cards — SSE `card` 프레임(ADR-065 v2 tool-calling) → FE 챗 카드 Turn 어댑터(순수·테스트 단위).
 *
 * pullim-api chat(§3.8)이 flag-ON 실챗에서 tool_use 블록 완결마다 `event: card`
 * (`data: { cardType, payload }`)를 원자적으로 방출한다(api.md §3.8 🃏 · data-model §1.6).
 * cardType 은 FE `MessageKind` 의 부분집합(lesson-intro|concept|example|quiz|summary|
 * self-explain|problem-card)과 1:1 이고, payload 스키마는 FE mock(`classbot-lesson.ts`) shape
 * 과 1:1 로 설계돼 **기존 `MessageBody` 렌더러를 그대로 재사용**한다.
 *
 * 이 모듈의 책임:
 *  1. cardType 문자열 → FE MessageKind 매핑(허용 목록 밖이면 null).
 *  2. BE card payload → FE Turn payload 로 형상 적응(concept/quiz 는 mock 이 wrapper 를 쓰므로 감싼다).
 *  3. **형식 방어**: payload 가 기대 shape 과 다르면 null 을 돌려 호출부가 graceful 하게 스킵/폴백
 *     하도록 한다(트랜스크립트를 깨지 않는다). 렌더러가 신뢰할 수 있는 값만 통과시킨다.
 *
 * ⚠️ 순수 모듈 — React·네트워크 의존 없음. flag-ON 실챗 send·히스토리 재구성 양쪽에서 재사용.
 */
import type { LessonConcept, LessonStep, LessonQuiz, SelfExplainPrompt } from '@/lib/mock/classbot-lesson';

/** ADR-065 카드 kind 목록 — FE MessageKind 부분집합(1:1). */
export const CARD_TYPES = [
  'lesson-intro',
  'concept',
  'example',
  'quiz',
  'summary',
  'self-explain',
  'problem-card',
] as const;

export type CardType = (typeof CARD_TYPES)[number];

const CARD_TYPE_SET: ReadonlySet<string> = new Set(CARD_TYPES);

/**
 * cardType 문자열 → FE MessageKind(= CardType, MessageKind 부분집합).
 * 허용 목록에 없는 임의 문자열은 null(렌더 불가 → 호출부 폴백).
 */
export function cardTypeToMessageKind(cardType: string): CardType | null {
  return CARD_TYPE_SET.has(cardType) ? (cardType as CardType) : null;
}

/**
 * 적응된 카드 turn — page.tsx `Turn` 의 kind/text/payload 하위집합.
 * payload 형상은 기존 FE Turn payload(ConceptPayload/QuizPayload 등)와 구조적으로 동일해
 * `MessageBody` 가 그대로 렌더한다.
 */
export type AdaptedCardTurn =
  | { kind: 'lesson-intro'; text: string; payload: { topic: string; keyCallout: string } }
  | { kind: 'concept'; text: string; payload: { concept: LessonConcept } }
  | { kind: 'example'; text: string; payload: { title: string; steps: LessonStep[] } }
  | { kind: 'quiz'; text: string; payload: { quiz: LessonQuiz; conceptId?: string } }
  | { kind: 'summary'; text: string; payload?: { goalKey: string; nextLine?: string } }
  | { kind: 'self-explain'; text: string; payload: { prompt: SelfExplainPrompt } }
  | {
      kind: 'problem-card';
      text: string;
      payload: { problemNumber: string; title: string; ctaLabel: string; ctaHref: string };
    };

/**
 * 적응 컨텍스트 — BE 계약(§1.6)에 없는 **FE 로컬 파생값** 주입 채널.
 * `goalKey`(세션 목표 키, `me::bot::YYYY-MM-DD`)를 주면 summary 카드가 mock 경로(B7 finding#2)와
 * 동일하게 `payload { goalKey, nextLine }` 를 실어 `SummaryProgress` 달성도 배너가 라이브 store 를
 * 읽는다. 없으면(방어) nextLine 을 본문에 합성한 평문 폴백.
 */
export interface CardAdaptContext {
  goalKey?: string;
}

/* ─── 형식 가드(순수) ─── */
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function asObj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** sampleQuestions: `{ q: string, a?: string }[]`. */
function coerceSampleQuestions(v: unknown): { q: string; a?: string }[] | null {
  if (!Array.isArray(v)) return null;
  const out: { q: string; a?: string }[] = [];
  for (const item of v) {
    const o = asObj(item);
    if (!o || !isStr(o.q)) return null;
    if (o.a !== undefined && !isStr(o.a)) return null;
    out.push({ q: o.q, ...(isStr(o.a) ? { a: o.a } : {}) });
  }
  return out;
}

/** concept payload → LessonConcept. */
function coerceConcept(p: Record<string, unknown>): LessonConcept | null {
  if (!isStr(p.id) || !isStr(p.title) || !isStr(p.summary) || !isStr(p.detail)) return null;
  if (!isStrArr(p.tips) || !isStrArr(p.coreElements)) return null;
  if (p.formula !== undefined && !isStr(p.formula)) return null;
  const sampleQuestions = coerceSampleQuestions(p.sampleQuestions);
  if (!sampleQuestions) return null;
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    detail: p.detail,
    tips: p.tips,
    coreElements: p.coreElements,
    ...(isStr(p.formula) ? { formula: p.formula } : {}),
    sampleQuestions,
  };
}

/** example.steps → LessonStep[]. num/label/body 필수, formula/fadable/reveal 선택. */
function coerceSteps(v: unknown): LessonStep[] | null {
  if (!Array.isArray(v)) return null;
  const out: LessonStep[] = [];
  for (const item of v) {
    const o = asObj(item);
    if (!o || !isNum(o.num) || !isStr(o.label) || !isStr(o.body)) return null;
    if (o.formula !== undefined && !isStr(o.formula)) return null;
    if (o.fadable !== undefined && typeof o.fadable !== 'boolean') return null;
    if (o.reveal !== undefined && !isStr(o.reveal)) return null;
    out.push({
      num: o.num,
      label: o.label,
      body: o.body,
      ...(isStr(o.formula) ? { formula: o.formula } : {}),
      ...(typeof o.fadable === 'boolean' ? { fadable: o.fadable } : {}),
      ...(isStr(o.reveal) ? { reveal: o.reveal } : {}),
    });
  }
  return out;
}

/** quiz payload → LessonQuiz. answerIndex 는 options 범위 안이어야(형성평가 즉시 채점 신뢰성). */
function coerceQuiz(p: Record<string, unknown>): LessonQuiz | null {
  if (!isStr(p.question) || !isStrArr(p.options) || !isNum(p.answerIndex) || !isStr(p.explain)) return null;
  if (!isStrArr(p.hints) || !isStrArr(p.optionFeedback)) return null;
  if (p.answerIndex < 0 || p.answerIndex >= p.options.length) return null;
  if (p.relatedConceptId !== undefined && !isStr(p.relatedConceptId)) return null;
  return {
    question: p.question,
    options: p.options,
    answerIndex: p.answerIndex,
    explain: p.explain,
    hints: p.hints,
    optionFeedback: p.optionFeedback,
    ...(isStr(p.relatedConceptId) ? { relatedConceptId: p.relatedConceptId } : {}),
  };
}

/**
 * self-explain payload → SelfExplainPrompt.
 * BE payload(§1.6)는 conceptId/prompt/keywords/sampleAnswer 만 싣는다 — 등급별 피드백 카피는
 * 실지 않으므로 여기서 형성평가 기본 카피로 채운다(빨강 미사용, blue/slate 톤 — 렌더 계약 유지).
 */
function coerceSelfExplain(p: Record<string, unknown>): SelfExplainPrompt | null {
  if (!isStr(p.conceptId) || !isStr(p.prompt) || !isStrArr(p.keywords) || !isStr(p.sampleAnswer)) return null;
  return {
    conceptId: p.conceptId,
    prompt: p.prompt,
    keywords: p.keywords,
    sampleAnswer: p.sampleAnswer,
    feedbackStrong: '핵심을 잘 짚었어! 아래 모범 답안과 비교해봐.',
    feedbackPartial: '방향은 맞아. 빠진 키워드를 모범 답안에서 확인해봐.',
    feedbackWeak: '다시 한 번 정리해보자. 모범 답안을 참고하면 좋아.',
  };
}

/**
 * SSE `card` 프레임(cardType + payload) → 렌더 가능한 카드 turn.
 * cardType 이 허용 목록 밖이거나 payload 형상이 기대와 다르면 **null**(호출부 graceful skip/폴백).
 *
 * @param cardType - SSE card 프레임 cardType
 * @param payload - SSE card 프레임 payload(tool input · 미검증 raw)
 * @param ctx - FE 로컬 파생값(goalKey 등) 주입 — summary 달성도 배너 바인딩용
 * @returns 렌더 가능한 { kind, text, payload } 또는 null(형식 불일치)
 */
export function adaptCardToTurn(cardType: string, payload: unknown, ctx?: CardAdaptContext): AdaptedCardTurn | null {
  const kind = cardTypeToMessageKind(cardType);
  if (!kind) return null;
  const p = asObj(payload);
  if (!p) return null;

  switch (kind) {
    case 'lesson-intro':
      if (!isStr(p.topic) || !isStr(p.keyCallout)) return null;
      return { kind, text: '', payload: { topic: p.topic, keyCallout: p.keyCallout } };
    case 'concept': {
      const concept = coerceConcept(p);
      return concept ? { kind, text: '', payload: { concept } } : null;
    }
    case 'example': {
      const steps = coerceSteps(p.steps);
      if (!isStr(p.title) || !steps) return null;
      return { kind, text: '', payload: { title: p.title, steps } };
    }
    case 'quiz': {
      const quiz = coerceQuiz(p);
      return quiz
        ? { kind, text: '', payload: { quiz, ...(quiz.relatedConceptId ? { conceptId: quiz.relatedConceptId } : {}) } }
        : null;
    }
    case 'summary': {
      if (!isStr(p.text)) return null;
      const nextLine = isStr(p.nextLine) && p.nextLine ? p.nextLine : undefined;
      // BE 카드는 text/nextLine 만 싣고(§1.6 · ADR-065 open ⑩) goalKey 는 FE 가 로컬 파생해 주입한다
      // (ctx) — mock 경로(B7 finding#2)와 동일하게 SummaryProgress 달성도 배너가 라이브 store 를 읽는다.
      if (ctx?.goalKey) {
        return { kind, text: p.text, payload: { goalKey: ctx.goalKey, ...(nextLine ? { nextLine } : {}) } };
      }
      // ctx 없음(방어) — nextLine 을 본문에 합성한 평문 폴백(배너 없이도 정보 유실 없음).
      return { kind, text: nextLine ? `${p.text}\n\n${nextLine}` : p.text, payload: undefined };
    }
    case 'self-explain': {
      const prompt = coerceSelfExplain(p);
      return prompt ? { kind, text: '', payload: { prompt } } : null;
    }
    case 'problem-card':
      if (!isStr(p.problemNumber) || !isStr(p.title) || !isStr(p.ctaLabel) || !isStr(p.ctaHref)) return null;
      return {
        kind,
        text: '',
        payload: { problemNumber: p.problemNumber, title: p.title, ctaLabel: p.ctaLabel, ctaHref: p.ctaHref },
      };
  }
}
