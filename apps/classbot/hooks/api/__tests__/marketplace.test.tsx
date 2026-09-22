/** pullim-api 정본 마켓 읽기 계약. */
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { id: 'sub-1' }, isReady: true }),
}));

const redirectToOsLogin = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: () => redirectToOsLogin(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import { useMarketplaceBot, useMarketplaceBots } from '../marketplace';

const BASE = `${API_BASE}/classbot`;
let queryClient: QueryClient;
let listStatus: number;
let detailStatus: number;
let calls: Array<{ url: string; init?: RequestInit }>;

const apiBot = {
  botId: 'official-math',
  name: '수학 마스터',
  avatarEmoji: null,
  subject: null,
  grade: null,
  tone: '자유 문자열',
  greeting: null,
  scope: 4,
  blurb: '개념부터 차근차근',
  teacherName: null,
  organization: null,
  publishedAt: '2026-09-20T00:00:00.000Z',
  enrolledCount: 0,
  isOfficial: true,
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  calls.push({ url, init });
  if (url === `${BASE}/marketplace/bots`) {
    return Promise.resolve(
      listStatus >= 400
        ? response(listStatus, { statusCode: listStatus, message: 'nope' })
        : response(200, { bots: [apiBot] }),
    );
  }
  if (url === `${BASE}/marketplace/bots/official-math`) {
    return Promise.resolve(
      detailStatus >= 400
        ? response(detailStatus, { statusCode: detailStatus, message: 'nope' })
        : response(200, { bot: apiBot }),
    );
  }
  return Promise.resolve(response(404, { statusCode: 404, message: 'not found' }));
}

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  calls = [];
  listStatus = 200;
  detailStatus = 200;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => queryClient.clear());

it('same-origin이 아닌 `/classbot/marketplace/bots`를 OS 쿠키 경계로 읽는다', async () => {
  const { result } = renderHook(() => useMarketplaceBots(), { wrapper: Wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(calls.map((call) => call.url)).toEqual([`${BASE}/marketplace/bots`]);
  expect(calls[0]?.init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
});

it('정본 nullable·자유 문자열 필드를 화면 계약으로 안전하게 좁힌다', async () => {
  const { result } = renderHook(() => useMarketplaceBots(), { wrapper: Wrapper });

  await waitFor(() => expect(result.current.data?.bots).toHaveLength(1));
  expect(result.current.data?.bots[0]).toMatchObject({
    avatarEmoji: '🤖',
    subject: '',
    grade: '',
    tone: '친근',
    greeting: '안녕! 무엇을 같이 볼까?',
    teacherName: '',
    organization: '',
  });
});

it('상세는 id를 인코딩한 정본 경로를 읽는다', async () => {
  const { result } = renderHook(() => useMarketplaceBot('official-math'), { wrapper: Wrapper });

  await waitFor(() => expect(result.current.data?.bot.name).toBe('수학 마스터'));
  expect(calls.map((call) => call.url)).toEqual([`${BASE}/marketplace/bots/official-math`]);
});

it('404 상세는 ApiError로 전달하고, 401은 OS 로그인으로 복귀시킨다', async () => {
  detailStatus = 404;
  const detail = renderHook(() => useMarketplaceBot('official-math'), { wrapper: Wrapper });
  await waitFor(() => expect(detail.result.current.isError).toBe(true));
  expect(detail.result.current.error?.status).toBe(404);
  detail.unmount();

  listStatus = 401;
  queryClient.clear();
  renderHook(() => useMarketplaceBots(), { wrapper: Wrapper });
  await waitFor(() => expect(redirectToOsLogin).toHaveBeenCalledTimes(1));
});
