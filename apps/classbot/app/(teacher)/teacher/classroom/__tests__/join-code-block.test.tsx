/**
 * 참여 코드 상자 — **수명이 화면에 제대로 서는지.**
 *
 * 이 칸이 틀리면 교사가 죽은 코드를 학생에게 불러 준다. 서버는 이미 그 코드를 410 으로
 * 거절하는데 화면만 아직 모르는 상태가 제일 나쁘다 — 학생은 못 들어오고 교사는 이유를 모른다.
 */

import { render, screen } from '@testing-library/react';
import { JoinCodeBlock } from '../join-code-block';

jest.mock('@/hooks/api/classroom', () => ({
  useIssueJoinCode: () => ({ mutate: jest.fn(), isPending: false }),
}));

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe('JoinCodeBlock — 수명', () => {
  it('살아 있는 코드는 언제까지 쓸 수 있는지 말하고 복사를 연다', () => {
    render(<JoinCodeBlock classroomId="cr_1" code="ABC123" expiresAt={hoursFromNow(5)} />);

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('쓸 수 있어요');
    expect(screen.getByTestId('join-code-copy')).toBeInTheDocument();
    expect(screen.getByTestId('join-code')).not.toHaveClass('line-through');
  });

  it('닫힌 코드는 물리고 복사를 닫는다 — 지우지는 않는다', () => {
    /*
      지우면 교사가 「내가 뭘 나눠 줬더라」를 잃고, 그대로 두면 아직 쓸 수 있는 것처럼 보인다.
      그래서 회색 + 취소선이고, 복사 버튼만 사라진다(넣어도 안 열리는 코드라서).
    */
    render(<JoinCodeBlock classroomId="cr_1" code="ABC123" expiresAt={hoursFromNow(-1)} />);

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('기간이 지나 닫혔어요');
    expect(screen.queryByTestId('join-code-copy')).toBeNull();
    expect(screen.getByTestId('join-code')).toHaveClass('line-through');
    // 코드는 여전히 읽힌다.
    expect(screen.getByTestId('join-code')).toHaveTextContent('ABC-123');
  });

  it('닫힐 시각이 없는 옛 코드에는 아무 말도 붙이지 않는다', () => {
    // 「계속 열려 있어요」라고 적으면 그게 정상 상태로 읽히는데, 사실은 만료가 생기기 전에
    // 나간 행이라 곧 사라질 상태다.
    render(<JoinCodeBlock classroomId="cr_1" code="ABC123" expiresAt={null} />);

    expect(screen.queryByTestId('join-code-life')).toBeNull();
    expect(screen.getByTestId('join-code-copy')).toBeInTheDocument();
  });

  it('코드가 아직 없으면 수명도 말하지 않는다', () => {
    render(<JoinCodeBlock classroomId="cr_1" code={null} expiresAt={null} />);

    expect(screen.queryByTestId('join-code-life')).toBeNull();
    expect(screen.getByText(/아직 코드가 없어요/)).toBeInTheDocument();
  });
});
