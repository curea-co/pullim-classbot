/**
 * 봇 카드 본문에 수식이 실제로 그려지는지 — 카드별로 자리 하나씩 잡아 본다.
 *
 * `math-text`·`rich-text` 단위 테스트는 **렌더러**가 맞게 도는지를 본다. 이 파일은 그 렌더러가
 * **카드의 그 자리에 걸려 있는지**를 본다 — 어느 자리를 날것 `{값}` 으로 되돌리면 여기가 빨개진다.
 *
 * **퀴즈 카드만** `<AuthProvider>` 없이는 못 선다 — `InlineQuiz` 가 `useCurrentUser()`(→
 * `useAuth()`)를 타고, 그 훅은 provider 밖에서 던진다. 그 카드의 본문도 같은 `MathText` 를
 * 거치므로 렌더러 쪽 하중은 `math-text.test.tsx` 가 진다.
 * (자기설명 카드는 `useLessonActionStore` + `useState` 뿐이라 그냥 선다 — 아래에서 세운다.)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBody } from '../page';
import type { LessonConcept, LessonStep } from '@/lib/mock/classbot-lesson';

type Turn = Parameters<typeof MessageBody>[0]['turn'];

function body(turn: Partial<Turn>) {
  return render(
    <MessageBody
      turn={{ id: 't', role: 'bot', at: 0, text: '', ...turn } as Turn}
      isStudent={false}
      botLinerHex="#000000"
      botId="bot_1"
      scope={3}
      onCardReveal={() => {}}
    />,
  ).container;
}

/** KaTeX 가 MathML 쪽에 싣는 원본 LaTeX — 「무엇을 그렸나」를 여기서 읽는다. */
function renderedLatex(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('annotation[encoding="application/x-tex"]')).map(
    n => n.textContent ?? '',
  );
}

/** dev 실측값 — 모델이 백슬래시를 한 번 더 이스케이프해 보낸 근의 공식. */
const OBSERVED = String.raw`x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`;
const OBSERVED_FIXED = String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;

const concept = (over: Partial<LessonConcept> = {}): LessonConcept => ({
  id: 'c1',
  title: '근의 공식',
  summary: '요약',
  detail: '상세',
  tips: [],
  coreElements: [],
  sampleQuestions: [],
  ...over,
});

const step = (over: Partial<LessonStep> = {}): LessonStep => ({
  num: 1,
  label: '단계',
  body: '본문',
  ...over,
});

describe('MessageBody — 카드 본문의 수식', () => {
  it('말풍선 글의 `$…$` 를 그린다', () => {
    const c = body({ kind: 'text', text: '계수 $ax^2 + bx + c = 0$ 를 정리' });
    expect(renderedLatex(c)).toEqual(['ax^2 + bx + c = 0']);
  });

  it('개념 카드 — 제목·요약·핵심요소의 수식과 formula 필드', () => {
    const c = body({
      kind: 'concept',
      payload: {
        concept: concept({
          title: '근의 공식 $x$',
          summary: '판별식은 $b^2 - 4ac$ 야',
          coreElements: ['$a \\neq 0$'],
          formula: OBSERVED,
        }),
      },
    });
    // DOM 순서 — 제목 · 요약 · formula · 핵심요소.
    expect(renderedLatex(c)).toEqual(['x', 'b^2 - 4ac', OBSERVED_FIXED, String.raw`a \neq 0`]);
  });

  it('개념 상세 — 학습 팁·예제 문항·formula', () => {
    const c = body({
      kind: 'concept-detail',
      payload: {
        concept: concept({
          detail: '본문은 $y = ax + b$',
          tips: ['$a$ 의 부호를 먼저'],
          sampleQuestions: [{ q: '$x^2 = 4$ 의 해는?', a: '$x = \\pm 2$' }],
          formula: OBSERVED,
        }),
      },
    });
    expect(renderedLatex(c)).toEqual([
      'y = ax + b',
      OBSERVED_FIXED,
      'a',
      'x^2 = 4',
      String.raw`x = \pm 2`,
    ]);
  });

  it('예제 카드 — 단계 제목·본문·formula', () => {
    const c = body({
      kind: 'example',
      payload: {
        title: '$x$ 구하기',
        steps: [step({ label: '$a$ 찾기', body: '$b^2$ 계산', formula: OBSERVED })],
      },
    });
    expect(renderedLatex(c)).toEqual(['x', 'a', 'b^2', OBSERVED_FIXED]);
  });

  it('풀이 단계 카드 — 단계 제목·본문·formula', () => {
    const c = body({
      kind: 'explain-step',
      payload: { steps: [{ num: 1, label: '$a$ 찾기', body: '$b^2$ 계산', formula: OBSERVED }] },
    });
    expect(renderedLatex(c)).toEqual(['a', 'b^2', OBSERVED_FIXED]);
  });

  it('수업 오프너 — 오늘의 개념과 핵심 한 줄', () => {
    const c = body({
      kind: 'lesson-intro',
      text: '오늘은 $x$ 를 배워요',
      payload: { topic: '이차방정식 $ax^2$', keyCallout: '핵심은 $b^2 - 4ac$' },
    });
    expect(renderedLatex(c)).toEqual(['ax^2', 'x', 'b^2 - 4ac']);
  });

  it('문제 카드 — 제목', () => {
    const c = body({
      kind: 'problem-card',
      payload: { problemNumber: '3', title: '$x^2 - 1 = 0$ 풀기', ctaLabel: '학습', ctaHref: '/x' },
    });
    expect(renderedLatex(c)).toEqual(['x^2 - 1 = 0']);
  });

  it('자기설명 카드 — 물음', () => {
    const c = body({
      kind: 'self-explain',
      payload: {
        prompt: {
          conceptId: 'c1',
          prompt: '$b^2 - 4ac$ 가 뭘 뜻하는지 네 말로 설명해봐',
          keywords: ['판별식'],
          sampleAnswer: '$b^2 - 4ac$ 는 판별식이야',
          feedbackStrong: '잘했어',
          feedbackPartial: '거의 맞아',
          feedbackWeak: '다시 보자',
        },
      },
    });
    expect(renderedLatex(c)).toEqual(['b^2 - 4ac']);
  });

  it('자기설명 카드 — 제출 뒤 보이는 모범 답안', () => {
    const c = body({
      kind: 'self-explain',
      payload: {
        prompt: {
          conceptId: 'c1',
          prompt: '설명해봐',
          keywords: ['판별식'],
          sampleAnswer: '판별식은 $b^2 - 4ac$ 야',
          feedbackStrong: '잘했어',
          feedbackPartial: '거의 맞아',
          feedbackWeak: '다시 보자',
        },
      },
    });
    fireEvent.change(screen.getByLabelText('자기설명 입력'), { target: { value: '판별식' } });
    fireEvent.click(screen.getByRole('button', { name: /설명 제출하기/ }));
    expect(renderedLatex(c)).toEqual(['b^2 - 4ac']);
  });

  it('오늘 정리 카드 — 「다음 한 걸음」', () => {
    const c = body({
      kind: 'summary',
      text: '오늘은 여기까지!',
      payload: { goalKey: 'me::bot_1::2026-09-19', nextLine: '다음엔 $b^2 - 4ac$ 를 더 풀어보자' },
    });
    expect(renderedLatex(c)).toEqual(['b^2 - 4ac']);
  });

  it('깨진 수식이 와도 카드가 죽지 않고 원문이 보인다', () => {
    const c = body({
      kind: 'concept',
      payload: { concept: concept({ title: '제목', formula: String.raw`\frac` }) },
    });
    expect(c.textContent).toContain('제목');
    expect(c.textContent).toContain(String.raw`\frac`);
    // KaTeX 의 빨간 에러 표시가 아니라 우리 원문 폴백이어야 한다.
    expect(c.querySelector('.katex-error')).toBeNull();
  });
});
