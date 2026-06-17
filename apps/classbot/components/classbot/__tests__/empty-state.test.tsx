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
