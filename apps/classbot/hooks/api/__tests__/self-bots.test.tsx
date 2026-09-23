/** ADR-094 자기주도 API 계약과 로컬 임시 study-days 회귀. */
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { BotCardDto } from '@/lib/api/classbot-dto';
import { useSelfLearningStore } from '@/lib/store/self-learning';

let cards: BotCardDto[] | undefined = [];
let pending = false;
let queryError = false;
let domainIdentity: 'pending' | 'server' | 'demo' = 'server';
let sameOriginIdentity: 'pending' | 'server' | 'demo' = 'server';

jest.mock('@/hooks/api/classroom', () => ({
  classroomKeys: { myClassrooms: ['my-classrooms'] as const },
  useMyClassrooms: () => ({ data: cards, isPending: pending, isError: queryError }),
}));
jest.mock('@/hooks/api/self-server', () => ({
  useClassbotDomainIdentityState: () => domainIdentity,
  useServerIdentityState: () => sameOriginIdentity,
}));
jest.mock('@/lib/current-user', () => ({ useCurrentUserId: () => 'student-1' }));
jest.mock('@/lib/store/use-hydrated', () => ({ useStoresHydrated: () => true }));

const classbotWrite = jest.fn();
jest.mock('@/lib/api/classbot-client', () => ({
  classbotWrite: (...args: unknown[]) => classbotWrite(...args),
}));

import {
  useAddSelfBot,
  useMySelfBots,
  useRecordSelfStudyDay,
  useRemoveSelfBot,
  useSelfStudyDays,
} from '../self-bots';

function card(overrides: Partial<BotCardDto>): BotCardDto {
  return {
    id: 'class-1',
    botId: 'bot-1',
    name: '수학 봇',
    className: '수학 봇 자습방',
    description: null,
    isActive: true,
    role: 'student',
    profile: null,
    ...overrides,
  };
}

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  cards = [];
  pending = false;
  queryError = false;
  domainIdentity = 'server';
  sameOriginIdentity = 'server';
  classbotWrite.mockReset();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useSelfLearningStore.setState({ byUser: {}, botsMigratedUserIds: [], studyDaysBackfilledUserIds: [] });
});

it('별도 self-bots GET 없이 학생 카드의 isSelfStudy만 목록으로 돌려준다', () => {
  cards = [
    card({ id: 'regular-class', botId: 'regular-bot', isSelfStudy: false }),
    card({ id: 'self-class', botId: 'official-bot', isSelfStudy: true }),
  ];
  const { result } = renderHook(() => useMySelfBots(), { wrapper: Wrapper });

  expect(result.current.data).toEqual([
    { botId: 'official-bot', classId: 'self-class', addedAt: '' },
  ]);
  expect(classbotWrite).not.toHaveBeenCalled();
});

it('담기는 정본 POST 후 학생 카드 목록을 무효화한다', async () => {
  classbotWrite.mockResolvedValue({ status: 201, body: { id: 'self-class' } });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useAddSelfBot(), { wrapper: Wrapper });

  act(() => result.current.mutate('official-bot'));
  await waitFor(() => expect(classbotWrite).toHaveBeenCalledWith('/me/self-bots', { botId: 'official-bot' }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['my-classrooms'] }));
});

it('빼기는 정본 DELETE를 호출하며 204 빈 본문을 정상 처리한다', async () => {
  classbotWrite.mockResolvedValue({ status: 204, body: null });
  const { result } = renderHook(() => useRemoveSelfBot(), { wrapper: Wrapper });

  act(() => result.current.mutate('official/bot'));
  await waitFor(() =>
    expect(classbotWrite).toHaveBeenCalledWith(
      '/me/self-bots/official%2Fbot',
      undefined,
      'DELETE',
    ),
  );
});

it('개발 신원만 있고 OS 세션이 없으면 domain 쓰기를 호출하지 않고 로컬 데모로 남는다', () => {
  domainIdentity = 'demo';
  // same-origin 소비라면 이 상태를 server로 볼 수 있지만 self-bots는 domain 판정을 쓴다.
  sameOriginIdentity = 'server';
  const { result } = renderHook(() => useAddSelfBot(), { wrapper: Wrapper });

  act(() => result.current.mutate('official-bot'));

  expect(classbotWrite).not.toHaveBeenCalled();
  expect(useSelfLearningStore.getState().byUser['student-1'].bots).toEqual([
    expect.objectContaining({ botId: 'official-bot' }),
  ]);
});

it('OS 로그인 상태에서도 study-days는 로컬만 읽고 쓴다', () => {
  useSelfLearningStore.getState().recordStudyDay('student-1', '2026-09-20');
  const read = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
  const write = renderHook(() => useRecordSelfStudyDay(), { wrapper: Wrapper });

  expect(read.result.current.data).toEqual(['2026-09-20']);
  act(() => write.result.current.mutate('2026-09-21'));
  expect(useSelfLearningStore.getState().byUser['student-1'].studyDays).toEqual([
    '2026-09-20',
    '2026-09-21',
  ]);
  expect(classbotWrite).not.toHaveBeenCalled();
});

it('신원 복원 전에는 다른 로컬 통을 노출하거나 기록하지 않는다', () => {
  sameOriginIdentity = 'pending';
  useSelfLearningStore.getState().recordStudyDay('student-1', '2026-09-20');
  const read = renderHook(() => useSelfStudyDays(), { wrapper: Wrapper });
  const write = renderHook(() => useRecordSelfStudyDay(), { wrapper: Wrapper });

  expect(read.result.current.data).toEqual([]);
  act(() => write.result.current.mutate('2026-09-21'));
  expect(useSelfLearningStore.getState().byUser['student-1'].studyDays).toEqual(['2026-09-20']);
});
