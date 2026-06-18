import { render, screen } from '@testing-library/react';
import { ContextRail } from '../context-rail';

describe('ContextRail', () => {
  it('renders children in the primary column (single-column when no rail)', () => {
    const { container } = render(
      <ContextRail>
        <p>main content</p>
      </ContextRail>
    );
    expect(screen.getByText('main content')).toBeInTheDocument();
    // No aside when no rail
    expect(container.querySelector('aside')).toBeNull();
  });

  it('renders aside with rail content when rail prop is provided', () => {
    render(
      <ContextRail rail={<p>rail content</p>}>
        <p>main content</p>
      </ContextRail>
    );
    expect(screen.getByText('main content')).toBeInTheDocument();
    const aside = screen.getByRole('complementary');
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveTextContent('rail content');
  });

  it('applies railWidth sm (280px) to the grid template', () => {
    const { container } = render(
      <ContextRail rail={<p>rail</p>} railWidth="sm">
        <p>main</p>
      </ContextRail>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('lg:grid-cols-[1fr_280px]');
  });

  it('applies railWidth md (320px) by default when rail is provided', () => {
    const { container } = render(
      <ContextRail rail={<p>rail</p>}>
        <p>main</p>
      </ContextRail>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('lg:grid-cols-[1fr_320px]');
  });

  it('applies railWidth lg (360px) to the grid template', () => {
    const { container } = render(
      <ContextRail rail={<p>rail</p>} railWidth="lg">
        <p>main</p>
      </ContextRail>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('lg:grid-cols-[1fr_360px]');
  });

  it('applies stickyRail classes to aside when stickyRail is true', () => {
    render(
      <ContextRail rail={<p>rail</p>} stickyRail>
        <p>main</p>
      </ContextRail>
    );
    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('lg:sticky');
    expect(aside.className).toContain('lg:top-20');
  });

  it('applies railGap to aside space-y class', () => {
    render(
      <ContextRail rail={<p>rail</p>} railGap={2}>
        <p>main</p>
      </ContextRail>
    );
    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('space-y-2');
  });

  it('applies default railGap (4) when not specified', () => {
    render(
      <ContextRail rail={<p>rail</p>}>
        <p>main</p>
      </ContextRail>
    );
    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('space-y-4');
  });

  it('passes className to the outer wrapper', () => {
    const { container } = render(
      <ContextRail className="custom-class">
        <p>main</p>
      </ContextRail>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('primary column always has min-w-0 and space-y-4', () => {
    const { container } = render(
      <ContextRail rail={<p>rail</p>}>
        <p>main</p>
      </ContextRail>
    );
    // The primary column div (first child of wrapper)
    const wrapper = container.firstChild as HTMLElement;
    const primaryCol = wrapper.firstElementChild as HTMLElement;
    expect(primaryCol.className).toContain('min-w-0');
    expect(primaryCol.className).toContain('space-y-4');
  });
});
