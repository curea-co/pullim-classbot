import { render } from '@testing-library/react';
import { Slider } from '../slider';

/**
 * Base UI `Slider.Thumb` 은 `<div>` 를 렌더하고 네이티브 `disabled` 속성은
 * 안쪽 숨은 `<input type="range">` 에만 붙는다. 그래서 thumb 에 건 `disabled:`
 * variant 는 **유효한 CSS 인 채로 아무것도 매치하지 않는다** — 타입도, 렌더
 * 테스트도, 콘솔도 아무 말을 하지 않고 흐림만 조용히 사라진다.
 *
 * 아래 두 케이스가 그 짝을 못박는다: thumb 이 겨냥하는 접두사와, thumb 에
 * 실제로 붙는 속성이 같은 것을 가리키는가.
 */
function thumbOf(container: HTMLElement) {
  const el = container.querySelector('[data-index="0"]');
  if (!(el instanceof HTMLElement)) throw new Error('thumb 을 찾지 못했다');
  return el;
}

it('비활성 thumb 은 네이티브 disabled 가 아니라 data-disabled 를 갖는다', () => {
  const { container } = render(<Slider defaultValue={30} disabled />);
  const thumb = thumbOf(container);

  expect(thumb.tagName).toBe('DIV');
  expect(thumb).toHaveAttribute('data-disabled');
  // 네이티브 속성은 thumb 이 아니라 안쪽 input 에 있다 → `disabled:` 는 못 쓴다
  expect(thumb.hasAttribute('disabled')).toBe(false);
  expect(thumb.querySelector('input')).toBeDisabled();
});

it('thumb 의 흐림·포인터 차단은 data-disabled: 접두사로 겨냥한다', () => {
  const { container } = render(<Slider defaultValue={30} disabled />);
  const classes = thumbOf(container).className.split(/\s+/);

  expect(classes).toContain('data-disabled:opacity-50');
  expect(classes).toContain('data-disabled:pointer-events-none');
  // `disabled:` 로 되돌아가면 여기서 잡힌다
  expect(classes.filter((c) => c.startsWith('disabled:'))).toEqual([]);
});

it('활성 thumb 에는 data-disabled 가 없다', () => {
  const { container } = render(<Slider defaultValue={30} />);
  expect(thumbOf(container)).not.toHaveAttribute('data-disabled');
});
