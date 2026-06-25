import { render, screen, fireEvent } from '@testing-library/react';
import { ExamSheet } from '../exam-sheet';
import type { ExamQuestion } from '@/lib/mock/classbot-replay-exam';

const Q: ExamQuestion = {
  subjectLabel: '영어 · 빈칸 추론',
  stem: '빈칸에 들어갈 말로 적절한 것은?',
  passage: { paragraphs: ['첫 문단입니다.', '둘째 문단입니다.'] },
  options: ['cheaper', 'faster', 'more frequent', 'more meaningful', 'more public'],
  answerIndex: 3,
  explanation: '대조 구조이므로 ‘의미 있는’이 정답.',
};

it('renders the passage paragraphs and options', () => {
  render(<ExamSheet question={Q} onResult={() => {}} />);
  expect(screen.getByText('첫 문단입니다.')).toBeTruthy();
  expect(screen.getByText('more meaningful')).toBeTruthy();
});

it('calls onResult(true) and reveals explanation when the correct option is submitted', () => {
  const onResult = jest.fn();
  render(<ExamSheet question={Q} onResult={onResult} />);
  fireEvent.click(screen.getByText('more meaningful'));
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(onResult).toHaveBeenCalledWith(true);
  expect(screen.getByText(/대조 구조/)).toBeTruthy();
});

it('calls onResult(false) for a wrong option', () => {
  const onResult = jest.fn();
  render(<ExamSheet question={Q} onResult={onResult} />);
  fireEvent.click(screen.getByText('faster'));
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(onResult).toHaveBeenCalledWith(false);
});

it('does not submit without a selection', () => {
  const onResult = jest.fn();
  render(<ExamSheet question={Q} onResult={onResult} />);
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(onResult).not.toHaveBeenCalled();
});
