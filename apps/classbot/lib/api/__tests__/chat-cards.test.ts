/**
 * chat-cards — SSE card 프레임 → FE 카드 Turn 어댑터 단위 테스트(ADR-065 v2).
 * 검증:
 *  - cardTypeToMessageKind: 허용 7종 → 동일 문자열, 그 외 → null
 *  - adaptCardToTurn: 각 kind payload 를 FE Turn payload(concept/quiz wrapper 포함)로 적응
 *  - 형식 방어: 필수 필드 누락·타입 불일치·비객체 payload → null(graceful skip)
 */
import { cardTypeToMessageKind, adaptCardToTurn, CARD_TYPES } from '../chat-cards';

describe('cardTypeToMessageKind — cardType → MessageKind(부분집합) 매핑', () => {
  it.each(CARD_TYPES)('허용 kind %s 는 동일 문자열로 통과', kind => {
    expect(cardTypeToMessageKind(kind)).toBe(kind);
  });

  it.each(['text', 'concept-detail', 'explain-step', 'bogus', ''])('허용 밖 %p 은 null', s => {
    expect(cardTypeToMessageKind(s)).toBeNull();
  });
});

describe('adaptCardToTurn — 정상 payload 적응', () => {
  it('lesson-intro → { topic, keyCallout } 직통', () => {
    const r = adaptCardToTurn('lesson-intro', { topic: '미분', keyCallout: '순간 변화율' });
    expect(r).toEqual({ kind: 'lesson-intro', text: '', payload: { topic: '미분', keyCallout: '순간 변화율' } });
  });

  it('concept → { concept: LessonConcept } 로 wrap(mock 렌더 계약)', () => {
    const payload = {
      id: 'c1',
      title: '도함수',
      summary: '순간 변화율',
      detail: '자세히',
      tips: ['팁1'],
      coreElements: ['극한'],
      formula: "f'(x)",
      sampleQuestions: [{ q: 'Q1', a: 'A1' }, { q: 'Q2' }],
    };
    const r = adaptCardToTurn('concept', payload);
    expect(r?.kind).toBe('concept');
    expect(r).toMatchObject({ payload: { concept: payload } });
  });

  it('example → { title, steps } 직통(선택 필드 보존)', () => {
    const r = adaptCardToTurn('example', {
      title: '예제',
      steps: [{ num: 1, label: 'a', body: 'b', formula: 'x', fadable: true, reveal: 'r' }],
    });
    expect(r).toEqual({
      kind: 'example',
      text: '',
      payload: { title: '예제', steps: [{ num: 1, label: 'a', body: 'b', formula: 'x', fadable: true, reveal: 'r' }] },
    });
  });

  it('quiz → { quiz, conceptId } — relatedConceptId 를 conceptId 로 승격(형성평가 정답·해설 동봉)', () => {
    const payload = {
      question: 'Q',
      options: ['a', 'b', 'c'],
      answerIndex: 1,
      explain: '해설',
      hints: ['h1'],
      optionFeedback: ['fa', 'fb', 'fc'],
      relatedConceptId: 'c1',
    };
    const r = adaptCardToTurn('quiz', payload);
    expect(r?.kind).toBe('quiz');
    expect(r).toMatchObject({ payload: { quiz: payload, conceptId: 'c1' } });
  });

  it('summary → text 본문(goalKey 없음·payload undefined), nextLine 은 본문 뒤에 합성', () => {
    const r = adaptCardToTurn('summary', { text: '오늘 정리', nextLine: '다음엔 적분' });
    expect(r).toEqual({ kind: 'summary', text: '오늘 정리\n\n다음엔 적분', payload: undefined });
  });

  it('self-explain → { prompt } — BE 미포함 등급 피드백은 기본 카피로 채움', () => {
    const r = adaptCardToTurn('self-explain', {
      conceptId: 'c1',
      prompt: '네 말로 설명해봐',
      keywords: ['변화율'],
      sampleAnswer: '모범 답안',
    });
    if (r?.kind !== 'self-explain') throw new Error('expected self-explain');
    const prompt = r.payload.prompt;
    expect(prompt).toMatchObject({ conceptId: 'c1', prompt: '네 말로 설명해봐', keywords: ['변화율'], sampleAnswer: '모범 답안' });
    expect(typeof prompt.feedbackStrong).toBe('string');
    expect(typeof prompt.feedbackPartial).toBe('string');
    expect(typeof prompt.feedbackWeak).toBe('string');
  });

  it('problem-card → { problemNumber, title, ctaLabel, ctaHref } 직통', () => {
    const r = adaptCardToTurn('problem-card', {
      problemNumber: '3',
      title: '연습',
      ctaLabel: '풀러 가기',
      ctaHref: '/classbot/learn/cb_001',
    });
    expect(r).toEqual({
      kind: 'problem-card',
      text: '',
      payload: { problemNumber: '3', title: '연습', ctaLabel: '풀러 가기', ctaHref: '/classbot/learn/cb_001' },
    });
  });
});

describe('adaptCardToTurn — 형식 방어(graceful null)', () => {
  it('알 수 없는 cardType → null', () => {
    expect(adaptCardToTurn('bogus', { topic: 't', keyCallout: 'k' })).toBeNull();
  });

  it('payload 가 객체가 아니면 null', () => {
    expect(adaptCardToTurn('lesson-intro', null)).toBeNull();
    expect(adaptCardToTurn('lesson-intro', 'str')).toBeNull();
    expect(adaptCardToTurn('lesson-intro', ['arr'])).toBeNull();
  });

  it('lesson-intro 필수 필드 누락/타입 불일치 → null', () => {
    expect(adaptCardToTurn('lesson-intro', { topic: '미분' })).toBeNull();
    expect(adaptCardToTurn('lesson-intro', { topic: 1, keyCallout: 'k' })).toBeNull();
  });

  it('concept sampleQuestions 형식 불량 → null', () => {
    expect(
      adaptCardToTurn('concept', {
        id: 'c1', title: 't', summary: 's', detail: 'd', tips: [], coreElements: [],
        sampleQuestions: [{ noQ: true }],
      }),
    ).toBeNull();
  });

  it('quiz answerIndex 범위 밖 → null(즉시 채점 신뢰성 방어)', () => {
    expect(
      adaptCardToTurn('quiz', {
        question: 'Q', options: ['a', 'b'], answerIndex: 5, explain: 'e', hints: [], optionFeedback: ['a', 'b'],
      }),
    ).toBeNull();
  });

  it('example steps 항목 필수 필드 누락 → null', () => {
    expect(adaptCardToTurn('example', { title: 't', steps: [{ num: 1, label: 'a' }] })).toBeNull();
  });

  it('summary text 누락 → null', () => {
    expect(adaptCardToTurn('summary', { nextLine: 'x' })).toBeNull();
  });
});
