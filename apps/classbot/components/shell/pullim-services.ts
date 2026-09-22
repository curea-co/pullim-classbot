import type { ServiceIconName } from '@/components/ui/service-icon';

type SiblingApp =
  | 'planner'
  | 'q'
  | 'writing'
  | 'jr'
  | 'arcade'
  | 'admissions'
  | 'studio';

export type ClassbotServiceIconName = ServiceIconName | 'junior';

export type ClassbotSwitcherService = {
  slug: string;
  name: string;
  icon: ClassbotServiceIconName;
  href: string;
  active?: boolean;
};

export type ServiceOriginOverrides = Partial<Record<SiblingApp, string>>;

/**
 * Next.js 는 `NEXT_PUBLIC_*` 접근을 빌드 때 치환하므로 키를 동적으로 만들지 않는다.
 * 앱별 override 는 로컬에서 각 형제 앱을 따로 띄워 전환을 검증할 때 최우선으로 쓴다.
 */
function serviceOriginOverrides(): ServiceOriginOverrides {
  return {
    planner: process.env.NEXT_PUBLIC_PLANNER_URL,
    q: process.env.NEXT_PUBLIC_Q_URL,
    writing: process.env.NEXT_PUBLIC_WRITING_URL,
    jr: process.env.NEXT_PUBLIC_JR_URL,
    arcade: process.env.NEXT_PUBLIC_ARCADE_URL,
    admissions: process.env.NEXT_PUBLIC_ADMISSIONS_URL,
    studio: process.env.NEXT_PUBLIC_STUDIO_URL,
  };
}

function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

function isAllowedOsHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'pullim.local' ||
    hostname.endsWith('.pullim.local') ||
    hostname === 'pullim.ai' ||
    hostname.endsWith('.pullim.ai')
  );
}

/** OS 홈은 로그인 origin 과 같되 앱 런처 경로(`/os`)로 보낸다. */
function osHomeHref(osBase: URL): string {
  const home = new URL(osBase.origin);
  home.pathname = '/os';
  return home.toString().replace(/\/$/, '');
}

/**
 * OS 호스트에서 형제 서비스에 물려줄 환경 접두를 구한다.
 * `dev-os`/`preview-os`는 접두 전체를 보존하고, apex dev(`dev.pullim.ai`)도 dev로 맞춘다.
 */
function siblingPrefix(osBase: URL): string | null {
  const { hostname } = osBase;
  if (hostname === 'pullim.ai') return '';
  if (hostname === 'dev.pullim.ai') return 'dev-';
  if (!hostname.endsWith('.pullim.ai')) return null;

  const firstLabel = hostname.slice(0, hostname.indexOf('.'));
  const match = firstLabel.match(/^(.*-)?os$/);
  return match ? (match[1] ?? '') : null;
}

function normalizedOverride(raw: string | undefined, path = ''): string | null {
  if (!raw) return null;
  const parsed = parseHttpUrl(raw);
  if (!parsed) return null;
  return `${parsed.origin}${path}`;
}

function siblingHref(
  osBase: URL,
  app: SiblingApp,
  overrides: ServiceOriginOverrides,
  path = '',
): string {
  const override = normalizedOverride(overrides[app], path);
  if (override) return override;

  const prefix = siblingPrefix(osBase);
  if (prefix !== null) return `${osBase.protocol}//${prefix}${app}.pullim.ai${path}`;

  // 로컬 또는 알 수 없는 비운영 표면에서 운영 서비스로 새지 않는다.
  return osHomeHref(osBase);
}

/**
 * 서비스 전환 목록의 단일 진실원. 사용자 확정 순서를 바꾸지 않는다.
 * OS base 가 부적격이면 안전하지 않은 링크를 그리지 않도록 빈 목록으로 닫는다.
 */
export function buildClassbotSwitcherServices(
  rawOsBase: string,
  overrides: ServiceOriginOverrides = {},
): ClassbotSwitcherService[] {
  const osBase = parseHttpUrl(rawOsBase);
  if (!osBase || !isAllowedOsHost(osBase.hostname)) return [];

  return [
    { slug: 'os', name: 'OS홈', icon: 'pullim', href: osHomeHref(osBase) },
    { slug: 'planner', name: '플래너', icon: 'planner', href: siblingHref(osBase, 'planner', overrides, '/planner') },
    { slug: 'q', name: '문제큐', icon: 'q', href: siblingHref(osBase, 'q', overrides) },
    { slug: 'writing', name: '라이팅 코치', icon: 'writing', href: siblingHref(osBase, 'writing', overrides) },
    { slug: 'junior', name: '주니어', icon: 'junior', href: siblingHref(osBase, 'jr', overrides) },
    { slug: 'arcade', name: '아케이드', icon: 'games', href: siblingHref(osBase, 'arcade', overrides) },
    { slug: 'exam', name: '입시코치', icon: 'exam', href: siblingHref(osBase, 'admissions', overrides) },
    { slug: 'classbot', name: '클래스봇', icon: 'classbot', href: '/classbot', active: true },
    { slug: 'studio', name: '스튜디오', icon: 'studio', href: siblingHref(osBase, 'studio', overrides) },
  ];
}

export function classbotSwitcherServices(): ClassbotSwitcherService[] {
  const osBase = process.env.NEXT_PUBLIC_OS_URL ?? 'http://os.pullim.local:3001';
  return buildClassbotSwitcherServices(osBase, serviceOriginOverrides());
}
