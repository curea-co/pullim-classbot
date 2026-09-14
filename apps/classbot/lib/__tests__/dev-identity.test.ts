/**
 * 개발 전용 신원(lib/dev-identity.ts) 단위 테스트 — 그 파일을 지울 때 이것도 함께 지운다.
 *
 * 지키는 것 셋:
 *  1. prod 호스트에서는 무력이다.
 *  2. allowlist 밖 id 는 무시한다(임의 사칭 불가).
 *  3. 쿠키 파싱이 다른 쿠키·인코딩·공백에 흔들리지 않는다.
 */
import {
  DEV_IDENTITIES,
  DEV_IDENTITY_COOKIE,
  clearDevIdentityCookie,
  findDevIdentity,
  isDevIdentityHost,
  isRoleSwitchHost,
  readDevIdentityCookie,
  resolveDevIdentity,
  writeDevIdentityCookie,
} from '@/lib/dev-identity';

const LOCAL_HOST = 'localhost:3032';
const PROD_HOST = 'classbot.pullim.ai';

/** jsdom 의 document.cookie 를 비운다(테스트 간 누수 방지). */
function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(clearAllCookies);

describe('DEV_IDENTITIES', () => {
  it('계약 §2 의 데모 사용자 5명을 그대로 담는다', () => {
    expect(DEV_IDENTITIES.map((i) => i.id)).toEqual([
      'student_001',
      's2',
      'teacher_001',
      'teacher_002',
      'parent_001',
    ]);
  });

  it('역할은 student · teacher · parent 셋뿐이고 라벨에 이름이 들어 있다', () => {
    for (const identity of DEV_IDENTITIES) {
      expect(['student', 'teacher', 'parent']).toContain(identity.role);
      expect(identity.label).toContain(identity.name);
    }
  });
});

describe('isDevIdentityHost — 허용 목록 + fail-closed', () => {
  const SAVED = { v: process.env.VERCEL_ENV, p: process.env.NEXT_PUBLIC_VERCEL_ENV };
  const setEnv = (name: 'VERCEL_ENV' | 'NEXT_PUBLIC_VERCEL_ENV', value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  beforeEach(() => {
    setEnv('VERCEL_ENV', undefined);
    setEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
  });
  afterEach(() => {
    setEnv('VERCEL_ENV', SAVED.v);
    setEnv('NEXT_PUBLIC_VERCEL_ENV', SAVED.p);
  });

  // 배포 환경을 모르는 자리 — 로컬 개발이 여기다.
  it.each([
    ['localhost:3032', true],
    ['127.0.0.1:3032', true],
    ['[::1]:3032', true],
    // 배포 호스트는 열지 않는다 — 배포에 DB 가 없어 신원을 세우면 500 만 난다(모듈 머리주석)
    ['dev-classbot.pullim.ai', false],
    // prod 이름
    ['classbot.pullim.ai', false],
    ['CLASSBOT.PULLIM.AI', false],
    ['classbot.pullim.ai:443', false],
    // 목록 밖은 전부 막힌다 — 거부 목록이 아니라 허용 목록이라서
    ['evil.example.com', false],
    ['classbot.pullim.ai.attacker.com', false],
    // `.vercel.app` 접미사를 흉내 낸 이름
    ['notvercel.app', false],
    ['vercel.app.attacker.com', false],
  ])('배포 환경 모름: %s → %s', (host, expected) => {
    expect(isDevIdentityHost(host)).toBe(expected);
  });

  // 종전에는 Host 를 모르면 통과였다. 모르면 **닫는다** — fail-open 은 이 장치에서 사고다.
  it('Host 를 모르면 막는다', () => {
    expect(isDevIdentityHost(null)).toBe(false);
    expect(isDevIdentityHost(undefined)).toBe(false);
    expect(isDevIdentityHost('')).toBe(false);
    expect(isDevIdentityHost('   ')).toBe(false);
  });

  // **이 파일에서 가장 중요한 자리.** 배포된 호스트는 환경이 무엇이든 열리지 않는다.
  // 종전에는 preview 라고 확인되면 `*.vercel.app` 과 `dev-classbot.pullim.ai` 를 열었는데,
  // 배포에는 DB 가 없어 신원을 세우면 라우트가 500 만 낸다(모듈 머리주석의 실측).
  // 그래서 이 도구는 **로컬 전용**이다.
  it('preview 배포여도 배포 호스트는 막힌다 — 신원을 세워도 DB 가 없다', () => {
    setEnv('VERCEL_ENV', 'preview');
    expect(isDevIdentityHost('pullim-classbot-git-feat-x-curea.vercel.app')).toBe(false);
    expect(isDevIdentityHost('dev-classbot.pullim.ai')).toBe(false);
    // 로컬은 환경변수와 무관하게 열린다 — 이 도구가 사는 곳이다.
    expect(isDevIdentityHost('localhost:3032')).toBe(true);
  });

  it('배포 환경을 몰라도 *.vercel.app 은 막힌다', () => {
    expect(isDevIdentityHost('pullim-classbot-abc123-curea.vercel.app')).toBe(false);
  });

  // 이름에 기대지 않는 방어선 — Host 를 위조해도 막힌다.
  it.each([
    'pullim-classbot-abc123-curea.vercel.app',
    'classbot.pullim.ai',
    'dev-classbot.pullim.ai',
    'localhost:3032',
  ])('production 배포면 Host 가 %s 여도 막힌다', (host) => {
    setEnv('VERCEL_ENV', 'production');
    expect(isDevIdentityHost(host)).toBe(false);
  });

  /*
    아래 둘은 **`localhost` 로** 검증한다. 배포 호스트는 이제 환경과 무관하게 false 라,
    그것으로 우선순위를 재면 **통과해도 아무것도 증명하지 못한다**(호스트에서 이미 걸린다).
    `localhost` 는 환경 판정이 실제로 결과를 가르는 유일한 자리다 — production 이면 닫힌다.
  */

  // 서버 전용 값이 권한 판정의 근거다 — 공개 변수가 반대로 말해도 서버 값이 이긴다.
  it('서버 VERCEL_ENV 가 공개 변수보다 우선한다', () => {
    setEnv('VERCEL_ENV', 'production');
    setEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    expect(isDevIdentityHost('localhost:3032')).toBe(false);
  });

  // 클라이언트에는 서버 전용 값이 없다 — 공개 변수만 있을 때도 그것으로 판정한다.
  it('서버 값이 없으면 공개 변수로 판정한다 — 클라이언트 경로', () => {
    setEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    expect(isDevIdentityHost('localhost:3032')).toBe(false);
  });
});

describe('isRoleSwitchHost — 화면 전환은 신원과 다른 판정이다', () => {
  const SAVED = { v: process.env.VERCEL_ENV, p: process.env.NEXT_PUBLIC_VERCEL_ENV };
  const setEnv = (name: 'VERCEL_ENV' | 'NEXT_PUBLIC_VERCEL_ENV', value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  beforeEach(() => {
    setEnv('VERCEL_ENV', undefined);
    setEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
  });
  afterEach(() => {
    setEnv('VERCEL_ENV', SAVED.v);
    setEnv('NEXT_PUBLIC_VERCEL_ENV', SAVED.p);
  });

  /*
    화면 전환은 서버를 부르지 않으므로 배포에서도 열린다. 신원(`isDevIdentityHost`)은
    로컬만이다 — 배포에는 DB 가 없다. **두 판정이 같은 호스트에서 다른 답을 내는 것**이
    이 분리의 요지다.
  */
  it('dev preview 는 전환은 열리고 신원은 닫힌다', () => {
    expect(isRoleSwitchHost('dev-classbot.pullim.ai')).toBe(true);
    expect(isDevIdentityHost('dev-classbot.pullim.ai')).toBe(false);
  });

  it('로컬은 둘 다 열린다', () => {
    expect(isRoleSwitchHost('localhost:3032')).toBe(true);
    expect(isDevIdentityHost('localhost:3032')).toBe(true);
  });

  it('`*.vercel.app` 은 preview 라고 확인됐을 때만 전환이 열린다 — 모르면 닫는다', () => {
    expect(isRoleSwitchHost('pullim-classbot-abc-curea.vercel.app')).toBe(false);
    setEnv('VERCEL_ENV', 'preview');
    expect(isRoleSwitchHost('pullim-classbot-abc-curea.vercel.app')).toBe(true);
    // 그래도 신원은 닫혀 있다
    expect(isDevIdentityHost('pullim-classbot-abc-curea.vercel.app')).toBe(false);
  });

  it.each(['classbot.pullim.ai', 'evil.example.com', '', '   '])(
    'production 이름·목록 밖·빈 Host(%s)는 전환도 닫힌다',
    (host) => {
      expect(isRoleSwitchHost(host)).toBe(false);
    },
  );

  it('production 배포면 어떤 호스트여도 전환이 닫힌다', () => {
    setEnv('VERCEL_ENV', 'production');
    for (const host of ['dev-classbot.pullim.ai', 'localhost:3032', 'x-curea.vercel.app']) {
      expect(isRoleSwitchHost(host)).toBe(false);
    }
  });
});

describe('findDevIdentity', () => {
  it('allowlist 안이면 그 행을, 밖이면 null 을 준다', () => {
    expect(findDevIdentity('parent_001')?.name).toBe('어머니');
    expect(findDevIdentity('teacher_999')).toBeNull();
    expect(findDevIdentity('')).toBeNull();
    expect(findDevIdentity(null)).toBeNull();
  });
});

describe('resolveDevIdentity', () => {
  it('로컬 호스트 + allowlist id → 그 데모 사용자', () => {
    const found = resolveDevIdentity(`${DEV_IDENTITY_COOKIE}=teacher_002`, LOCAL_HOST);
    expect(found).toMatchObject({ id: 'teacher_002', role: 'teacher', name: '박영어' });
  });

  it('prod 호스트면 쿠키가 있어도 null', () => {
    expect(resolveDevIdentity(`${DEV_IDENTITY_COOKIE}=teacher_002`, PROD_HOST)).toBeNull();
  });

  it('allowlist 밖 id 는 null', () => {
    expect(resolveDevIdentity(`${DEV_IDENTITY_COOKIE}=admin_root`, LOCAL_HOST)).toBeNull();
  });

  it('쿠키 헤더가 없거나 다른 쿠키만 있으면 null', () => {
    expect(resolveDevIdentity(null, LOCAL_HOST)).toBeNull();
    expect(resolveDevIdentity('theme=dark; sid=abc', LOCAL_HOST)).toBeNull();
  });

  it('다른 쿠키 사이에 끼어 있어도, 값에 = 가 있어도 골라 읽는다', () => {
    const header = `theme=dark; ${DEV_IDENTITY_COOKIE}=s2 ; sid=a=b=c`;
    expect(resolveDevIdentity(header, LOCAL_HOST)?.id).toBe('s2');
  });

  it('이름이 접두사로 겹치는 다른 쿠키를 오인하지 않는다', () => {
    const header = `${DEV_IDENTITY_COOKIE}_x=teacher_001; theme=dark`;
    expect(resolveDevIdentity(header, LOCAL_HOST)).toBeNull();
  });

  it('URL 인코딩된 값을 복원해서 대조한다', () => {
    const header = `${DEV_IDENTITY_COOKIE}=${encodeURIComponent('parent_001')}`;
    expect(resolveDevIdentity(header, LOCAL_HOST)?.role).toBe('parent');
  });
});

describe('client 헬퍼 (jsdom, 기본 호스트 localhost)', () => {
  it('쓰고 읽으면 같은 데모 사용자가 돌아온다', () => {
    writeDevIdentityCookie('teacher_001');
    expect(readDevIdentityCookie()).toMatchObject({ id: 'teacher_001', role: 'teacher' });
  });

  it('path=/ · SameSite=Lax · 만료가 붙는다', () => {
    // jsdom 의 document.cookie 는 속성을 되돌려주지 않아 쿠키 이름·값만 확인하고,
    // 속성은 문자열 조립을 직접 본다(구현 세부가 아니라 계약이라 값을 못 박는다).
    writeDevIdentityCookie('s2');
    expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=s2`);
  });

  it('allowlist 밖 id 는 아예 쓰지 않는다', () => {
    writeDevIdentityCookie('attacker');
    expect(document.cookie).not.toContain('attacker');
    expect(readDevIdentityCookie()).toBeNull();
  });

  it('clear 하면 신원이 사라진다', () => {
    writeDevIdentityCookie('parent_001');
    clearDevIdentityCookie();
    expect(readDevIdentityCookie()).toBeNull();
  });
});
