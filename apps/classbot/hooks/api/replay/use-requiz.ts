import { useMutation } from '@tanstack/react-query';
import { authRequest } from '@pullim-classbot/api-client';
import type { ReplayRequizResponse } from '@pullim-classbot/types';

/** 재응시 BE 호출 — 테스트 가능한 단위 함수. */
export async function requizRequest(replayId: string): Promise<ReplayRequizResponse> {
  return authRequest<ReplayRequizResponse>(`/replay/${replayId}/requiz`, { method: 'POST' });
}

/** 재응시 mutation 훅 — requizRequest 를 TanStack Query useMutation 으로 래핑. */
export function useRequiz(replayId: string) {
  return useMutation<ReplayRequizResponse, Error, void>({
    mutationFn: () => requizRequest(replayId),
  });
}
