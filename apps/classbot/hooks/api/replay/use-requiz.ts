import { useMutation } from '@tanstack/react-query';
import type { ReplayRequizResponse } from '@pullim-classbot/types';

import { API_BASE, fetchOsCsrfToken } from '@/lib/auth/os-sso';

/**
 * 리플레이 재응시(requiz) — pullim-api 정본 라우트를 OS 쿠키 세션으로 친다.
 *
 * 경로: `POST ${API_BASE}/classbot/replay/:id/requiz` (구 standalone NestJS `/replay/:id/requiz`
 * + Bearer 모델은 M1 피벗으로 폐기). 신원 = **OS access 쿠키**(`credentials:'include'`, Domain=.pullim.ai)
 * + write **CSRF double-submit**(`X-CSRF-Token`, `fetchOsCsrfToken` 재사용) — chat-stream 과 동일 규약.
 * FE 는 x-user-id·Bearer 를 보내지 않는다.
 *
 * body 없음 — 고정 데모 좌표(replayId→약점 세그먼트)는 BE 소유. 201 JSON → `ReplayRequizResponse`.
 *
 * qgen-ai 장애를 BE 가 흡수(`degraded:true` 201)하는 경우는 정상 응답이다. 상류 인증 실패→502·
 * 상류 429→503·per-user rate-limit 초과→429 등 **비-2xx 는 throw** 한다 — 호출부(replay-detail)의
 * `onError → fallbackMock` 이 graceful 폴백으로 흡수한다.
 */
export async function requizRequest(replayId: string): Promise<ReplayRequizResponse> {
  // write 표면(CsrfGuard) — GET /auth/csrf 로 받은 토큰을 X-CSRF-Token 으로 재전송(double-submit).
  const csrf = await fetchOsCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${API_BASE}/classbot/replay/${replayId}/requiz`, {
    method: 'POST',
    // OS access 쿠키(HttpOnly)를 cross-origin 자동 첨부 — 서버가 sub 를 파생.
    credentials: 'include',
    headers,
    cache: 'no-store',
  });

  // 비-2xx(429/502/503 등)는 throw → replay-detail onError → fallbackMock 흡수.
  if (!res.ok) {
    throw new Error(`requiz request failed: HTTP ${res.status}`);
  }

  return (await res.json()) as ReplayRequizResponse;
}

/** 재응시 mutation 훅 — requizRequest 를 TanStack Query useMutation 으로 래핑. */
export function useRequiz(replayId: string) {
  return useMutation<ReplayRequizResponse, Error, void>({
    mutationFn: () => requizRequest(replayId),
  });
}
