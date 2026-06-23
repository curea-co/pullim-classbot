/**
 * 경량 리치 텍스트 — 봇 답변/카드 본문을 가독성 있게 렌더.
 *
 * 지원 마크업 (mock 콘텐츠 전용, 안전한 부분집합):
 *  - 인라인: **굵게**, `코드/수식`
 *  - 블록:  줄 시작 `- `/`• ` 불릿, `1) `/`1.`/`①` 번호, `💡` 콜아웃
 *
 * 파서는 순수 함수(parseInline/parseBlocks) — jest 단위 테스트로 검증.
 * XSS 없음: dangerouslySetInnerHTML 미사용, 텍스트만 노드로 변환.
 */

import { cn } from '@/lib/utils';

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string };

export type Block =
  | { type: 'p'; spans: InlineNode[] }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'ol'; items: { marker: string; spans: InlineNode[] }[] }
  | { type: 'callout'; spans: InlineNode[] };

const INLINE_RE = /\*\*([^*]+)\*\*|`([^`]+)`/g;
const BULLET_RE = /^\s*[-•]\s+(.*)$/;
const ORDERED_RE = /^\s*((?:\d+[).]|[①-⑳]))\s+(.*)$/; // 1) 1. ① ② …
const CALLOUT_RE = /^\s*💡\s*(.*)$/;

/** 인라인 마크업(**굵게**, `코드`)을 노드 배열로 파싱 */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) nodes.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ type: 'bold', value: m[1] });
    else nodes.push({ type: 'code', value: m[2] });
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

/** 본문을 블록(문단/불릿/번호/콜아웃) 배열로 파싱 */
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
      !ORDERED_RE.test(lines[i])
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
