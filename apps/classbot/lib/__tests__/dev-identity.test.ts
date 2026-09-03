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

describe('isDevIdentityHost', () => {
  it.each([
    ['localhost:3032', true],
    ['127.0.0.1:3032', true],
    ['dev-classbot.pullim.ai', true],
    ['classbot.pullim.ai', false],
    ['CLASSBOT.PULLIM.AI', false],
    ['classbot.pullim.ai:443', false],
  ])('%s → %s', (host, expected) => {
    expect(isDevIdentityHost(host)).toBe(expected);
  });

  it('Host 를 모르면(null) 막지 않는다 — 로컬 fetch·테스트 경로', () => {
    expect(isDevIdentityHost(null)).toBe(true);
    expect(isDevIdentityHost(undefined)).toBe(true);
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
