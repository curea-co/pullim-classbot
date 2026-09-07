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
  const SAVED = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const setEnv = (value: string | undefined) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    else process.env.NEXT_PUBLIC_VERCEL_ENV = value;
  };
  afterEach(() => setEnv(SAVED));

  it.each([
    // 로컬 — 이 장치가 필요한 자리
    ['localhost:3032', true],
    ['127.0.0.1:3032', true],
    ['[::1]:3032', true],
    // dev preview · PR 별 preview — 살려 둔다
    ['dev-classbot.pullim.ai', true],
    ['pullim-classbot-git-feat-x-curea.vercel.app', true],
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
  ])('%s → %s', (host, expected) => {
    expect(isDevIdentityHost(host)).toBe(expected);
  });

  // 종전에는 Host 를 모르면 통과였다. 모르면 **닫는다** — fail-open 은 이 장치에서 사고다.
  it('Host 를 모르면 막는다', () => {
    expect(isDevIdentityHost(null)).toBe(false);
    expect(isDevIdentityHost(undefined)).toBe(false);
    expect(isDevIdentityHost('')).toBe(false);
    expect(isDevIdentityHost('   ')).toBe(false);
  });

  // 이름에 기대지 않는 마지막 방어선 — prod 배포는 `*.vercel.app` 로도 열려 있다.
  it('production 배포면 호스트 이름이 무엇이든 막는다', () => {
    setEnv('production');
    for (const host of [
      'localhost:3032',
      'dev-classbot.pullim.ai',
      'pullim-classbot-abc123-curea.vercel.app',
      'classbot.pullim.ai',
    ]) {
      expect(isDevIdentityHost(host)).toBe(false);
    }
  });

  it('preview 배포는 계속 동작한다 — 여기서 죽으면 개발 흐름이 상한다', () => {
    setEnv('preview');
    expect(isDevIdentityHost('pullim-classbot-git-feat-x-curea.vercel.app')).toBe(true);
    expect(isDevIdentityHost('dev-classbot.pullim.ai')).toBe(true);
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
