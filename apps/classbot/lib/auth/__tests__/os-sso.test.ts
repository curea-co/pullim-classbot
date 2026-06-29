import { osLoginUrl, OS_URL } from '@/lib/auth/os-sso';

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
});
