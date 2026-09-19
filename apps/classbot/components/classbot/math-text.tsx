'use client';

/**
 * 수식 렌더 — 봇이 보낸 LaTeX 를 KaTeX 로 그린다.
 *
 * 봇 대화의 글은 모델이 쓴다. 모델은 수식을 LaTeX 로 적어 보내므로 그대로 두면 학생 화면에
 * `x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}` 같은 글자가 날것으로 뜬다. 이 파일이 그 글자를
 * 수식 모양으로 바꾸는 한 자리이고, 봇 카드·말풍선은 모두 여기를 거친다.
 *
 * ## 무엇을 수식으로 보는가
 * - `$…$` 인라인, `$$…$$` 블록 두 구분자만 본다.
 * - `$` 바로 뒤와 닫는 `$` 바로 앞에 **공백을 금한다.** 「A는 $5, B는 $7」 같은 평범한 문장이
 *   수식으로 잘못 잡히는 것을 막는 규칙이다(닫는 `$` 앞이 공백이면 짝으로 치지 않는다).
 * - `\(…\)` · `\[…\]` 는 보지 않는다 — 아래 이중 이스케이프 문제와 겹쳐 오검출이 커진다.
 *   `formula` 같은 **필드 전체가 수식**인 자리는 구분자 없이 {@link MathFormula} 로 그린다.
 *
 * ## ⚠️ 백슬래시가 둘로 오는 문제
 * dev 실측값은 `\frac` 이 아니라 `\\frac` 이었다(백슬래시 **두 개**). FE 로 오는 경로는
 * SSE `card`/`token` 프레임 → `JSON.parse` 한 번뿐이라(`lib/api/chat-stream.ts`) FE 가 늘리는
 * 자리는 없다. 모델이 tool input JSON 을 쓰며 백슬래시를 **한 번 더** 이스케이프한 것이고,
 * BE 는 그 글자를 그대로 흘린다. 그래서 원본은 건드리지 않고 **KaTeX 에 넣기 직전**에만
 * 되돌린다({@link normalizeLatexEscapes}) — 스토어·히스토리에는 받은 글자가 그대로 남는다.
 *
 * ## 깨져도 화면은 살아 있어야 한다
 * 모델 출력이라 언제든 못 그리는 수식이 온다. KaTeX 는 그때 던지므로 두 겹으로 받는다 —
 * `renderError`(ParseError/TypeError)와 에러 경계(그 밖의 예외). 둘 다 **원문을 그대로**
 * 보여준다. 빈 칸이나 에러 문구보다 원문이 낫다.
 *
 * ## XSS
 * KaTeX 의 `trust` 기본값은 `false` 다(`\href`·`\url` 등이 닫힌다). react-katex 는 그 값을
 * 넘길 통로 자체가 없어 기본이 그대로 걸린다 — 이 파일도 열지 않는다.
 *
 * ## 알아 둘 것 — 수식 속 한글은 콘솔에 경고를 남긴다
 * `(단, a \neq 0)` 처럼 수식 안에 한글이 섞이면 KaTeX 가 `unicodeTextInMathMode` 를
 * `console.warn` 한다(기본 `strict: 'warn'`). **글자는 정상으로 그려진다** — 경고만 남는다.
 * react-katex 가 `strict` 를 넘길 통로를 열어 두지 않아 지금은 끄지 않는다.
 */

import { Component, memo, useCallback, useMemo, type ReactNode } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

import { cn } from '@/lib/utils';

/* ─── 순수 파서(테스트 단위) ─── */

/**
 * 블록 구분자 `$$…$$` 의 정규식 조각. 안쪽 캡처 이름은 `blockMath`.
 * `rich-text.tsx` 의 인라인 스캐너도 이 조각을 그대로 붙여 써서 두 곳의 판정이 어긋나지 않는다.
 */
export const BLOCK_MATH_SOURCE = String.raw`\$\$(?<blockMath>[^$]+?)\$\$`;

/**
 * 인라인 구분자 `$…$` 의 정규식 조각. 안쪽 캡처 이름은 `inlineMath`.
 * 여는 `$` 뒤(`(?=\S)`)와 닫는 `$` 앞(`[^\s$]`)의 공백을 금해 평문 속 달러 기호를 거른다.
 * 줄바꿈도 넘지 않는다(`[^$\n]`) — 문단 두 개를 한 수식으로 삼키지 않게.
 */
export const INLINE_MATH_SOURCE = String.raw`\$(?=\S)(?<inlineMath>[^$\n]*[^\s$])\$`;

const MATH_RE = new RegExp(`${BLOCK_MATH_SOURCE}|${INLINE_MATH_SOURCE}`, 'g');

/** 수식/평문 조각. */
export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string };

/**
 * 백슬래시가 둘로 온 LaTeX 를 되돌린다.
 *
 * 판정은 「`\\` 바로 뒤에 알파벳이 오는가」 하나다. 진짜 LaTeX 에서 `\\` 는 줄바꿈이라
 * 뒤에 `[`·`*`·공백·줄끝이 오지 명령 이름이 바로 붙지 않는다. 그래서 `\\frac` 처럼 붙은
 * 자리가 한 번이라도 보이면 그 조각 전체가 이중 이스케이프로 보고 백슬래시 쌍을 반으로 줄인다.
 *
 * 이 판정 덕에 진짜 줄바꿈 `\\` 는 건드리지 않는다 —
 * `\begin{aligned} a &= b \\ c &= d \end{aligned}` 에는 `\\`+알파벳이 없어 그대로 나간다.
 * 반대로 그 식이 이중 이스케이프로 오면(`\\begin … \\\\ … \\end`) 반으로 줄여 원형이 된다.
 *
 * @param src - 받은 그대로의 LaTeX 조각
 * @returns KaTeX 에 넣을 LaTeX
 */
export function normalizeLatexEscapes(src: string): string {
  if (!/\\\\[a-zA-Z]/.test(src)) return src;
  return src.replace(/\\\\/g, '\\');
}

/**
 * 글을 평문/수식 조각으로 가른다. 수식이 없으면 조각 하나(또는 빈 글이면 빈 배열).
 * 블록·인라인 구분자 모두 **인라인으로 그릴 조각**을 돌려준다 — 이 결과는 `<p>`·`<li>`·
 * `<button>` 안에서도 쓰이므로 `<div>` 를 만드는 블록 렌더는 여기서 내지 않는다.
 *
 * @param text - 본문(수식이 섞였을 수 있는 글)
 */
export function splitMath(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(text))) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'math', value: m.groups?.blockMath ?? m.groups?.inlineMath ?? '' });
    last = MATH_RE.lastIndex;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/* ─── 렌더 ─── */

/** 수식을 못 그렸을 때 대신 보여줄 원문. */
function RawLatex({ latex }: { latex: string }) {
  return <span className="font-mono text-[0.9em] break-words whitespace-pre-wrap">{latex}</span>;
}

/**
 * 수식 한 조각을 감싸는 에러 경계.
 *
 * `renderError` 는 KaTeX 의 ParseError/TypeError 만 잡는다 — 그 밖의 예외(예: 과도한 매크로
 * 전개가 부르는 RangeError)는 react-katex 가 다시 던지고, 막지 않으면 대화 화면 전체가 죽는다.
 * 여기서 받아 원문으로 접는다. 호출부가 `key={latex}` 를 주므로 수식이 바뀌면 새 인스턴스가
 * 생겨 상태가 저절로 풀린다.
 */
class MathBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Katex = memo(function Katex({
  latex,
  display,
}: {
  latex: string;
  display: boolean;
}) {
  const source = useMemo(() => normalizeLatexEscapes(latex), [latex]);
  // 원문 폴백은 렌더마다 새로 만들면 react-katex 안쪽 useMemo 가 매번 다시 돌아 KaTeX 를
  // 헛돌린다 — latex 에만 묶어 둔다.
  const renderError = useCallback(() => <RawLatex latex={latex} />, [latex]);
  return display
    ? <BlockMath math={source} renderError={renderError} />
    : <InlineMath math={source} renderError={renderError} />;
});

/**
 * 수식 한 조각.
 *
 * @param latex - LaTeX 원본(백슬래시가 둘로 와도 된다 — 여기서 되돌린다)
 * @param display - true 면 블록(`<div>`)으로. `<p>`·`<li>` 안에서는 주지 말 것.
 */
export const MathPiece = memo(function MathPiece({
  latex,
  display = false,
}: {
  latex: string;
  display?: boolean;
}) {
  return (
    <MathBoundary key={latex} fallback={<RawLatex latex={latex} />}>
      <Katex latex={latex} display={display} />
    </MathBoundary>
  );
});

/**
 * 수식이 섞인 글 — `$…$` · `$$…$$` 만 수식으로 그리고 나머지는 글자 그대로 둔다.
 * `<span>` 만 내므로 문단·목록·버튼 안 어디에나 놓을 수 있다.
 *
 * @param text - 본문
 */
export const MathText = memo(function MathText({ text }: { text: string }) {
  const segments = useMemo(() => splitMath(text), [text]);
  return (
    <>
      {segments.map((s, i) =>
        s.type === 'math'
          ? <MathPiece key={i} latex={s.value} />
          : <span key={i}>{s.value}</span>,
      )}
    </>
  );
});

/**
 * 필드 전체가 수식인 자리(개념 카드·풀이 단계의 `formula`) — 구분자 없이 통째로 블록 수식.
 * 긴 식이 카드를 밀지 않도록 가로로만 흐르게 둔다.
 *
 * @param latex - 필드에 담긴 LaTeX 전체
 * @param className - 자리마다 다른 글자 크기 등
 */
export function MathFormula({ latex, className }: { latex: string; className?: string }) {
  return (
    <div
      className={cn(
        'bg-pullim-slate-50 text-pullim-slate-700 overflow-x-auto rounded px-2 py-1 text-sm',
        className,
      )}
    >
      <MathPiece latex={latex} display />
    </div>
  );
}
