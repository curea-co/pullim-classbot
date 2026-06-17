import { render, screen } from '@testing-library/react';
import { Flex, Stack, Grid } from '../index';

describe('Layout primitives', () => {
  it('Flex renders children', () => {
    render(<Flex><span>flex content</span></Flex>);
    expect(screen.getByText('flex content')).toBeInTheDocument();
  });

  it('Stack renders children', () => {
    render(<Stack><span>stack content</span></Stack>);
    expect(screen.getByText('stack content')).toBeInTheDocument();
  });

  it('Grid renders children', () => {
    render(<Grid><span>grid content</span></Grid>);
    expect(screen.getByText('grid content')).toBeInTheDocument();
  });

  it('Flex with gap={4} produces gap-4 class', () => {
    const { container } = render(<Flex gap={4}><span>x</span></Flex>);
    expect(container.firstChild).toHaveClass('gap-4');
  });

  it('Stack with gap={6} produces gap-6 class', () => {
    const { container } = render(<Stack gap={6}><span>x</span></Stack>);
    expect(container.firstChild).toHaveClass('gap-6');
  });

  it('Grid with gap={2} produces gap-2 and gap-x-2 classes', () => {
    const { container } = render(<Grid gap={2}><span>x</span></Grid>);
    expect(container.firstChild).toHaveClass('gap-2');
    expect(container.firstChild).toHaveClass('gap-x-2');
  });

  it('Grid with gapY={3} produces gap-y-3 class', () => {
    const { container } = render(<Grid gapY={3}><span>x</span></Grid>);
    expect(container.firstChild).toHaveClass('gap-y-3');
  });

  it('Grid with gap={4} and gapY={2} produces gap-y-2 and gap-x-4 classes', () => {
    const { container } = render(<Grid gap={4} gapY={2}><span>x</span></Grid>);
    expect(container.firstChild).toHaveClass('gap-y-2');
    expect(container.firstChild).toHaveClass('gap-x-4');
  });

  it('Flex applies flex class', () => {
    const { container } = render(<Flex><span>x</span></Flex>);
    expect(container.firstChild).toHaveClass('flex');
  });

  it('Grid applies grid class', () => {
    const { container } = render(<Grid><span>x</span></Grid>);
    expect(container.firstChild).toHaveClass('grid');
  });

  it('Flex with align="center" applies center alignment', () => {
    const { container } = render(<Flex align="center"><span>x</span></Flex>);
    expect(container.firstChild).toHaveStyle({ alignItems: 'center' });
  });

  it('Flex with direction="column" applies column direction', () => {
    const { container } = render(<Flex direction="column"><span>x</span></Flex>);
    expect(container.firstChild).toHaveStyle({ flexDirection: 'column' });
  });
});
