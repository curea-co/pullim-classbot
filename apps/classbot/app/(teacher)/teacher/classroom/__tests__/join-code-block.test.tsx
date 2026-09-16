/**
 * 참여 코드 상자 — **낸 코드가 그 자리에 서고, 수명이 제대로 읽히는지.**
 *
 * 정본 카드에는 코드가 없어 이 상자는 「새로 내기」로만 채워진다. 이 칸이 틀리면 교사가 없는 코드를 부르거나
 * 죽은 코드를 학생에게 불러 준다. 옛 코드가 죽는다는 말은 **하지 않는다** — 정본이 그렇게 하지 않기 때문이다
 * (`join-code-block.tsx` 머리주석 · 완성 설계 § 5 R1).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { JoinCodeDto } from '@/lib/api/classbot-dto';
import { JoinCodeBlock, issueFailureMessage } from '../join-code-block';

type Handlers = { onSuccess: (dto: JoinCodeDto) => void; onError: (e: unknown) => void };
/** 다음 `mutate` 가 무엇으로 끝나는지 — 테스트가 갈아 끼운다. */
let outcome: { dto: JoinCodeDto } | { error: unknown } = { dto: issued() };
const mutate = jest.fn((_vars: { classId: string }, handlers: Handlers) => {
  if ('dto' in outcome) handlers.onSuccess(outcome.dto);
  else handlers.onError(outcome.error);
});
jest.mock('@/hooks/api/classroom', () => ({
  useIssueJoinCode: () => ({ mutate, isPending: false }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function issued(expiresAt?: string | null): JoinCodeDto {
  return {
    id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '2026-09-16T00:00:00.000Z',
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const issueButton = () => screen.getByTestId('join-code-issue');

beforeEach(() => {
  outcome = { dto: issued() };
  mutate.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('JoinCodeBlock — 새로 내기', () => {
  it('처음에는 코드가 없고 안내 한 줄과 「참여 코드 새로 내기」만 있다 — 옛 코드의 운명은 말하지 않는다', () => {
    render(<JoinCodeBlock classId="cls_1" />);

    expect(screen.getByTestId('join-code-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('join-code')).toBeNull();
    expect(issueButton()).toHaveTextContent('참여 코드 새로 내기');
    expect(screen.queryByText(/못 써요/)).toBeNull();
  });

  it('누르면 그 반 id 로 내고, 돌아온 코드를 하이픈 표기로 크게 보이며 복사를 연다', () => {
    render(<JoinCodeBlock classId="cls_1" />);

    fireEvent.click(issueButton());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ classId: 'cls_1' });
    expect(screen.getByTestId('join-code')).toHaveTextContent('AB3-K9M');
    expect(screen.getByTestId('join-code-copy')).toBeInTheDocument();
    expect(screen.queryByTestId('join-code-hint')).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith('새 참여 코드를 냈어요', { description: 'AB3-K9M' });
  });

  it('정본이 만료를 보내지 않는 지금은 수명을 말하지 않는다', () => {
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.queryByTestId('join-code-life')).toBeNull();
    expect(screen.getByTestId('join-code')).not.toHaveClass('line-through');
  });

  it('만료(expiresAt)가 오면 언제까지 쓸 수 있는지 말한다', () => {
    outcome = { dto: issued(hoursFromNow(5)) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('쓸 수 있어요');
    expect(screen.getByTestId('join-code-copy')).toBeInTheDocument();
  });

  it('이미 닫힌 코드는 물리고 복사를 닫는다 — 지우지는 않는다', () => {
    outcome = { dto: issued(hoursFromNow(-1)) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('기간이 지나 닫혔어요');
    expect(screen.queryByTestId('join-code-copy')).toBeNull();
    expect(screen.getByTestId('join-code')).toHaveClass('line-through');
    expect(screen.getByTestId('join-code')).toHaveTextContent('AB3-K9M');
  });

  it('남의 반(403)은 코드를 지어내지 않고 그 뜻을 말한다', () => {
    outcome = { error: new ApiError('forbidden', 403) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.queryByTestId('join-code')).toBeNull();
    expect(toastError).toHaveBeenCalledWith('이 반의 운영 교사만 코드를 낼 수 있어요.');
  });
});

describe('issueFailureMessage', () => {
  it.each([
    [401, '로그인이 필요해요.'],
    [403, '이 반의 운영 교사만 코드를 낼 수 있어요.'],
    [404, '반을 찾을 수 없어요.'],
    [500, '코드를 내지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('%s → %s', (status, message) => {
    expect(issueFailureMessage(new ApiError('x', status))).toBe(message);
  });

  it('ApiError 가 아니면(네트워크) 일반 실패', () => {
    expect(issueFailureMessage(new Error('offline'))).toBe('코드를 내지 못했어요. 잠시 후 다시 시도해 주세요.');
  });
});
