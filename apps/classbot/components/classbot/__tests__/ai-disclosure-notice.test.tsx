import { render, screen } from '@testing-library/react';

import { AiDisclosureNotice } from '../ai-disclosure-notice';

// AI 검증 고지(출시 필수 — 핸드오프 §13.2): 봇 답변이 AI 생성물이며 검증이 필요함을 상시 고지.
// 실챗(flag-ON)·mock(flag-OFF) 공통 — 봇/플래그와 무관하게 항상 렌더.
describe('AiDisclosureNotice — AI 생성 답변 검증 고지', () => {
  it('AI 생성·자기 검증 고지 문구를 한 요소에 렌더한다', () => {
    render(<AiDisclosureNotice />);
    const notice = screen.getByText(/AI가 만들어요.*스스로 확인/);
    expect(notice).toBeInTheDocument();
  });

  it('a11y — note role 로 노출한다(경고 아님·정보성)', () => {
    render(<AiDisclosureNotice />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('장식 이모지는 aria-hidden 으로 스크린리더에서 숨긴다', () => {
    const { container } = render(<AiDisclosureNotice />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
