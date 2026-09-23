/** same-origin 개발 신원과 pullim-api OS 세션의 인증 경계를 섞지 않는다. */
import { renderHook } from '@testing-library/react';

let authState: { user: { id: string } | null; isReady: boolean } = {
  user: null,
  isReady: false,
};
let devIdentityId = '';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => authState,
}));
jest.mock('@/lib/use-dev-identity', () => ({
  useDevIdentityId: () => devIdentityId,
}));

import {
  useClassbotDomainIdentityState,
  useServerIdentityState,
} from '../self-server';

beforeEach(() => {
  authState = { user: null, isReady: false };
  devIdentityId = '';
});

it('OS 세션이 복원되면 두 판정 모두 server다', () => {
  authState = { user: { id: 'os-sub' }, isReady: true };

  expect(renderHook(() => useServerIdentityState()).result.current).toBe('server');
  expect(renderHook(() => useClassbotDomainIdentityState()).result.current).toBe('server');
});

it('개발 신원 쿠키만 있으면 same-origin은 server지만 classbot domain은 demo다', () => {
  authState = { user: null, isReady: true };
  devIdentityId = 'dev-student';

  expect(renderHook(() => useServerIdentityState()).result.current).toBe('server');
  expect(renderHook(() => useClassbotDomainIdentityState()).result.current).toBe('demo');
});

it('OS 세션 복원 전에는 개발 신원과 무관하게 domain 판정이 pending이다', () => {
  authState = { user: null, isReady: false };
  devIdentityId = 'dev-student';

  expect(renderHook(() => useServerIdentityState()).result.current).toBe('server');
  expect(renderHook(() => useClassbotDomainIdentityState()).result.current).toBe('pending');
});

it('복원이 끝나고 어떤 신원도 없으면 둘 다 demo다', () => {
  authState = { user: null, isReady: true };

  expect(renderHook(() => useServerIdentityState()).result.current).toBe('demo');
  expect(renderHook(() => useClassbotDomainIdentityState()).result.current).toBe('demo');
});
