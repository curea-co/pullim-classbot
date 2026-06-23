import { parseInline, parseBlocks } from '../rich-text';

describe('parseInline', () => {
  it('굵게/코드/평문을 노드로 분해한다', () => {
    expect(parseInline('극값 = **부호 변화** 점이야')).toEqual([
      { type: 'text', value: '극값 = ' },
      { type: 'bold', value: '부호 변화' },
      { type: 'text', value: ' 점이야' },
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
    const blocks = parseBlocks('① 도함수\n② 임계점');
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
});
