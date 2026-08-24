/**
 * 통합 네비게이션 설정 — 클래스봇 도메인 단일 추출본.
 * 원본 풀림 스터디 데모에서 클래스봇만 분리했기 때문에
 * 학생 GNB / 사이드바 / 하단탭 / 교사 nav 모두 클래스봇·빌더로 한정.
 */

import {
  Home, MessageCircle, GraduationCap, BookOpen,
  LayoutDashboard, Bot, Plus, Target,
  ClipboardCheck, BarChart3, TrendingUp, Radar, Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  matchPrefix?: string[];
  locked?: boolean;
  description?: string;
  children?: NavSubItem[];
};

export type NavSubItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  description?: string;
  locked?: boolean;
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

export type Role = 'student' | 'teacher';

/** 풀림 클래스봇(학생) 섹션 */
export const classbotStudentSection: NavSubItem[] = [
  { href: '/classbot',            label: '홈',         icon: Home,          description: '내 봇 N개 + 오늘 과제' },
  { href: '/classbot/assignment', label: '받은 과제',   icon: Target,        description: '풀이 워크스페이스 — 봇 처방·시험·연습' },
  { href: '/classbot/chat',       label: '봇 대화',     icon: MessageCircle, description: '내 봇과 1:1 — 봇 전환 가능' },
  { href: '/classbot/me/progress', label: '학습 기록', icon: TrendingUp,   description: '내 학습 진행·성취 기록' },
  // 기획 보류 — 내 웰빙(/classbot/wellness) · 리플레이(/classbot/replay) · 봇 찾기(/classbot/discover) 진입점 비노출. 재개 시 되살린다
  // 내 정보(/classbot/me) 는 nav 비노출 — 헤더 프로필 메뉴가 유일 진입점
  { href: '/classbot/onboarding', label: '소개하기',    icon: BookOpen,      description: '4분 사용법 가이드' },
];

/** 사이드바 최상단 — 홈은 클래스봇과 동일 진입점 */
export const studentHomeItem: NavItem = {
  href: '/',
  label: '홈',
  icon: Home,
  description: '풀림 클래스봇',
};

/** 학생 GNB — 클래스봇 단일 도메인 */
export const studentDomains: NavItem[] = [
  {
    href: '/classbot', label: '풀림 클래스봇', icon: GraduationCap,
    description: '교사가 만든 AI 학습 교실 (B2B)',
    children: classbotStudentSection,
  },
];

export const studentNav: NavGroup[] = [
  { label: '', items: [studentHomeItem, ...studentDomains] },
];

/** 교사 사이드바 — 클래스봇 운영 + 빌더 + 평가 */
export const teacherNav: NavGroup[] = [
  {
    label: '워크스페이스',
    items: [
      { href: '/teacher',          label: '홈 대시보드', icon: LayoutDashboard, description: '내 클래스봇 운영 현황' },
      { href: '/teacher/classbot', label: '내 클래스봇', icon: Bot, badge: 3,    description: '활성 봇 운영 + 라이브 모니터링' },
      { href: '/teacher/builder',  label: '봇 빌더',    icon: Plus,             description: '새 클래스봇 만들기 (8단계)' },
      { href: '/teacher/monitor',  label: '학급 관제소', icon: Radar,           description: '학급 실시간 현황 — 학생별 진입' },
      // 설정 전용 그룹이 없어 워크스페이스 끝에 둔다
      { href: '/teacher/settings', label: '봇 설정',    icon: Settings,         description: '클래스봇 운영 설정' },
    ],
  },
  {
    label: '평가',
    items: [
      { href: '/teacher/grading',  label: '채점 허브',   icon: ClipboardCheck,  description: '학생 전체 · AI 초안 검수' },
      { href: '/teacher/reports',  label: '리포트 센터', icon: BarChart3,       description: '6종 리포트 + 학부모 발송' },
      // 기획 보류 — 수업 리플레이(/teacher/replay) 진입점 비노출. 재개 시 되살린다
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  switch (role) {
    case 'student': return studentNav;
    case 'teacher': return teacherNav;
  }
}

/** 모바일 하단 탭 — 학생 클래스봇 sub-route 3개 (웰빙·리플레이는 기획 보류로 비노출) */
export const studentBottomTabs = [
  { href: '/classbot',            label: '홈',       icon: Home,          matchPrefix: ['/classbot'] as string[] },
  { href: '/classbot/assignment', label: '과제',     icon: Target,        matchPrefix: ['/classbot/assignment'] as string[] },
  { href: '/classbot/chat',       label: '대화',     icon: MessageCircle, matchPrefix: ['/classbot/chat'] as string[] },
] as const;

export function findActiveSection(pathname: string, role: Role): NavItem | undefined {
  const nav = navForRole(role);
  for (const group of nav) {
    for (const item of group.items) {
      if (!item.children) continue;
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item;
      }
    }
  }
  return undefined;
}

export function findActiveNav(pathname: string, role: Role): NavItem | undefined {
  const nav = navForRole(role);
  for (const group of nav) {
    for (const item of group.items) {
      if (pathname === item.href) return item;
    }
  }
  let best: NavItem | undefined;
  let bestLen = 0;
  for (const group of nav) {
    for (const item of group.items) {
      if (pathname.startsWith(item.href + '/') && item.href.length > bestLen) {
        best = item;
        bestLen = item.href.length;
      }
    }
  }
  return best;
}

export function buildBreadcrumb(pathname: string, role: Role): { label: string; href?: string }[] {
  const nav = navForRole(role);
  const root =
    role === 'student' ? { label: '풀림 클래스봇', href: '/' }
    : { label: '풀림 교사', href: '/teacher' };
  const trail: { label: string; href?: string }[] = [root];

  if (pathname === root.href) return trail;

  let domainItem: NavItem | undefined;
  for (const group of nav) {
    for (const item of group.items) {
      if (item.href === root.href) continue;
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        if (!domainItem || item.href.length > domainItem.href.length) {
          domainItem = item;
        }
      }
    }
  }
  if (!domainItem) return trail;
  trail.push({ label: domainItem.label, href: domainItem.href });
  if (pathname === domainItem.href) return trail;

  const candidates: NavSubItem[] = [...(domainItem.children ?? [])];
  const seen = new Set<string>([domainItem.href]);
  const matched: NavSubItem[] = [];
  for (const c of candidates) {
    if (seen.has(c.href)) continue;
    if (pathname === c.href || pathname.startsWith(c.href + '/')) {
      seen.add(c.href);
      matched.push(c);
    }
  }
  matched.sort((a, b) => a.href.length - b.href.length);
  for (const m of matched) {
    trail.push({ label: m.label, href: m.href });
  }

  return trail;
}
