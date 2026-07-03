import { isSafeNextPath, isSafeAbsoluteNext, isSafeNext } from '@/lib/auth/safe-next';

describe('isSafeNextPath', () => {
  it('단일 / 로 시작하는 내부 경로만 허용한다', () => {
    expect(isSafeNextPath('/classbot')).toBe(true);
    expect(isSafeNextPath('/classbot/replay/r-1?x=1')).toBe(true);
  });

  it('외부·프로토콜 상대·백슬래시·빈 값은 거부한다', () => {
    expect(isSafeNextPath('')).toBe(false);
    expect(isSafeNextPath('https://evil.example.com')).toBe(false);
    expect(isSafeNextPath('//evil.example.com')).toBe(false);
    expect(isSafeNextPath('/\\evil')).toBe(false);
  });
});

describe('isSafeAbsoluteNext', () => {
  const APP = 'https://dev-classbot.pullim.ai';

  it('selfOrigin 과 오리진이 일치하는 절대 URL 만 허용한다', () => {
    expect(isSafeAbsoluteNext(`${APP}/classbot`, APP)).toBe(true);
    expect(isSafeAbsoluteNext(`${APP}/teacher?tab=live`, APP)).toBe(true);
  });

  it('다른 오리진·selfOrigin 부재·비 URL 은 거부한다', () => {
    expect(isSafeAbsoluteNext('https://evil.example.com/x', APP)).toBe(false);
    expect(isSafeAbsoluteNext(`${APP}/classbot`, '')).toBe(false);
    expect(isSafeAbsoluteNext('/classbot', APP)).toBe(false); // 경로는 절대 URL 아님
  });
});

describe('isSafeNext', () => {
  const APP = 'https://dev-classbot.pullim.ai';

  it('내부 경로는 selfOrigin 없이도 안전하다', () => {
    expect(isSafeNext('/classbot')).toBe(true);
  });

  it('앱 오리진 절대 URL 은 selfOrigin 이 일치할 때만 안전하다', () => {
    expect(isSafeNext(`${APP}/classbot`, APP)).toBe(true);
    expect(isSafeNext(`${APP}/classbot`)).toBe(false); // selfOrigin 미제공
    expect(isSafeNext('https://evil.example.com/x', APP)).toBe(false);
  });
});
