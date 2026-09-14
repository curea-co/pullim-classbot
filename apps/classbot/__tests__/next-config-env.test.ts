/**
 * @jest-environment node
 *
 * 배포 경로 배선 — `next.config.ts` 가 서버 전용 `VERCEL_ENV` 를 클라이언트 번들이 읽는
 * 이름으로 실어 보내는가.
 *
 * 이걸 따로 거는 이유: `lib/dev-identity.ts` 쪽 테스트는 `process.env` 에 값을 직접 넣어
 * **판정 함수**만 본다. 그 함수가 옳아도 **브라우저에 값이 도착하지 않으면** PR preview 에서
 * 역할 전환이 조용히 사라진다 — 그 자리는 함수가 아니라 **빌드 설정**에 있다.
 * 그리고 `NEXT_PUBLIC_VERCEL_ENV` 를 Vercel 프로젝트 설정에 기대면 저장소만 보고는
 * 보장할 수 없으므로, 그 배선이 **코드에 있다는 것**을 여기서 못박는다.
 */

/** env 를 세운 뒤 `next.config.ts` 를 새로 평가해 `env` 블록을 읽는다. */
async function loadConfigEnv(vars: {
  VERCEL_ENV?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
}): Promise<Record<string, string> | undefined> {
  const saved = {
    v: process.env.VERCEL_ENV,
    p: process.env.NEXT_PUBLIC_VERCEL_ENV,
  };
  const set = (name: 'VERCEL_ENV' | 'NEXT_PUBLIC_VERCEL_ENV', value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  set('VERCEL_ENV', vars.VERCEL_ENV);
  set('NEXT_PUBLIC_VERCEL_ENV', vars.NEXT_PUBLIC_VERCEL_ENV);
  try {
    // 설정은 모듈 평가 시점에 값을 읽는다 → 매번 새로 불러와야 한다.
    jest.resetModules();
    const mod = (await import('@/next.config')) as { default: { env?: Record<string, string> } };
    return mod.default.env;
  } finally {
    set('VERCEL_ENV', saved.v);
    set('NEXT_PUBLIC_VERCEL_ENV', saved.p);
  }
}

describe('next.config — 배포 환경을 브라우저까지 실어 보낸다', () => {
  // 실제 PR preview 가 타는 경로 — Vercel 은 서버 전용 `VERCEL_ENV` 만 보장한다.
  it('서버 전용 VERCEL_ENV 를 공개 이름으로 옮긴다', async () => {
    const env = await loadConfigEnv({ VERCEL_ENV: 'preview' });
    expect(env?.NEXT_PUBLIC_VERCEL_ENV).toBe('preview');
  });

  it('production 도 그대로 옮긴다', async () => {
    const env = await loadConfigEnv({ VERCEL_ENV: 'production' });
    expect(env?.NEXT_PUBLIC_VERCEL_ENV).toBe('production');
  });

  // 프로젝트 설정이 공개 변수를 이미 넣어 주는 경우 — 그것도 잃지 않는다.
  it('서버 값이 없으면 이미 있는 공개 변수를 쓴다', async () => {
    const env = await loadConfigEnv({ NEXT_PUBLIC_VERCEL_ENV: 'preview' });
    expect(env?.NEXT_PUBLIC_VERCEL_ENV).toBe('preview');
  });

  // 로컬 개발 · Vercel 밖 배포. 빈 값이면 `isDevIdentityHost` 가 닫는 쪽으로 접힌다.
  it('둘 다 없으면 빈 문자열 — 열린 채로 두지 않는다', async () => {
    const env = await loadConfigEnv({});
    expect(env?.NEXT_PUBLIC_VERCEL_ENV).toBe('');
  });
});
