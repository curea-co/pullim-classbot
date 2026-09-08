import { fetchOsCsrfToken } from '@/lib/auth/os-sso';

async function responseCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return typeof body?.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

/** OS 쿠키 기반 write. 정확한 CSRF mismatch만 bootstrap 후 원 요청을 한 번 재시도한다. */
export async function fetchWithOsCsrfRecovery(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const send = async (csrfToken: string | null) => {
    const headers = { ...(init.headers as Record<string, string> | undefined) };
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    else delete headers['X-CSRF-Token'];
    return fetch(input, { ...init, headers });
  };

  const response = await send(await fetchOsCsrfToken());
  if (response.status !== 403 || (await responseCode(response)) !== 'CSRF_TOKEN_MISMATCH') {
    return response;
  }

  return send(await fetchOsCsrfToken({ force: true }));
}
