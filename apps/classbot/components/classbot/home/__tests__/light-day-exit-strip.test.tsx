import { render, screen, fireEvent } from '@testing-library/react';
import { LightDayExitStrip } from '../light-day-exit-strip';

// Light Day 안전망 — TodoPanel/오늘의 한 가지가 없는 화면(클래스 0·튜터 0)에서도
// 같은 날 [평소대로 보기]로 해제할 수 있어야 한다 (Codex #182 R3, spec §3/§8 원복 계약).
it('가벼운 모드 안내 + [평소대로 보기]로 해제한다', () => {
  const onExit = jest.fn();
  render(<LightDayExitStrip onExit={onExit} />);
  expect(screen.getByText(/가볍게 가는 중/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '평소대로 보기' }));
  expect(onExit).toHaveBeenCalled();
});
