/**
 * 통합 네비게이션 설정 — 클래스봇 도메인 단일 추출본.
 * 원본 풀림 스터디 데모에서 클래스봇만 분리했기 때문에
 * 학생 GNB / 사이드바 / 하단탭 / 교사 nav 모두 클래스봇 라우트로 한정.
 * (종전에는 「클래스봇·빌더로 한정」이었다 — 교사 레일에서 [봇 빌더]를 내린 뒤로
 *  빌더는 레일에 없다. 라우트는 살아 있고 화면 안 여러 자리가 그리로 보낸다.)
 *
 * **학생 레일은 두 층이다**(2026-09-16 · 사용자 승인 — `apps/classbot/CLAUDE.md § 5` ㉠ ·
 * `proc/spec/03 § 2.1` 「학생 레일」 메모 · 완성 설계 `2026-09-16_classbot-completion-design.md § 6.1`).
 * 종전에는 도메인 → 항목 한 단계였다. 「봇 대화」가 「내 수업방」 **아래 한 단계**로 들어가면서
 * `NavSubItem` 에 `children` 이 생겼고, 그리는 쪽 셋(`nav-adapter.ts` → PUDS `OsRail` ·
 * `app-sidebar.tsx` · `mobile-drawer.tsx`)이 그것을 들여쓰기로 그린다. 반이 척추가 되는 결정(④)이다 —
 * 대화는 반에서 나오는 것이라 반 아래에 산다. 경로는 `/classbot/chat` 그대로(반 전환은 화면 안).
 * 「받은 과제」를 수업방 바로 뒤로 올린 것은 같은 결정의 덤 — 반에서 나오는 것 둘이 붙는다.
 */

import {
  Home, MessageCircle, GraduationCap, BookOpen,
  LayoutDashboard, Bot, Target, BookMarked, Compass, School, Sprout,
  ClipboardCheck, ClipboardList, BarChart3, TrendingUp, Radar, Settings,
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
  /**
   * 이 항목 아래 한 단계(결정 ④ · 2026-09-16). **한 단계만이다** — 두 층을 더 여는 날은
   * 레일이 트리가 되는 날이고, 그건 이 결정이 아니다. 지금 이 칸을 쓰는 항목은 학생 레일의
   * 「내 수업방 ▾ 봇 대화」 하나다.
   */
  children?: NavSubItem[];
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

/**
 * **셸이 가진 역할** — `AppShell role=…` 로 실제 들어오는 값만 적는다.
 *
 * `role` 을 넘기는 곳은 `app/(student)` · `app/(teacher)` · `app/(parent)` 세 레이아웃이라 셋이다.
 * 종전에는 둘이었다 — `app/(parent)` 트리가 없어서, 셸이 받을 수 없는 값을 미리 세워 두면
 * `navForRole` · breadcrumb · 헤더의 `Record<Role, …>` 표들이 **없는 `/parent` 를 가리키는
 * 답**을 적어 두게 되기 때문이다.
 *
 * **그 화면이 이 PR 에서 도착했다.** union 을 넓히는 순간 아래 `switch` 와 헤더 표 셋이
 * **빠짐없음(exhaustiveness)** 으로 컴파일에 걸려, 「홈은 어디인가 · 라벨은 무엇인가」를
 * 한 자리씩 답하게 됐다.
 *
 * **신원 층은 이것과 다르다.** 서버는 이미 학부모를 말한다 — 개발용 신원 allowlist 에
 * `parent_001` 이 있고(`lib/dev-identity.ts` 의 `DevIdentityRole`), 해석기가
 * `role: 'parent'` 를 돌려준다(`lib/current-user.ts` 의 `AppUserRole`). 그래서
 * `/api/*` 가 학생 표면에서 학부모를 403 으로 막는다(`app/api/_lib/guards.ts`).
 * **명의가 셋, 셸도 이제 셋** — 1/6 이 남겨 둔 그 어긋남을 이 PR 이 지운다.
 */
export type Role = 'student' | 'teacher' | 'parent';

/**
 * 풀림 클래스봇(학생) 섹션 — 순서와 층은 완성 설계 § 6.1 의 「바꾼 뒤」 열 그대로다:
 * 홈 · 내 수업방 ▾ 봇 대화 · 받은 과제 · 담은 봇 · 봇 마켓 · 학습 기록 · 소개.
 */
export const classbotStudentSection: NavSubItem[] = [
  { href: '/classbot',            label: '홈',         icon: Home,          description: '내 봇 N개 + 오늘 과제' },
  // 참여 코드 입력이 여기 산다. 예전엔 참여한 반이 0개일 때만 뜨는 홈 히어로가 유일한
  // 입구라, 한 반에 들어간 뒤엔 다른 선생님 반에 들어갈 길이 화면에서 사라졌다.
  {
    href: '/classbot/classroom',  label: '내 수업방',   icon: GraduationCap, description: '참여한 반 · 코드로 참여하기',
    children: [
      // 「봇 대화」는 반 아래에 산다(결정 ④) — 서버가 대화를 반 단위로 저장·인가하고
      // (`POST/GET /classbot/classes/:classId/chat`), 화면의 선택 단위도 반이다(해소 3).
      // 경로는 그대로 `/classbot/chat`. 커리큘럼·단원 화면(`/classbot/learn/*`)은 대화에서
      // 이어지는 학습이라 여기 소속인데 경로가 `/classbot/chat` 아래가 아니라 접두사로는 안 잡힌다.
      { href: '/classbot/chat',   label: '봇 대화',     icon: MessageCircle, description: '반의 봇과 1:1 — 반 전환 가능', matchPrefix: ['/classbot/learn'] },
    ],
  },
  // 반에서 나오는 것 둘(대화·과제)이 붙어 있어야 학생이 「선생님 반의 것」을 한 덩이로 읽는다.
  { href: '/classbot/assignment', label: '받은 과제',   icon: Target,        description: '풀이 워크스페이스 — 봇 처방·시험·연습' },
  // 마켓에서 담은 봇이 사는 자리. Compass 를 재사용하지 않는다 — 그건 봇 마켓 아이콘이라
  // 두 항목이 같은 곳처럼 읽힌다.
  { href: '/classbot/my-bots',    label: '담은 봇',     icon: BookMarked,   description: '마켓에서 담은 봇 — 혼자 학습' },
  // 담은 봇이 오는 곳이라 바로 뒤에 둔다. 레일에 세우는 이유: 이미 반과 담은 봇이 있는 학생은
  // 빈 상태 안내를 두 번 다시 안 보므로, 마켓이 그 안내에만 걸려 있으면 **새 봇을 찾을 길이
  // 사라진다.** (`proc/spec/03 § 2.1`)
  { href: '/classbot/discover',   label: '봇 마켓',     icon: Compass,       description: '교사가 공유한 봇 둘러보기 · 담기' },
  { href: '/classbot/me/progress', label: '학습 기록', icon: TrendingUp,   description: '내 학습 진행·성취 기록' },
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

/** 교사 사이드바 — 클래스봇 운영 + 평가 (빌더는 레일에 없다 — 아래 [봇 빌더] 자리의 주석) */
export const teacherNav: NavGroup[] = [
  {
    label: '워크스페이스',
    items: [
      { href: '/teacher',          label: '홈 대시보드', icon: LayoutDashboard, description: '내 클래스봇 운영 현황' },
      // 내 반의 참여 코드를 내고 반 상세로 들어가는 곳. 학생을 들이는 유일한 입구라 홈 바로 다음에 둔다.
      // (반 만들기·명단은 정본 문이 열리는 계획 PR 5b 까지 가려져 있다 — `classroom-workspace.tsx`.)
      { href: '/teacher/classroom', label: '내 수업방',  icon: School,          description: '내 반 · 참여 코드 · 반 상세' },
      // 「과제 내기」의 소속이 여기서 **평가 그룹의 [낸 과제]로 옮겨 갔다.** 위 줄이 예고한
      // 「나중에 형제 경로가 생기면 소속을 새로 정한다」의 그 자리다 — `/teacher/assignment` 아래에
      // 목록·상세가 생겼으므로, `new` 만 떼어 이 항목에 붙여 두면 같은 트리가 두 레일 항목으로
      // 갈린다. 이제 `/teacher/assignment/*` 전부가 [낸 과제] 소속이다(접두사로 자연히 잡힌다).
      // 배지에 `3` 이 박혀 있었다 — 봇을 하나도 안 만든 계정에도 「내 클래스봇 ③」이 떴다.
      // **걷은 것은 숫자이지 배지가 아니다**(`NavItem.badge` 는 그대로 있고 다른 항목이 쓸 수 있다).
      // 여기에 진짜 수를 다시 넣으려면 레일이 정본을 읽어야 하는데, 이 파일은 훅을 부를 수 없는
      // 정적 배열이다 — 셀 값은 `useOperatorClasses()`(`GET /classbot/bots?role=teacher`)에 있고,
      // 그것을 레일까지 들고 오는 일은 이 PR 의 경계 밖이다(`app-sidebar.tsx` 가 클라이언트이므로
      // 길은 있다). 그날까지는 **아무 숫자도 말하지 않는 쪽**이 맞는다.
      { href: '/teacher/classbot', label: '내 클래스봇', icon: Bot,             description: '활성 봇 운영 + 라이브 모니터링' },
      // 여기 「봇 빌더」가 있었다. **레일에서는 내렸다** (2026-09-15, 사용자 직접 지시 —
      // `apps/classbot/CLAUDE.md § 5`). 레일은 「어디에 무엇이 사는가」를 적는 자리인데
      // 빌더는 사는 곳이 아니라 **하는 일**이고, 그 일로 가는 길은 앱 안에 **여러 곳**이다 —
      // [봇 관리]의 「새 클래스봇」과 빈 상태, 홈 대시보드, 운영 화면의 「새 클래스봇」,
      // 학생 상세에서 과제 문항을 손보러 가는 길까지. 레일 항목은 그 위에 하나 더였다.
      // (**세지 않는다** — 자리가 늘고 줄 때마다 틀리는 숫자를 주석에 박아 두지 않는다.
      //  요지는 몇 개냐가 아니라 **레일에서 내려도 갈 길이 사라지지 않는다**는 것이다.)
      //
      // **라우트 `/teacher/builder` 는 살아 있다.** 페이지도 컴포넌트도 그대로고, 그 자리들이
      // 계속 그리로 보낸다.
      //
      // **다만 레일 한 줄만 꺼지는 것이 아니다 — 빵부스러기도 같이 꺼진다.** 아래
      // `buildBreadcrumb()` 이 `navForRole()` 을 훑어 지금 경로를 먹는 항목을 찾으므로,
      // 레일에 행이 없으면 trail 이 뿌리 한 칸으로 끝나고 `breadcrumb.tsx` 가 막대를 통째로
      // 안 그린다(`trail.length <= 1`). `/teacher/builder` 와 `/teacher/builder/[botId]`
      // 둘 다 그렇다. **이 판정을 여기서 넓히지 않는다** — `matchPrefix` 를 읽게 고치면
      // 레일에 없는 다른 경로들의 빵부스러기까지 함께 움직인다.
      // 대신 **잃은 위치 단서를 그 화면이 직접 든다**: `/teacher/builder` 는
      // `TeacherPageShell` 의 `backHref="/teacher/bots"`([봇 관리]) 로 돌아갈 길을 얻었고,
      // `[botId]` 쪽은 이미 `backHref="/teacher/classbot"` 을 들고 있었다.
      // 못박아 둔 자리 — `nav-config.test.ts` 의 `buildBreadcrumb` describe,
      // `components/builder/__tests__/builder.test.tsx` 의 「돌아갈 길」.
      //
      // TODO(봇 빌더 이식): **남은 것은 경로 이동이다.** 빌더를 `/teacher/bots/new` 로 옮겨
      //  [봇 관리] 안의 「새 클래스봇」이 유일한 진입점이 되게 한다 (`proc/spec/03 § 4.4.7`).
      //  미뤄 둔 것이지 접은 것이 아니다 — 그때까지 라우트가 둘로 읽히는 상태가 남는다.

      // 학생 상세(`/teacher/students/*`)는 관제소 명단에서 학생을 눌러 들어가는 화면인데
      // 경로가 `/teacher/monitor` 아래가 아니라 접두사로는 안 잡힌다 — 관제소 소속임을 여기서 밝힌다.
      // 되돌아갈 곳의 기본값이 관제소인 것과 같은 근거다 (`students/[id]/entry-source.ts` 규칙 R2).
      { href: '/teacher/monitor',  label: '학급 관제소', icon: Radar,           description: '학급 실시간 현황 — 학생별 진입', matchPrefix: ['/teacher/students'] },
      // 봇 관리 — 봇 목록 → 봇별 설정. 전용 그룹이 없어 워크스페이스 끝에 둔다
      { href: '/teacher/bots',     label: '봇 관리',    icon: Settings,         description: '내 봇 목록 — 봇별 운영 규칙' },
      // 내 봇을 밖에 게시하고, 다른 선생님이 게시한 봇을 둘러보는 곳.
      // 게시 버튼 자체는 「내 수업방」 카드에 있다 — 실제 DB 봇이 거기 있어서다.
      { href: '/teacher/marketplace', label: '봇 마켓', icon: Compass,       description: '공유된 봇 둘러보기 · 내 봇 공유' },
    ],
  },
  {
    label: '평가',
    items: [
      // 채점·리포트보다 **앞선 단계**라 그룹 맨 위다 — 과제를 내야 제출이 생기고, 제출이 있어야
      // 채점할 것이 생긴다. 목록·상세·내기가 모두 이 접두사 아래라 `matchPrefix` 가 필요 없다.
      { href: '/teacher/assignment', label: '낸 과제',   icon: ClipboardList,   description: '낸 과제 현황 · 학생별 제출' },
      { href: '/teacher/grading',  label: '채점 허브',   icon: ClipboardCheck,  description: '학생 전체 · AI 초안 검수' },
      { href: '/teacher/reports',  label: '리포트 센터', icon: BarChart3,       description: '6종 리포트 + 학부모 발송' },
      // 기획 보류 — 수업 리플레이(/teacher/replay) 진입점 비노출. 재개 시 되살린다
    ],
  },
];

/**
 * 학부모 레일 — 자녀 요약 · 자녀 과제 · 스스로 공부 셋.
 *
 * 1/6 은 `Role` 을 `student | teacher` 로 두고 이 레일을 비워 뒀다 — 화면이 없는 역할의
 * 메뉴를 먼저 열면 누르는 즉시 404 라서다. `/parent` · `/parent/assignments` 가 그 PR 에서
 * 도착하며 **`Role` 확장과 함께 레일이 열렸고**, `/parent/self-study` 가 이 PR 에서
 * 합류한다.
 *
 * 학부모는 자기 학습 화면이 없다 — 자녀를 보는 창구라 항목이 이 셋으로 고정이다(계약 §6).
 */
export const parentNav: NavGroup[] = [
  {
    label: '',
    items: [
      { href: '/parent',             label: '홈',        icon: Home,   description: '자녀 요약' },
      { href: '/parent/assignments', label: '자녀 과제', icon: Target, description: '자녀가 받은 과제 현황' },
      // 자녀가 스스로 고른 봇으로 한 공부. 위 둘과 **인가 모델이 다르다** — 교사 파생인
      // 반·과제와 달리 여기만 자녀 본인의 동의가 있어야 보인다(승인할 교사가 구조적으로
      // 없는 학습이라서). 레일 항목을 나눠 둔 것도 그래서다: 한 화면에 섞으면 부모가
      // 「왜 이 칸만 비나」를 묻게 되고, 그 물음의 답이 곧 동의 여부다.
      { href: '/parent/self-study',  label: '스스로 공부', icon: Sprout, description: '자녀가 스스로 고른 봇 · 공부한 날' },
    ],
  },
];

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
  // 역할마다 뿌리가 다르다. **표로 둔다** — 이분법(삼항)으로 두면 새 역할이 조용히 교사 뿌리를
  // 물려받는다. 실제로 학부모를 union 에 넣은 첫 판에서 `/parent` 가 「풀림 교사 › 홈」을
  // 달고 떴다. `Record<Role, …>` 는 역할이 늘면 **컴파일에 걸려** 이 자리를 답하게 한다.
  const roots: Record<Role, { label: string; href: string }> = {
    student: { label: '풀림 클래스봇', href: '/' },
    teacher: { label: '풀림 교사', href: '/teacher' },
    parent: { label: '풀림 학부모', href: '/parent' },
  };
  const root = roots[role];
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

  for (const m of subTrail(domainItem.children ?? [], pathname, new Set([domainItem.href]))) {
    trail.push({ label: m.label, href: m.href });
  }

  return trail;
}

/**
 * 도메인 아래 항목들 중 지금 경로가 속한 줄기 — 위에서 아래로.
 *
 * 형제 사이에서는 종전 규칙 그대로다(경로 일치·경로 경계 접두사 · 짧은 href 먼저). 다른 것은
 * **중첩**이다(결정 ④): 어떤 항목의 `children` 가운데 지금 경로가 속한 것이 있으면, 부모 자신이
 * 경로를 먹지 않아도 부모를 먼저 싣고 그 아래를 이어 붙인다 — `/classbot/chat` 이 그렇다.
 * `/classbot/classroom` 아래 경로가 아닌데 「내 수업방」 아래에 살아서, 빵부스러기가
 * 「풀림 클래스봇 › 내 수업방 › 봇 대화」로 선다.
 *
 * `matchPrefix` 는 여기서도 읽지 않는다 — 교사 레일 주석(「이 판정을 여기서 넓히지 않는다」)과
 * 같은 이유다. 그래서 `/classbot/learn/*` 는 종전대로 빵부스러기가 없다.
 * @param items - 한 층의 항목들
 * @param pathname - 지금 경로
 * @param seen - 이미 실린 href(부모 도메인) — 같은 목적지를 두 번 싣지 않게
 * @returns 실을 항목들(부모 → 자식 순)
 */
function subTrail(items: NavSubItem[], pathname: string, seen: Set<string>): NavSubItem[] {
  const out: NavSubItem[] = [];
  const own = items
    .filter((c) => !seen.has(c.href) && (pathname === c.href || pathname.startsWith(c.href + '/')))
    .sort((a, b) => a.href.length - b.href.length);
  for (const c of own) {
    seen.add(c.href);
    out.push(c);
  }
  for (const c of items) {
    if (!c.children?.length) continue;
    const below = subTrail(c.children, pathname, seen);
    if (below.length === 0) continue;
    // 부모가 경로를 직접 먹지 않았어도 자식이 먹었으면 부모부터 싣는다.
    if (!seen.has(c.href)) {
      seen.add(c.href);
      out.push(c);
    }
    out.push(...below);
  }
  return out;
}
