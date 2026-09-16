import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../empty-state';
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
