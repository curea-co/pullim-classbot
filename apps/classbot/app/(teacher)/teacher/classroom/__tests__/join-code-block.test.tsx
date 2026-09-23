/**
 * 참여 코드 상자 — **낸 코드가 그 자리에 서고, 수명이 제대로 읽히는지.**
 *
 * 정본 카드에는 코드가 없어 이 상자는 「새로 내기」나 이 세션이 아는 활성 코드(`initial` — 반 생성·봇 할당 응답)로만
 * 채워진다. 이 칸이 틀리면 교사가 없는 코드를 부르거나 죽은 코드를 학생에게 불러 준다. 재발급이 갈아 끼우기가 됐으므로
 * (pullim-api PR 2) 「새로 내면 지금 코드는 닫혀요」를 살아 있는 코드 옆에서만 말한다(`join-code-block.tsx` 머리주석).
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
const revokeMutate = jest.fn((_classId: string, handlers: { onSuccess: () => void }) => handlers.onSuccess());
jest.mock('@/hooks/api/classroom', () => ({
  useIssueJoinCode: () => ({ mutate, isPending: false }),
  useRevokeJoinCodes: () => ({ mutate: revokeMutate, isPending: false }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function issued(expiresAt: string | null = null, code = 'AB3K9M'): JoinCodeDto {
  return { id: 'jc_1', code, classId: 'cls_1', createdAt: '2026-09-16T00:00:00.000Z', expiresAt };
}

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const issueButton = () => screen.getByTestId('join-code-issue');

beforeEach(() => {
  outcome = { dto: issued() };
  mutate.mockClear();
  revokeMutate.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('JoinCodeBlock — 새로 내기', () => {
  it('처음에는 코드가 없고 안내 한 줄과 「참여 코드 새로 내기」만 있다 — 닫힌다는 말은 코드가 있을 때만', () => {
    render(<JoinCodeBlock classId="cls_1" />);

    expect(screen.getByTestId('join-code-hint')).toBeInTheDocument();
    expect(screen.queryByTestId('join-code')).toBeNull();
    expect(issueButton()).toHaveTextContent('참여 코드 새로 내기');
    expect(screen.queryByTestId('join-code-replace-note')).toBeNull();
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

  it('expiresAt 이 null 인 코드(안 닫히게 낸 것)에는 수명을 말하지 않는다', () => {
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.queryByTestId('join-code-life')).toBeNull();
    expect(screen.getByTestId('join-code')).not.toHaveClass('line-through');
  });

  it('만료(expiresAt)가 오면 언제까지 쓸 수 있는지, 그리고 새로 내면 지금 코드가 닫힌다고 말한다', () => {
    outcome = { dto: issued(hoursFromNow(5)) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('쓸 수 있어요');
    expect(screen.getByTestId('join-code-copy')).toBeInTheDocument();
    expect(screen.getByTestId('join-code-replace-note')).toHaveTextContent('새로 내면 지금 코드는 닫혀요.');
  });

  it('이미 닫힌 코드는 물리고 복사를 닫는다 — 지우지는 않는다 · 닫힌 코드가 또 닫힌다고는 안 한다', () => {
    outcome = { dto: issued(hoursFromNow(-1)) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.getByTestId('join-code-life')).toHaveTextContent('기간이 지나 닫혔어요');
    expect(screen.queryByTestId('join-code-copy')).toBeNull();
    expect(screen.getByTestId('join-code')).toHaveClass('line-through');
    expect(screen.getByTestId('join-code')).toHaveTextContent('AB3-K9M');
    expect(screen.queryByTestId('join-code-replace-note')).toBeNull();
  });

  it('남의 반(403)은 코드를 지어내지 않고 그 뜻을 말한다', () => {
    outcome = { error: new ApiError('forbidden', 403) };
    render(<JoinCodeBlock classId="cls_1" />);
    fireEvent.click(issueButton());

    expect(screen.queryByTestId('join-code')).toBeNull();
    expect(toastError).toHaveBeenCalledWith('이 반의 운영 교사만 코드를 낼 수 있어요.');
  });
});

describe('JoinCodeBlock — 이 세션이 아는 코드(initial)', () => {
  it('반 생성·봇 할당 응답의 활성 코드가 있으면 내지 않아도 그 코드로 선다', () => {
    render(<JoinCodeBlock classId="cls_1" initial={issued(hoursFromNow(40), 'ZZ9Q2R')} />);

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('join-code')).toHaveTextContent('ZZ9-Q2R');
    expect(screen.getByTestId('join-code-life')).toHaveTextContent('쓸 수 있어요');
    expect(screen.queryByTestId('join-code-hint')).toBeNull();
  });

  it('아는 코드가 뒤늦게 오면 그 코드로 바뀐다', () => {
    const { rerender } = render(<JoinCodeBlock classId="cls_1" initial={null} />);
    expect(screen.getByTestId('join-code-hint')).toBeInTheDocument();

    rerender(<JoinCodeBlock classId="cls_1" initial={issued(null, 'ZZ9Q2R')} />);
    expect(screen.getByTestId('join-code')).toHaveTextContent('ZZ9-Q2R');
  });

  it('재발급 성공 직후 initial보다 새 코드를 우선해 보여 준다', () => {
    outcome = { dto: issued(null, 'NEW123') };
    render(<JoinCodeBlock classId="cls_1" initial={issued(null, 'OLD123')} />);

    fireEvent.click(issueButton());
    fireEvent.click(screen.getByRole('button', { name: '새 코드 내기' }));

    expect(screen.getByTestId('join-code')).toHaveTextContent('NEW-123');
    expect(screen.getByTestId('join-code')).not.toHaveTextContent('OLD-123');
  });

  it('코드 닫기 성공 직후 initial을 다시 보여 주지 않는다', () => {
    render(<JoinCodeBlock classId="cls_1" initial={issued(null, 'OLD123')} />);

    fireEvent.click(screen.getByTestId('join-code-revoke'));
    fireEvent.click(screen.getByRole('button', { name: '코드 닫기' }));

    expect(revokeMutate).toHaveBeenCalledWith('cls_1', expect.any(Object));
    expect(screen.queryByTestId('join-code')).toBeNull();
    expect(screen.getByTestId('join-code-hint')).toBeInTheDocument();
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
