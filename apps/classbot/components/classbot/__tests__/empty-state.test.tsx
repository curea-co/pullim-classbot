import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { CenteredState, EmptyState } from '../empty-state';
it('renders neutral state with icon, title, description', () => {
  render(<EmptyState icon={Inbox} title="없어요" description="곧 표시돼요" />);
  expect(screen.getByText('없어요')).toBeInTheDocument();
  expect(screen.getByText('곧 표시돼요')).toBeInTheDocument();
});
it('href action renders a link, onClick action renders a button', () => {
  const { rerender } = render(<EmptyState title="t" action={{ href: '/x', label: '가기' }} />);
  expect(screen.getByRole('link', { name: '가기' })).toHaveAttribute('href', '/x');
  rerender(<EmptyState title="t" tone="danger" action={{ onClick: () => {}, label: '재시도' }} />);
  expect(screen.getByRole('button', { name: '재시도' })).toBeInTheDocument();
});

/**
 * 보이는 글자는 단어로 줄이되, 줄이며 잃은 뜻은 낭독기 이름에 남는다
 * ([07 § 6.6.2(3)](../../../../../proc/spec/07-branding.md)).
 * 이 계약이 없으면 빈 상태의 나가는 길만 「받은 과제」로 읽혀 어디로 가는지 알 수 없다.
 */
it('ariaLabel 을 주면 보이는 글자는 그대로 두고 낭독기 이름만 길어진다', () => {
  const { rerender } = render(
    <EmptyState title="t" action={{ href: '/x', label: '받은 과제', ariaLabel: '받은 과제로 가기' }} />,
  );
  expect(screen.getByRole('link', { name: '받은 과제로 가기' })).toHaveTextContent('받은 과제');

  rerender(
    <EmptyState title="t" action={{ onClick: () => {}, label: '전체', ariaLabel: '전체 보기' }} />,
  );
  expect(screen.getByRole('button', { name: '전체 보기' })).toHaveTextContent('전체');
});

/**
 * `CenteredState` — 세로만 가운데, 가로는 꽉.
 *
 * 이 계약이 깨지면 화면이 고장 나지 않고 **조용히 좁아진다**. 봇 대화·학습 기록이 실제로
 * 그랬고, 눈으로 볼 때까지 아무도 몰랐다. jsdom 은 폭을 재지 못하므로 폭 자체가 아니라
 * **폭을 정하는 두 가지**를 붙든다 — 안쪽이 `w-full` 일 것, 그리고 바깥에 가로 가운데
 * 정렬(`justify-center`)이 없을 것. 둘 중 하나만 풀려도 상자는 글자 폭으로 줄어든다.
 */
it('CenteredState — 안쪽은 w-full 이고 가로 가운데 정렬은 없다', () => {
  const { container } = render(
    <CenteredState>
      <EmptyState title="없어요" />
    </CenteredState>,
  );

  const outer = container.firstElementChild as HTMLElement;
  const inner = outer.firstElementChild as HTMLElement;

  expect(outer.className).toContain('items-center');
  expect(outer.className).not.toContain('justify-center');
  expect(inner.className).toContain('w-full');
  expect(inner.querySelector('section')).toBeInTheDocument();
});
