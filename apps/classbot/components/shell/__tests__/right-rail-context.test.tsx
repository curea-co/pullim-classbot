import { render, screen } from '@testing-library/react';
import { RightRailProvider, RightRailAside, useSetRightRail } from '../right-rail-context';

function RailSetter({ label }: { label: string }) {
  useSetRightRail(<div>{label}</div>);
  return <p>page</p>;
}

describe('right-rail context', () => {
  it('aside is empty (renders nothing) when no page sets rail content', () => {
    const { container } = render(
      <RightRailProvider><RightRailAside /><p>main</p></RightRailProvider>
    );
    expect(container.querySelector('aside')).toBeNull();
  });
  it('aside renders the node a page registers via useSetRightRail', () => {
    render(
      <RightRailProvider>
        <RailSetter label="rail-x" />
        <RightRailAside />
      </RightRailProvider>
    );
    expect(screen.getByText('rail-x')).toBeInTheDocument();
    expect(screen.getByText('page')).toBeInTheDocument();
  });
});
