import { render, screen, fireEvent } from '@testing-library/react';
import { ContextAnchor } from '../context-anchor';
import type { LessonConcept } from '@/lib/mock/classbot-lesson';

const concept: LessonConcept = {
  id: 'c2',
  title: '극값 판정',
  summary: '부호 변화로 극대/극소를 판정',
  detail: '...',
  tips: [],
  coreElements: [],
  sampleQuestions: [],
};

it('renders null when concept is undefined', () => {
  const { container } = render(
    <ContextAnchor concept={undefined} botSigHex="#3B82F6" onJump={() => {}} />,
  );
  expect(container.firstChild).toBeNull();
});

it('renders eyebrow, title, CTA and an aria-label with the concept title', () => {
  render(<ContextAnchor concept={concept} botSigHex="#3B82F6" onJump={() => {}} />);
  expect(screen.getByText('지금 보는 개념')).toBeInTheDocument();
  expect(screen.getByText('극값 판정')).toBeInTheDocument();
  expect(screen.getByText('이 개념으로 ↑')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '지금 보는 개념: 극값 판정 — 다시 보기' }),
  ).toBeInTheDocument();
});

it('calls onJump exactly once on click', () => {
  const onJump = jest.fn();
  render(<ContextAnchor concept={concept} botSigHex="#3B82F6" onJump={onJump} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onJump).toHaveBeenCalledTimes(1);
});

it('exposes data-slot and does NOT use a sticky class (lives in non-scroll layer)', () => {
  render(<ContextAnchor concept={concept} botSigHex="#3B82F6" onJump={() => {}} />);
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('data-slot', 'context-anchor');
  expect(btn.className).not.toMatch(/sticky/);
});
