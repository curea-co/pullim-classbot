/**
 * 경량 리치 텍스트 — 봇 답변/카드 본문을 가독성 있게 렌더.
 *
 * 지원 마크업 (안전한 부분집합):
 *  - 인라인: **굵게**, `코드`, `$수식$` · `$$수식$$`
 *  - 블록:  줄 시작 `- `/`• ` 불릿, `1) `/`1.`/`①` 번호, `💡` 콜아웃,
 *           한 줄(또는 여러 줄)을 통째로 쓰는 `$$수식$$`
 *
 * 수식 판정·렌더은 `math-text.tsx` 한 곳이 진다 — 이 파일은 구분자 조각
 * (`BLOCK_MATH_SOURCE`·`INLINE_MATH_SOURCE`)을 그대로 붙여 써서 두 자리의 판정이 어긋나지
 * 않게 한다. 백슬래시가 둘로 오는 문제와 깨진 수식 폴백도 거기서 다룬다.
 *
 * 인라인 스캐너는 **한 번만 훑는다** — 같은 자리에서는 앞에 적힌 갈래가 이긴다. 그래서
 * `` `$x$` `` 는 코드로 남고, 코드 밖의 `$x$` 만 수식이 된다.
 *
 * 파서는 순수 함수(parseInline/parseBlocks) — jest 단위 테스트로 검증.
 * XSS 없음: 이 파일은 dangerouslySetInnerHTML 을 쓰지 않고 텍스트만 노드로 바꾼다.
 * 수식은 KaTeX 가 `trust:false` 기본값(`\href` 등이 닫힌 상태)으로 그린다.
 */

import { MathPiece, BLOCK_MATH_SOURCE, INLINE_MATH_SOURCE } from '@/components/classbot/math-text';
import { cn } from '@/lib/utils';

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'math'; value: string };

export type Block =
  | { type: 'p'; spans: InlineNode[] }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'ol'; items: { marker: string; spans: InlineNode[] }[] }
  | { type: 'callout'; spans: InlineNode[] }
  | { type: 'math'; latex: string };

const INLINE_RE = new RegExp(
  [String.raw`\*\*(?<bold>[^*]+)\*\*`, '`(?<code>[^`]+)`', BLOCK_MATH_SOURCE, INLINE_MATH_SOURCE].join('|'),
  'g',
);
const BULLET_RE = /^\s*[-•]\s+(.*)$/;
const ORDERED_RE = /^\s*((?:\d+[).]|[①-⑳]))\s+(.*)$/; // 1) 1. ① ② …
const CALLOUT_RE = /^\s*💡\s*(.*)$/;
/** 줄이 `$$` 로 시작하면 블록 수식의 시작으로 본다. */
const BLOCK_MATH_OPEN_RE = /^\s*\$\$/;
/** 한 줄에서 열고 닫는 `$$…$$`. */
const BLOCK_MATH_ONE_LINE_RE = /^\s*\$\$([\s\S]+?)\$\$\s*$/;
/** 여러 줄에 걸친 블록 수식의 닫는 줄. */
const BLOCK_MATH_CLOSE_RE = /^([\s\S]*?)\$\$\s*$/;

/** 인라인 마크업(**굵게**, `코드`, `$수식$`)을 노드 배열로 파싱 */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) nodes.push({ type: 'text', value: text.slice(last, m.index) });
    const g = m.groups ?? {};
    if (g.bold !== undefined) nodes.push({ type: 'bold', value: g.bold });
    else if (g.code !== undefined) nodes.push({ type: 'code', value: g.code });
    else nodes.push({ type: 'math', value: g.blockMath ?? g.inlineMath ?? '' });
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

/**
 * 줄 `i` 에서 시작하는 블록 수식(`$$…$$`)을 떼어낸다. 한 줄짜리와 여러 줄짜리를 모두 받는다.
 * 닫는 `$$` 가 끝내 없으면 null — 그 줄은 평문 문단으로 흘러간다(반쪽 구분자에 본문을 잃지 않는다).
 *
 * @param lines - 본문을 줄 단위로 자른 배열
 * @param i - 검사할 줄 번호
 * @returns 떼어낸 LaTeX 와 다음에 볼 줄 번호, 또는 null
 */
function takeBlockMath(lines: string[], i: number): { latex: string; next: number } | null {
  if (!BLOCK_MATH_OPEN_RE.test(lines[i])) return null;
  const oneLine = BLOCK_MATH_ONE_LINE_RE.exec(lines[i]);
  if (oneLine) return { latex: oneLine[1].trim(), next: i + 1 };
  const head = lines[i].replace(BLOCK_MATH_OPEN_RE, '');
  const body: string[] = head.trim() ? [head] : [];
  for (let j = i + 1; j < lines.length; j++) {
    const close = BLOCK_MATH_CLOSE_RE.exec(lines[j]);
    if (close) {
      if (close[1].trim()) body.push(close[1]);
      return { latex: body.join('\n').trim(), next: j + 1 };
    }
    body.push(lines[j]);
  }
  return null;
}

/** 본문을 블록(문단/불릿/번호/콜아웃/블록수식) 배열로 파싱 */
export function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    // 블록 수식이 먼저다 — `$$` 로 시작하는 줄은 아래 어느 갈래에도 걸리지 않으므로
    // 여기서 잡지 않으면 문단으로 흘러 인라인 스캐너가 반쪽으로 나눠 갖는다.
    const blockMath = takeBlockMath(lines, i);
    if (blockMath) {
      if (blockMath.latex) blocks.push({ type: 'math', latex: blockMath.latex });
      i = blockMath.next;
      continue;
    }
    let mm: RegExpExecArray | null;
    if ((mm = CALLOUT_RE.exec(line))) {
      blocks.push({ type: 'callout', spans: parseInline(mm[1]) });
      i++;
      continue;
    }
    if (BULLET_RE.test(line)) {
      const items: InlineNode[][] = [];
      while (i < lines.length && (mm = BULLET_RE.exec(lines[i]))) {
        items.push(parseInline(mm[1]));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (ORDERED_RE.test(line)) {
      const items: { marker: string; spans: InlineNode[] }[] = [];
      while (i < lines.length && (mm = ORDERED_RE.exec(lines[i]))) {
        items.push({ marker: mm[1], spans: parseInline(mm[2]) });
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    // 문단 — 다음 빈 줄/특수 줄 전까지 묶음
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !CALLOUT_RE.test(lines[i]) &&
      !BULLET_RE.test(lines[i]) &&
      !ORDERED_RE.test(lines[i]) &&
      !BLOCK_MATH_OPEN_RE.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', spans: parseInline(para.join('\n')) });
  }
  return blocks;
}

function Spans({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'bold') return <strong key={i} className="font-bold">{n.value}</strong>;
        // 문단·목록 안이라 `<div>` 를 만드는 블록 렌더는 쓰지 않는다 — 인라인으로 그린다.
        if (n.type === 'math') return <MathPiece key={i} latex={n.value} />;
        if (n.type === 'code')
          return (
            <code
              key={i}
              className="bg-pullim-slate-100 text-pullim-slate-800 mx-0.5 rounded px-1 py-0.5 font-mono text-[0.85em]"
            >
              {n.value}
            </code>
          );
        return <span key={i}>{n.value}</span>;
      })}
    </>
  );
}

/**
 * 리치 텍스트 렌더. 글자 크기는 부모(버블/카드)에서 상속 — 여기선 구조/강조만.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cn('space-y-2 whitespace-pre-wrap', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'math') {
          // 긴 식이 말풍선을 밀지 않도록 가로로만 흐르게 둔다.
          return (
            <div key={i} className="overflow-x-auto">
              <MathPiece latex={b.latex} display />
            </div>
          );
        }
        if (b.type === 'callout') {
          return (
            <div
              key={i}
              className="bg-pullim-blue-50 border-l-pullim-blue-400 text-pullim-slate-800 rounded-r-lg border-l-[3px] px-3 py-2"
            >
              <span className="mr-1">💡</span>
              <Spans nodes={b.spans} />
            </div>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-pullim-blue-500 mt-[2px] shrink-0">•</span>
                  <span className="min-w-0 flex-1"><Spans nodes={item} /></span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ul key={i} className="space-y-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-pullim-blue-600 shrink-0 font-bold">{item.marker}</span>
                  <span className="min-w-0 flex-1"><Spans nodes={item.spans} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            <Spans nodes={b.spans} />
          </p>
        );
      })}
    </div>
  );
}
