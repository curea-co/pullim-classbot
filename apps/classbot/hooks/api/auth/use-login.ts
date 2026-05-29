import { useMutation } from '@tanstack/react-query';
import { login } from '@pullim-classbot/api-client/auth-api';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';
import type { LoginRequest, TokenResponse } from '@pullim-classbot/types';

/**
 * 이메일 로그인 mutation. 성공 시 토큰을 저장한다.
 * 세션 사용자(role) 갱신은 호출부에서 authContext.refreshSession() 으로 수행.
 */
export function useLogin() {
  return useMutation<TokenResponse, Error, LoginRequest>({
    mutationFn: (data) => login(data),
    onSuccess: (tokens) => {
      tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    },
  });
}
