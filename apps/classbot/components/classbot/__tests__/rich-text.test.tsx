import { render } from '@testing-library/react';
import { parseInline, parseBlocks, RichText } from '../rich-text';

describe('parseInline', () => {
  it('굵게/코드/평문을 노드로 분해한다', () => {
    expect(parseInline('기울기 = **변화량의 비** 야')).toEqual([
      { type: 'text', value: '기울기 = ' },
      { type: 'bold', value: '변화량의 비' },
      { type: 'text', value: ' 야' },
    ]);
  });

  it('인라인 코드를 인식한다', () => {
    expect(parseInline('공식은 `V=IR` 이다')).toEqual([
      { type: 'text', value: '공식은 ' },
      { type: 'code', value: 'V=IR' },
      { type: 'text', value: ' 이다' },
    ]);
  });

  it('마크업이 없으면 단일 text 노드', () => {
    expect(parseInline('그냥 텍스트')).toEqual([{ type: 'text', value: '그냥 텍스트' }]);
  });

  it('굵게+코드 혼합', () => {
    const r = parseInline('**핵심** 은 `f(x)`');
    expect(r).toEqual([
      { type: 'bold', value: '핵심' },
      { type: 'text', value: ' 은 ' },
      { type: 'code', value: 'f(x)' },
    ]);
  });
});

describe('parseBlocks', () => {
  it('불릿 줄을 ul 블록으로 묶는다', () => {
    const blocks = parseBlocks('- 첫째\n- 둘째');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('ul');
    if (blocks[0].type === 'ul') {
      expect(blocks[0].items).toHaveLength(2);
      expect(blocks[0].items[0]).toEqual([{ type: 'text', value: '첫째' }]);
    }
  });

  it('번호(① / 1)) 줄을 ol 블록으로 묶고 marker 를 보존한다', () => {
    const blocks = parseBlocks('① 기울기\n② y절편');
    expect(blocks[0].type).toBe('ol');
    if (blocks[0].type === 'ol') {
      expect(blocks[0].items[0].marker).toBe('①');
      expect(blocks[0].items[1].marker).toBe('②');
    }
  });

  it('💡 줄을 callout 블록으로 분리한다', () => {
    const blocks = parseBlocks('💡 핵심 한 줄');
    expect(blocks[0].type).toBe('callout');
    if (blocks[0].type === 'callout') {
      expect(blocks[0].spans).toEqual([{ type: 'text', value: '핵심 한 줄' }]);
    }
  });

  it('문단과 불릿이 섞인 본문을 순서대로 분해한다', () => {
    const blocks = parseBlocks('설명 문장\n- 항목1\n- 항목2\n\n다음 문단');
    expect(blocks.map(b => b.type)).toEqual(['p', 'ul', 'p']);
  });

  it('빈 줄은 무시한다', () => {
    const blocks = parseBlocks('A\n\n\nB');
    expect(blocks.map(b => b.type)).toEqual(['p', 'p']);
  });

  it('한 줄을 통째로 쓴 `$$…$$` 는 math 블록으로 뗀다', () => {
    const blocks = parseBlocks('설명\n$$x = \\frac{1}{2}$$\n다음 줄');
    expect(blocks.map(b => b.type)).toEqual(['p', 'math', 'p']);
    const math = blocks[1];
    if (math.type === 'math') expect(math.latex).toBe('x = \\frac{1}{2}');
  });

  it('여러 줄에 걸친 `$$` 블록도 하나로 묶는다', () => {
    const blocks = parseBlocks('$$\nx = 1\ny = 2\n$$');
    expect(blocks.map(b => b.type)).toEqual(['math']);
    const math = blocks[0];
    if (math.type === 'math') expect(math.latex).toBe('x = 1\ny = 2');
  });

  it('닫는 `$$` 가 없으면 블록으로 삼키지 않고 평문으로 둔다', () => {
    const blocks = parseBlocks('$$ 반쪽 구분자\n그 다음 줄');
    expect(blocks.map(b => b.type)).toEqual(['p']);
  });
});

describe('parseInline — 수식', () => {
  it('`$…$` 를 math 노드로 분해한다', () => {
    expect(parseInline('계수 $a, b, c$의 부호')).toEqual([
      { type: 'text', value: '계수 ' },
      { type: 'math', value: 'a, b, c' },
      { type: 'text', value: '의 부호' },
    ]);
  });

  it('백틱 코드 안의 `$` 는 코드로 남는다 — 스캔은 한 번이고 앞 갈래가 이긴다', () => {
    expect(parseInline('보기 `$x$` 처럼')).toEqual([
      { type: 'text', value: '보기 ' },
      { type: 'code', value: '$x$' },
      { type: 'text', value: ' 처럼' },
    ]);
  });

  it('닫는 `$` 앞이 공백인 평범한 문장은 수식으로 보지 않는다', () => {
    expect(parseInline('A는 $5, B는 $7')).toEqual([{ type: 'text', value: 'A는 $5, B는 $7' }]);
  });

  it('굵게·코드·수식이 섞여도 순서대로 분해한다', () => {
    expect(parseInline('**핵심** 은 `f(x)` 이고 $x^2$ 이다')).toEqual([
      { type: 'bold', value: '핵심' },
      { type: 'text', value: ' 은 ' },
      { type: 'code', value: 'f(x)' },
      { type: 'text', value: ' 이고 ' },
      { type: 'math', value: 'x^2' },
      { type: 'text', value: ' 이다' },
    ]);
  });
});

describe('RichText 렌더', () => {
  it('말풍선 본문의 `$…$` 를 KaTeX 로 그린다', () => {
    const { container } = render(<RichText text="계수 확인: $ax^2 + bx + c = 0$ 형태" />);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(
      container.querySelector('annotation[encoding="application/x-tex"]')?.textContent,
    ).toBe('ax^2 + bx + c = 0');
  });

  it('백슬래시 둘로 온 수식(dev 실측값)도 정상 렌더된다', () => {
    const { container } = render(
      <RichText text={String.raw`$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`} />,
    );
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(
      container.querySelector('annotation[encoding="application/x-tex"]')?.textContent,
    ).toBe(String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`);
  });

  it('블록 수식은 `<p>` 안에 넣지 않는다 — 중첩이 깨지면 안 된다', () => {
    const { container } = render(<RichText text={'설명 줄\n$$x^2$$'} />);
    expect(container.querySelector('p .katex-display')).toBeNull();
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });

  it('깨진 수식이 와도 본문이 살아 있고 원문이 보인다', () => {
    const { container } = render(<RichText text={String.raw`앞말 $\frac$ 뒷말`} />);
    expect(container.textContent).toContain('앞말');
    expect(container.textContent).toContain('뒷말');
    expect(container.textContent).toContain(String.raw`\frac`);
    // KaTeX 의 빨간 에러 표시가 아니라 우리 원문 폴백이어야 한다.
    expect(container.querySelector('.katex-error')).toBeNull();
  });

  it('수식 없는 본문은 KaTeX 를 부르지 않는다', () => {
    const { container } = render(<RichText text="기울기 = **변화량의 비** 야" />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toBe('기울기 = 변화량의 비 야');
  });
});
