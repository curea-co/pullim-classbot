/**
 * `react-katex` 는 타입 선언을 싣지 않는다.
 *
 * 패키지 안에 `dist/react-katex.d.ts` 라는 이름이 있긴 하지만 **디렉터리**(jsdoc 이 뱉은 HTML
 * 묶음)라 `.d.ts` 로 해석되지 않고, `package.json` 에도 `types` 필드가 없다. strict TS 에서
 * `import { InlineMath } from 'react-katex'` 가 TS7016 으로 막히므로 실제 런타임 계약
 * (`src/index.jsx` 의 `MathComponentProps`)을 그대로 옮겨 적는다.
 *
 * 계약 요지: `math` 또는 `children` 중 하나로 LaTeX 문자열을 받고, `renderError` 를 주면
 * KaTeX 를 `throwOnError: true` 로 돌린 뒤 ParseError/TypeError 를 잡아 그 함수의 반환값을
 * 대신 그린다. `trust` 는 넘길 수 없다 — KaTeX 기본값 `false` 가 그대로 걸려 `\href` 같은
 * 출구가 닫힌 채로 남는다(이 파일이 그 기본을 푸는 통로가 되지 않게 프롭을 넓히지 않는다).
 */
declare module 'react-katex' {
  import type { ReactNode } from 'react';

  interface MathComponentProps {
    /** LaTeX 원본. 없으면 `children` 을 쓴다. */
    math?: string;
    children?: ReactNode;
    /** KaTeX 기본 에러 색(`#cc0000`) 대체. */
    errorColor?: string;
    /** 파싱 실패 시 대신 그릴 노드. 주면 KaTeX 가 throwOnError: true 로 돈다. */
    renderError?: (error: Error) => ReactNode;
  }

  /** `<span>` 안에 인라인 수식(displayMode: false). */
  export const InlineMath: (props: MathComponentProps) => ReactNode;
  /** `<div>` 안에 블록 수식(displayMode: true) — `<p>` 안에 넣지 말 것. */
  export const BlockMath: (props: MathComponentProps) => ReactNode;
}
