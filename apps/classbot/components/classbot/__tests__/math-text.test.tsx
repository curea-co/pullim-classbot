import { render, screen } from '@testing-library/react';
import { MathText, MathFormula, MathPiece, normalizeLatexEscapes, splitMath } from '../math-text';

/** KaTeX 는 MathML 쪽에 원본 LaTeX 를 그대로 싣는다 — 「무엇을 그렸나」를 여기서 읽는다. */
function renderedLatex(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('annotation[encoding="application/x-tex"]')).map(
    n => n.textContent ?? '',
  );
}

describe('normalizeLatexEscapes', () => {
  it('백슬래시 둘(dev 실측값)을 하나로 되돌린다', () => {
    const observed = String.raw`x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\quad (단, a \\neq 0, b^2 - 4ac \\geq 0)`;
    expect(normalizeLatexEscapes(observed)).toBe(
      String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \quad (단, a \neq 0, b^2 - 4ac \geq 0)`,
    );
  });

  it('백슬래시 하나짜리 정상 LaTeX 는 건드리지 않는다', () => {
    const sane = String.raw`\frac{1}{2} + \sqrt{x}`;
    expect(normalizeLatexEscapes(sane)).toBe(sane);
  });

  it('줄바꿈 `\\\\` 는 뒤에 글자가 붙지 않으므로 그대로 둔다', () => {
    // 진짜 LaTeX 에서 `\\` 는 줄바꿈이다. 이걸 반으로 줄이면 줄바꿈이 사라진다.
    const aligned = String.raw`\begin{aligned} a &= b \\ c &= d \end{aligned}`;
    expect(normalizeLatexEscapes(aligned)).toBe(aligned);
  });

  it('이중 이스케이프된 정렬식은 줄바꿈까지 정확히 복원한다', () => {
    const doubled = String.raw`\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}`;
    expect(normalizeLatexEscapes(doubled)).toBe(
      String.raw`\begin{aligned} a &= b \\ c &= d \end{aligned}`,
    );
  });

  it('백슬래시가 아예 없으면 손대지 않는다', () => {
    expect(normalizeLatexEscapes('그냥 한 줄')).toBe('그냥 한 줄');
  });
});

describe('되돌리기는 수식 구간에만 미친다', () => {
  // normalizeLatexEscapes 는 `\\`+알파벳을 이중 이스케이프로 본다 — 경로(`C:\\Users`)나
  // 코드처럼 수식이 아닌 글에 대고 돌리면 멀쩡한 백슬래시를 깎는다. 그래서 이 함수는
  // **수식 구간 안에서만** 불린다. 평문은 splitMath 가 text 조각으로 갈라 그대로 지나간다.
  it('수식 밖 평문의 백슬래시 둘은 그대로 남는다', () => {
    const { container } = render(<MathText text={'윈도 경로 C:\\\\Users 를 적는다'} />);
    expect(container.textContent).toBe('윈도 경로 C:\\\\Users 를 적는다');
  });
});

describe('splitMath', () => {
  it('인라인 `$…$` 를 수식 조각으로 가른다', () => {
    expect(splitMath('계수 $ax^2 + bx + c = 0$ 형태')).toEqual([
      { type: 'text', value: '계수 ' },
      { type: 'math', value: 'ax^2 + bx + c = 0' },
      { type: 'text', value: ' 형태' },
    ]);
  });

  it('블록 `$$…$$` 도 조각으로 가른다', () => {
    expect(splitMath('$$x^2$$')).toEqual([{ type: 'math', value: 'x^2' }]);
  });

  it('닫는 `$` 앞이 공백이면 수식으로 보지 않는다 — 값을 적은 평범한 문장', () => {
    const sentence = 'A는 $5, B는 $7 이야';
    expect(splitMath(sentence)).toEqual([{ type: 'text', value: sentence }]);
  });

  it('여는 `$` 뒤가 공백이면 수식으로 보지 않는다', () => {
    const sentence = '남은 돈은 $ 5 하고 $ 7 이야';
    expect(splitMath(sentence)).toEqual([{ type: 'text', value: sentence }]);
  });

  it('짝이 없는 `$` 하나는 그냥 글자다', () => {
    expect(splitMath('가격은 $5')).toEqual([{ type: 'text', value: '가격은 $5' }]);
  });

  it('줄을 넘어가는 `$` 짝은 잡지 않는다', () => {
    const two = '앞 $a\n뒤 b$';
    expect(splitMath(two)).toEqual([{ type: 'text', value: two }]);
  });
});

describe('MathText', () => {
  it('`$…$` 를 KaTeX 로 그리고 둘레 글자는 그대로 둔다', () => {
    const { container } = render(<MathText text="계수 확인: $ax^2 + bx + c = 0$ 형태로 정리" />);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(renderedLatex(container)).toEqual(['ax^2 + bx + c = 0']);
    expect(container.textContent).toContain('계수 확인: ');
    expect(container.textContent).toContain(' 형태로 정리');
  });

  it('백슬래시 둘로 온 수식(dev 실측값)도 정상 렌더된다', () => {
    const { container } = render(
      <MathText text={String.raw`근호 안 계산: $b^2 - 4ac$ 와 $\\sqrt{b^2 - 4ac}$ 를 먼저`} />,
    );
    // 두 번째 조각이 이중 이스케이프였다 — KaTeX 에는 백슬래시 하나로 들어가야 한다.
    expect(renderedLatex(container)).toEqual(['b^2 - 4ac', String.raw`\sqrt{b^2 - 4ac}`]);
  });

  it('수식이 아닌 문장은 손대지 않는다 — KaTeX 를 부르지 않는다', () => {
    const { container } = render(<MathText text="A는 $5, B는 $7 이야" />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toBe('A는 $5, B는 $7 이야');
  });

  it('깨진 수식이 와도 화면이 죽지 않고 원문이 보인다', () => {
    const { container } = render(<MathText text={String.raw`앞 $\frac$ 뒤`} />);
    expect(container.querySelector('.katex')).toBeNull();
    // 원문 그대로 — 빈 칸이나 에러 문구가 아니다.
    expect(container.textContent).toBe(String.raw`앞 \frac 뒤`);
  });

  it('깨진 수식 하나가 같은 글의 멀쩡한 수식을 끌고 내려가지 않는다', () => {
    const { container } = render(<MathText text={String.raw`$x^2$ 와 $\frac$ 와 $y^2$`} />);
    expect(renderedLatex(container)).toEqual(['x^2', 'y^2']);
    expect(container.textContent).toContain(String.raw`\frac`);
  });
});

describe('MathPiece', () => {
  it('display 면 블록(`.katex-display`)으로 그린다', () => {
    const { container } = render(<MathPiece latex="x^2" display />);
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });

  it('인라인이면 블록으로 그리지 않는다', () => {
    const { container } = render(<MathPiece latex="x^2" />);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('.katex-display')).toBeNull();
  });
});

describe('MathFormula', () => {
  it('구분자 없는 필드 전체를 블록 수식으로 그린다 — 백슬래시 둘도 받는다', () => {
    const { container } = render(
      <MathFormula
        latex={String.raw`x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\quad (단, a \\neq 0, b^2 - 4ac \\geq 0)`}
      />,
    );
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(renderedLatex(container)).toEqual([
      String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} \quad (단, a \neq 0, b^2 - 4ac \geq 0)`,
    ]);
  });

  it('못 그리는 식이면 원문을 그대로 보여준다', () => {
    render(<MathFormula latex={String.raw`\frac`} />);
    expect(screen.getByText(String.raw`\frac`)).toBeInTheDocument();
  });
});
