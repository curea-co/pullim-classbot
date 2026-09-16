import {
  osLoginUrl,
  OS_URL,
  redirectToOsLogin,
  resolveReturnTarget,
} from '@/lib/auth/os-sso';

describe('osLoginUrl', () => {
  it('안전한 내부 경로를 next 쿼리로 부착한다', () => {
    expect(osLoginUrl('/classbot')).toBe(`${OS_URL}/login?next=%2Fclassbot`);
  });

  it('쿼리·특수문자가 있는 경로를 encode 한다', () => {
    expect(osLoginUrl('/classbot/replay/r-1?from=home')).toBe(
      `${OS_URL}/login?next=${encodeURIComponent('/classbot/replay/r-1?from=home')}`,
    );
  });

  it('외부/프로토콜 상대 URL 은 next 없이 OS 로그인 루트로 보낸다(open-redirect 방지)', () => {
    expect(osLoginUrl('https://evil.example.com')).toBe(`${OS_URL}/login`);
    expect(osLoginUrl('//evil.example.com')).toBe(`${OS_URL}/login`);
    expect(osLoginUrl('')).toBe(`${OS_URL}/login`);
  });

  // ── B-7: cross-host full-URL next ──────────────────────────────────────────
  it('앱 오리진 절대 URL next 를 selfOrigin 일치 시 부착한다(cross-host 복귀)', () => {
    const appOrigin = 'https://dev-classbot.pullim.ai';
    const abs = `${appOrigin}/classbot`;
    expect(osLoginUrl(abs, appOrigin)).toBe(`${OS_URL}/login?next=${encodeURIComponent(abs)}`);
  });

  it('selfOrigin 과 다른 오리진 절대 URL 은 드롭한다(open-redirect 방지)', () => {
    expect(osLoginUrl('https://evil.example.com/x', 'https://dev-classbot.pullim.ai')).toBe(
      `${OS_URL}/login`,
    );
  });
});

describe('resolveReturnTarget', () => {
  it('OS 와 동일 오리진이면 내부 경로를 유지한다(기존 동작)', () => {
    // 기본 OS_URL 은 http://os.pullim.local:3001 — 동일 오리진 앱 가정.
    const sameAsOs = new URL(OS_URL).origin;
    expect(resolveReturnTarget('/classbot', sameAsOs)).toBe('/classbot');
  });

  it('OS 와 다른 오리진(cross-host)이면 앱 오리진 절대 URL 로 승격한다', () => {
    const appOrigin = 'https://dev-classbot.pullim.ai';
    expect(resolveReturnTarget('/classbot', appOrigin)).toBe(`${appOrigin}/classbot`);
    expect(resolveReturnTarget('/teacher?tab=live', appOrigin)).toBe(
      `${appOrigin}/teacher?tab=live`,
    );
  });

  it('안전하지 않은 경로는 승격 없이 그대로 넘겨 osLoginUrl 에서 드롭되게 한다', () => {
    const appOrigin = 'https://dev-classbot.pullim.ai';
    expect(resolveReturnTarget('//evil.example.com', appOrigin)).toBe('//evil.example.com');
  });
});

// ── 로그인 진입 단일 지점 ────────────────────────────────────────────────────
// 클래스봇은 자체 로그인 화면이 없다. 헤더 프로필 메뉴와 읽기 로그인 게이트가 **같은 함수**를
// 지나야 한다 — 종전엔 양쪽이 `?next=` 복귀를 각자 만들어 한쪽만 cross-host 승격을 했다.
describe('redirectToOsLogin', () => {
  const assign = jest.fn();
  let original: Location;

  beforeEach(() => {
    assign.mockClear();
    original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign,
        origin: 'https://dev-classbot.pullim.ai',
        pathname: '/classbot/assignment',
        search: '',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('현재 경로를 next 로 실어 OS 로그인으로 보낸다', () => {
    redirectToOsLogin();
    expect(assign).toHaveBeenCalledTimes(1);
    // 기본 OS_URL(os.pullim.local)과 앱 오리진이 달라 cross-host 승격이 일어난다(B-7).
    const expected = `${OS_URL}/login?next=${encodeURIComponent(
      'https://dev-classbot.pullim.ai/classbot/assignment',
    )}`;
    expect(assign).toHaveBeenCalledWith(expected);
  });

  it('쿼리스트링도 복귀 대상에 함께 싣는다', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign,
        origin: 'https://dev-classbot.pullim.ai',
        pathname: '/teacher',
        search: '?tab=live',
      },
    });
    redirectToOsLogin();
    expect(assign).toHaveBeenCalledWith(
      `${OS_URL}/login?next=${encodeURIComponent('https://dev-classbot.pullim.ai/teacher?tab=live')}`,
    );
  });
});
