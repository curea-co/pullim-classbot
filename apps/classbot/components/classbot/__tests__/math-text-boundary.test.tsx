/**
 * KaTeX 가 **ParseError 가 아닌** 예외를 던질 때도 대화 화면이 죽지 않는지 본다.
 *
 * react-katex 의 `renderError` 는 ParseError/TypeError 만 잡고 나머지는 다시 던진다
 * (`src/index.jsx`). 그 자리를 받는 것이 `math-text.tsx` 의 에러 경계다. 실제로 그런 예외를
 * 내는 LaTeX 는 재현이 들쭉날쭉해서, 여기서는 KaTeX 자리를 대신 세워 던지게 한다 —
 * 경계가 **실제로 걸려 있는지**를 묻는 검사다(경계를 지우면 이 파일이 빨개진다).
 */
import { render } from '@testing-library/react';

jest.mock('react-katex', () => ({
  InlineMath: () => {
    throw new RangeError('Maximum call stack size exceeded');
  },
  BlockMath: () => {
    throw new RangeError('Maximum call stack size exceeded');
  },
}));

// 위 jest.mock 보다 뒤에 적는다 — 호이스팅으로 mock 이 먼저 걸리지만 읽는 순서를 맞춰 둔다.
import { MathText } from '../math-text';

describe('MathText 에러 경계', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // React 는 경계가 잡은 예외도 콘솔에 남긴다 — 테스트 출력만 조용히 한다.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('KaTeX 가 ParseError 밖의 예외를 던져도 원문을 보여주고 둘레 글자를 지킨다', () => {
    const { container } = render(<MathText text="앞 $x^2$ 뒤" />);
    expect(container.textContent).toBe('앞 x^2 뒤');
  });
});
