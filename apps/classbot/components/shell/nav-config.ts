/**
 * 통합 네비게이션 설정 — 클래스봇 도메인 단일 추출본.
 * 원본 풀림 스터디 데모에서 클래스봇만 분리했기 때문에
 * 학생 GNB / 사이드바 / 하단탭 / 교사 nav 모두 클래스봇·빌더로 한정.
 */

import {
  Home, MessageCircle, GraduationCap, BookOpen,
  LayoutDashboard, Bot, Plus, Target, Compass,
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
  /** 이 항목 소속이지만 href 아래에 있지 않은 경로 (NavItem 과 같은 뜻) */
  matchPrefix?: string[];
  description?: string;
  locked?: boolean;
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

export type Role = 'student' | 'teacher' | 'parent';

/** 풀림 클래스봇(학생) 섹션 */
export const classbotStudentSection: NavSubItem[] = [
  { href: '/classbot',            label: '홈',         icon: Home,          description: '내 봇 N개 + 오늘 과제' },
  // 「내 수업방」·「내가 담은 봇」은 그 화면이 도착하는 PR 에서 여기 들어온다 —
  // nav 는 라우트 인벤토리라 페이지보다 먼저 열면 누르는 즉시 404 다.
  { href: '/classbot/assignment', label: '받은 과제',   icon: Target,        description: '풀이 워크스페이스 — 봇 처방·시험·연습' },
  // 커리큘럼·단원 화면(`/classbot/learn/*`)은 봇 대화에서 이어지는 학습이라 여기 소속인데
  // 경로가 `/classbot/chat` 아래가 아니라 접두사로는 안 잡힌다.
  { href: '/classbot/chat',       label: '봇 대화',     icon: MessageCircle, description: '내 봇과 1:1 — 봇 전환 가능', matchPrefix: ['/classbot/learn'] },
  { href: '/classbot/me/progress', label: '학습 기록', icon: TrendingUp,   description: '내 학습 진행·성취 기록' },
  // 봇 마켓(/classbot/discover) 는 오래 「기획 보류·nav 비노출」이었다. 교사가 자기 봇을
  // 밖에 게시하는 기능이 생기면서 **게시된 봇이 실제로 모이는 화면**이 됐으므로 다시 연다.
  { href: '/classbot/discover',   label: '봇 마켓',    icon: Compass,       description: '선생님들이 공유한 봇 둘러보기' },
  // 기획 보류 — 내 웰빙(/classbot/wellness) · 리플레이(/classbot/replay) 진입점 비노출. 재개 시 되살린다
  // 내 정보(/classbot/me) 는 nav 비노출 — 헤더 프로필 메뉴가 유일 진입점
  { href: '/classbot/onboarding', label: '소개',    icon: BookOpen,      description: '4분 사용법 가이드' },
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
      // 「내 수업방」(/teacher/classroom)은 그 화면이 도착하는 PR 에서 홈 바로 뒤에 들어온다.
      // 과제 내기(`/teacher/assignment/new`)는 봇에서 과제를 내보내는 화면이라 여기 소속인데
      // 경로가 `/teacher/classbot` 아래가 아니라 접두사로는 안 잡힌다.
      // `/teacher/assignment` 가 아니라 `new` 까지 적는다 — 지금 그 아래엔 이 화면뿐이고,
      // 나중에 형제 경로가 생기면 소속을 새로 정하게 두려는 것이다(조용히 물려받지 않게).
      { href: '/teacher/classbot', label: '내 클래스봇', icon: Bot, badge: 3,    description: '활성 봇 운영 + 라이브 모니터링', matchPrefix: ['/teacher/assignment/new'] },
      // TODO(봇 빌더 이식): 다음 작업에서 이 항목을 걷고 [봇 관리] 하위(`/teacher/bots/new`)로 옮긴다.
      //  그때 [봇 관리] 안의 「새 봇」이 유일한 진입점이 된다 (`proc/spec/03 § 4.4.7`).
      { href: '/teacher/builder',  label: '봇 빌더',    icon: Plus,             description: '새 클래스봇 만들기 (8단계)' },
      // 학생 상세(`/teacher/students/*`)는 관제소 명단에서 학생을 눌러 들어가는 화면인데
      // 경로가 `/teacher/monitor` 아래가 아니라 접두사로는 안 잡힌다 — 관제소 소속임을 여기서 밝힌다.
      // 되돌아갈 곳의 기본값이 관제소인 것과 같은 근거다 (`students/[id]/entry-source.ts` 규칙 R2).
      { href: '/teacher/monitor',  label: '학급 관제소', icon: Radar,           description: '학급 실시간 현황 — 학생별 진입', matchPrefix: ['/teacher/students'] },
      // 봇 관리 — 봇 목록 → 봇별 설정. 전용 그룹이 없어 워크스페이스 끝에 둔다
      { href: '/teacher/bots',     label: '봇 관리',    icon: Settings,         description: '내 봇 목록 — 봇별 운영 규칙' },
      // 「봇 마켓」(/teacher/marketplace)도 그 화면이 도착하는 PR 에서 봇 관리 뒤에 들어온다.
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

/**
 * 학부모 사이드바 — **아직 비어 있다.**
 *
 * 역할(`Role`)은 이 PR 에서 서지만 `/parent/*` 화면은 뒤 PR 에서 온다. 없는 라우트를
 * 미리 열면 레일에서 누르는 즉시 404 이므로, 항목은 화면과 같은 PR 에서 채운다.
 * 학부모는 자기 학습 화면이 없다 — 자녀를 보는 창구라 항목이 둘로 고정이다(계약 §6).
 */
export const parentNav: NavGroup[] = [];

export function navForRole(role: Role): NavGroup[] {
  switch (role) {
    case 'student': return studentNav;
    case 'teacher': return teacherNav;
    case 'parent': return parentNav;
  }
}

/** 모바일 하단 탭 — 학생 클래스봇 sub-route 3개 (웰빙·리플레이는 기획 보류로 비노출) */
export const studentBottomTabs = [
  { href: '/classbot',            label: '홈',       icon: Home,          matchPrefix: ['/classbot'] as string[] },
  { href: '/classbot/assignment', label: '과제',     icon: Target,        matchPrefix: ['/classbot/assignment'] as string[] },
  // 커리큘럼(`/classbot/learn/*`)은 레일의 「봇 대화」와 같은 소속이다 — 같은 화면인데
  // 레일만 켜지고 탭은 꺼져 있으면 모바일에서 「내가 어디 있는지」를 잃는다.
  // `/classbot/chat` 은 여기 적지 않는다 — 정확 일치와 경계 접두사가 이미 잡는다.
  { href: '/classbot/chat',       label: '대화',     icon: MessageCircle, matchPrefix: ['/classbot/learn'] as string[] },
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
  // 역할마다 뿌리가 다르다 — 셋이 됐으니 학생/그 밖 이분법으로 두면 학부모가 교사 뿌리를 쓴다.
  const root =
    role === 'student' ? { label: '풀림 클래스봇', href: '/' }
    : role === 'parent' ? { label: '풀림 학부모', href: '/parent' }
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
