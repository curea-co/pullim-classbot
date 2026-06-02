import { useMutation } from '@tanstack/react-query';
import { signup } from '@pullim-classbot/api-client/auth-api';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';
import type { SignupRequest, SignupResponse } from '@pullim-classbot/types';

/**
 * 이메일 회원가입 mutation. 성공 시 토큰을 저장한다(가입 즉시 로그인 상태).
 * 세션 사용자(role) 갱신은 호출부에서 authContext.refreshSession() 으로 수행.
 */
export function useSignup() {
  return useMutation<SignupResponse, Error, SignupRequest>({
    mutationFn: (data) => signup(data),
    onSuccess: (result) => {
      tokenManager.setTokens(result.accessToken, result.refreshToken);
    },
  });
}
