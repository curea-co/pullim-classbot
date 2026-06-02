import { useMutation } from '@tanstack/react-query';
import { checkEmail } from '@pullim-classbot/api-client/auth-api';
import type { CheckEmailResponse } from '@pullim-classbot/types';

/** 이메일 중복 확인 mutation. 회원가입 폼에서 사용. */
export function useCheckEmail() {
  return useMutation<CheckEmailResponse, Error, string>({
    mutationFn: (email) => checkEmail(email),
  });
}
