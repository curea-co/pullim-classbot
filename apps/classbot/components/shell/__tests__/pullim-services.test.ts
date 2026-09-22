import { buildClassbotSwitcherServices } from '../pullim-services';

describe('classbot service switcher catalog', () => {
  it('노출 서비스 9개를 사용자 확정 순서로 반환한다', () => {
    const services = buildClassbotSwitcherServices('https://os.pullim.ai');

    expect(services.map(({ name }) => name)).toEqual([
      'OS홈',
      '플래너',
      '문제큐',
      '라이팅 코치',
      '주니어',
      '아케이드',
      '입시코치',
      '클래스봇',
      '스튜디오',
    ]);
    expect(services.filter(({ active }) => active).map(({ name }) => name)).toEqual(['클래스봇']);
  });

  it('dev OS 티어를 형제 앱 호스트와 경로에 보존한다', () => {
    const services = buildClassbotSwitcherServices('https://dev-os.pullim.ai');
    const href = Object.fromEntries(services.map((service) => [service.slug, service.href]));

    expect(href).toMatchObject({
      os: 'https://dev-os.pullim.ai/os',
      planner: 'https://dev-planner.pullim.ai/planner',
      q: 'https://dev-q.pullim.ai',
      writing: 'https://dev-writing.pullim.ai',
      junior: 'https://dev-jr.pullim.ai',
      arcade: 'https://dev-arcade.pullim.ai',
      exam: 'https://dev-admissions.pullim.ai',
      classbot: '/classbot',
      studio: 'https://dev-studio.pullim.ai',
    });
  });

  it('apex dev OS도 dev 형제 앱으로 파생한다', () => {
    const services = buildClassbotSwitcherServices('https://dev.pullim.ai');
    expect(services.find(({ slug }) => slug === 'planner')?.href).toBe(
      'https://dev-planner.pullim.ai/planner',
    );
  });

  it('앱별 override를 티어 파생보다 우선한다', () => {
    const services = buildClassbotSwitcherServices('http://os.pullim.local:3001', {
      planner: 'http://planner.pullim.local:3006/',
      q: 'http://q.pullim.local:3002',
    });

    expect(services.find(({ slug }) => slug === 'planner')?.href).toBe(
      'http://planner.pullim.local:3006/planner',
    );
    expect(services.find(({ slug }) => slug === 'q')?.href).toBe('http://q.pullim.local:3002');
    expect(services.find(({ slug }) => slug === 'writing')?.href).toBe(
      'http://os.pullim.local:3001/os',
    );
  });

  it('허용하지 않은 OS origin이면 외부 링크를 만들지 않는다', () => {
    expect(buildClassbotSwitcherServices('javascript:alert(1)')).toEqual([]);
    expect(buildClassbotSwitcherServices('https://os.pullim.ai.evil.example')).toEqual([]);
  });
});
