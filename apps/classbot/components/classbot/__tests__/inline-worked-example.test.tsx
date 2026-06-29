import { render, screen, fireEvent } from '@testing-library/react';
import { InlineWorkedExample } from '../inline-worked-example';
import { getBotLesson, type LessonStep } from '@/lib/mock/classbot-lesson';

const STEPS: LessonStep[] = [
  { num: 1, label: '시범', body: '내가 먼저 보여주는 단계.' },
  { num: 2, label: '직접1', body: '직접 채워봐.', fadable: true, reveal: '정답1' },
  { num: 3, label: '직접2', body: '직접 채워봐 2.', fadable: true, reveal: '정답2' },
];

describe('InlineWorkedExample', () => {
  it('reveals leading (non-fadable) step body immediately', () => {
    render(<InlineWorkedExample title="예제" steps={STEPS} />);
    expect(screen.getByText('내가 먼저 보여주는 단계.')).toBeInTheDocument();
  });

  it('keeps fadable steps hidden initially with a 정답 확인하기 button', () => {
    render(<InlineWorkedExample title="예제" steps={STEPS} />);
    expect(screen.queryByText('직접 채워봐.')).not.toBeInTheDocument();
    expect(screen.getByText('정답 확인하기')).toBeInTheDocument();
  });

  it('later fadable steps are disabled (앞 단계 먼저) until the nearest is revealed', () => {
    render(<InlineWorkedExample title="예제" steps={STEPS} />);
    const disabled = screen.getByRole('button', { name: '앞 단계 먼저' });
    expect(disabled).toBeDisabled();
  });

  it('reveals the next step (showing the reveal answer, not the prompt body), activates the following, and calls onReveal on click', () => {
    const onReveal = jest.fn();
    render(<InlineWorkedExample title="예제" steps={STEPS} onReveal={onReveal} />);
    fireEvent.click(screen.getByText('정답 확인하기'));
    expect(onReveal).toHaveBeenCalledTimes(1);
    // first fadable now shown — the reveal answer, NOT the prompt body
    expect(screen.getByText('정답1')).toBeInTheDocument();
    expect(screen.queryByText('직접 채워봐.')).not.toBeInTheDocument();
    // next fadable now active (a 정답 확인하기 still present), not 앞 단계 먼저
    expect(screen.getByText('정답 확인하기')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '앞 단계 먼저' })).not.toBeInTheDocument();
  });

  it('shows the completion line after revealing all fadable steps', () => {
    const onReveal = jest.fn();
    render(<InlineWorkedExample title="예제" steps={STEPS} onReveal={onReveal} />);
    fireEvent.click(screen.getByText('정답 확인하기'));
    fireEvent.click(screen.getByText('정답 확인하기'));
    expect(onReveal).toHaveBeenCalledTimes(2);
    expect(screen.getByText('🎯 스스로 끝까지 풀었어요 — 잘했어요!')).toBeInTheDocument();
    expect(screen.queryByText('정답 확인하기')).not.toBeInTheDocument();
  });

  it('with no fadable steps, renders all immediately and no completion line', () => {
    const plain: LessonStep[] = [
      { num: 1, label: 'a', body: 'aa' },
      { num: 2, label: 'b', body: 'bb' },
    ];
    render(<InlineWorkedExample steps={plain} />);
    expect(screen.getByText('aa')).toBeInTheDocument();
    expect(screen.getByText('bb')).toBeInTheDocument();
    expect(screen.queryByText('정답 확인하기')).not.toBeInTheDocument();
    expect(screen.queryByText('🎯 스스로 끝까지 풀었어요 — 잘했어요!')).not.toBeInTheDocument();
  });
});

// 레슨 데이터 무결성 — 모든 example.steps 가 ≥1 fadable + 그 단계에 reveal/body 존재.
describe('lesson data integrity — example fading', () => {
  const botIds = ['cb_001', 'cb_002', 'cb_003', 'cb_004', 'cb_005', '__fallback__'];
  it.each(botIds)('%s example has at least 1 fadable step with reveal/body', botId => {
    const lesson = getBotLesson(botId);
    const fadables = lesson.example.steps.filter(s => s.fadable);
    expect(fadables.length).toBeGreaterThanOrEqual(1);
    for (const s of fadables) {
      expect(typeof s.body).toBe('string');
      expect(s.body.length).toBeGreaterThan(0);
      expect(typeof s.reveal).toBe('string');
      expect((s.reveal ?? '').length).toBeGreaterThan(0);
    }
  });
});
