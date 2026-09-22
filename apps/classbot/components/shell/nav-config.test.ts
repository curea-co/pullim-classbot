// apps/classbot/components/shell/nav-config.test.ts
//
// nav 는 **라우트 인벤토리**다 — 여기 오른 항목은 곧 「이 앱에 이 화면이 있다」는 약속이다.
// 화면보다 먼저 열면 레일에서 누르는 즉시 404 이므로, 그 약속을 손이 아니라 파일 트리에
// 대 본다. 이 파일이 있는 한 nav 항목은 페이지를 앞지를 수 없다.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildBreadcrumb, classbotStudentSection, parentNav, studentBottomTabs, studentNav, teacherNav,
  type NavGroup, type NavSubItem, type Role,
} from './nav-config';

const APP_DIR = join(__dirname, '..', '..', 'app');

/** `app` 트리를 훑어 실제로 렌더되는 경로를 모은다. */
function collectRoutes(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'page.tsx') {
      routes.push('/' + segments.join('/'));
      continue;
    }
    if (!entry.isDirectory()) continue;
    // 라우트 그룹 `(student)` 은 URL 세그먼트가 아니다 — 경로에서 빠진다.
    // 사설 폴더 `_lib` · 병렬 라우트 `@slot` 도 경로를 만들지 않는다.
    if (entry.name.startsWith('_') || entry.name.startsWith('@')) continue;
    const next = entry.name.startsWith('(') && entry.name.endsWith(')')
      ? segments
      : [...segments, entry.name];
    routes.push(...collectRoutes(join(dir, entry.name), next));
  }
  return routes;
}

/** `/classbot/assignment/[id]` 같은 동적 세그먼트도 맞도록 정규식으로 바꾼다. */
function routeMatcher(route: string): RegExp {
  const body = route
    .split('/')
    .map((seg) => (seg.startsWith('[') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${body}$`);
}

/**
 * 항목 아래 한 단계까지 훑는다(결정 ④ · 2026-09-16). 종전 flatMap 은 도메인 → 항목 한 단계만
 * 봤다 — 그대로 두면 들여쓴 항목이 없는 page 를 가리켜도 이 검사가 초록으로 남는다
 * (`proc/spec/03 § 2.1` 「학생 레일」 메모 · 완성 설계 § 6.1).
 */
function subHrefs(items: NavSubItem[] | undefined): string[] {
  return (items ?? []).flatMap((c) => [c.href, ...subHrefs(c.children)]);
}

function hrefsOf(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => [item.href, ...subHrefs(item.children)]),
  );
}

describe('nav-config 라우트 인벤토리', () => {
  const matchers = collectRoutes(APP_DIR).map(routeMatcher);
  const exists = (href: string) => matchers.some((re) => re.test(href === '' ? '/' : href));

  // 학부모 레일이 그 「역할이 느는 날」로 들어온 줄이다 — 화면 없이 항목만 채워지는 순간
  // 여기서 걸린다.
  it.each([
    ['학생 레일', hrefsOf(studentNav)],
    ['교사 레일', hrefsOf(teacherNav)],
    ['학부모 레일', hrefsOf(parentNav)],
    ['학생 하단탭', studentBottomTabs.map((t) => t.href)],
  ])('%s 의 모든 항목은 app 트리에 대응 page 가 있다', (_label, hrefs) => {
    expect(hrefs.filter((href) => !exists(href))).toEqual([]);
  });

  // 봇 마켓(`/classbot/discover`)은 화면이 「공식 튜터 마켓」(mock)이던 동안 nav 에서
  // 내려 있었다 — 레일 라벨과 도착지가 어긋나서다. 교사가 공유한 봇으로 갈아끼우는 PR 이
  // nav 도 함께 되살리기로 한 자리이고(`proc/spec/03 § 2.1`), **이 PR 이 그 PR 이다.**
  // 레일에 있어야 하는 이유는 따로 있다: 이미 반과 담은 봇이 있는 학생은 빈 상태 안내를
  // 다시 안 보므로, 마켓이 그 안내에만 걸려 있으면 새 봇을 찾을 길이 사라진다.
  it('봇 마켓은 학생 레일에 있다 — 하단탭은 셋 그대로', () => {
    expect(hrefsOf(studentNav)).toContain('/classbot/discover');
    // 하단탭은 기획 보류로 셋만 남긴 자리다(아래 tabItems 테스트) — 여기 늘리지 않는다.
    expect(studentBottomTabs.map((t) => t.href)).not.toContain('/classbot/discover');
  });

  // 중첩 항목도 인벤토리다 — 들여쓴 「봇 대화」가 훑기에서 빠지면 위 규칙이 그 항목을 못 본다.
  it('중첩 항목(내 수업방 ▾ 봇 대화)까지 인벤토리에 든다', () => {
    const hrefs = hrefsOf(studentNav);
    expect(hrefs).toContain('/classbot/chat');
    expect(hrefs.filter((href) => !exists(href))).toEqual([]);
    // 헬퍼가 실제로 한 층 더 내려갔는지 — 가짜 자식을 넣어 못박는다.
    const fake: NavGroup[] = [{ label: '', items: [{ ...studentNav[0].items[1], children: [
      { href: '/classbot/classroom', label: 'x', children: [{ href: '/classbot/없는-화면', label: 'y' }] },
    ] }] }];
    expect(hrefsOf(fake)).toContain('/classbot/없는-화면');
  });
});

/*
  결정 ④(2026-09-16 · `apps/classbot/CLAUDE.md § 5` ㉠ · 완성 설계 § 6.1): 「봇 대화」는 「내 수업방」
  아래 한 단계, 「받은 과제」는 수업방 바로 뒤. 나머지 항목의 라벨·경로·아이콘과 하단탭은 그대로다.
  순서를 목록째로 못박는 이유는 하나만 어긋나도 「반에서 나오는 것 둘이 붙는다」가 깨지기 때문이다.
*/
describe('학생 레일 — 반이 척추다(결정 ④)', () => {
  it('첫 층은 홈 · 내 수업방 · 받은 과제 · 담은 봇 · 봇 마켓 · 학습 기록 · 소개', () => {
    expect(classbotStudentSection.map((s) => s.href)).toEqual([
      '/classbot',
      '/classbot/classroom',
      '/classbot/assignment',
      '/classbot/my-bots',
      '/classbot/discover',
      '/classbot/me/progress',
      '/classbot/onboarding',
    ]);
  });

  it('「봇 대화」는 「내 수업방」 아래 한 단계 — 경로와 커리큘럼 소속(matchPrefix)은 그대로', () => {
    const classroom = classbotStudentSection.find((s) => s.href === '/classbot/classroom');
    expect(classroom?.children?.map((c) => ({ href: c.href, label: c.label, matchPrefix: c.matchPrefix }))).toEqual([
      { href: '/classbot/chat', label: '봇 대화', matchPrefix: ['/classbot/learn'] },
    ]);
    // 첫 층에는 더 이상 없다 — 두 층에 같은 목적지가 있으면 레일에 행이 둘 선다.
    expect(classbotStudentSection.some((s) => s.href === '/classbot/chat')).toBe(false);
    // 층은 하나만 더 열렸다.
    expect(classroom?.children?.every((c) => !c.children)).toBe(true);
  });

  it('하단탭은 셋 그대로 — 레일의 층은 탭을 바꾸지 않는다', () => {
    expect(studentBottomTabs.map((t) => t.href)).toEqual(['/classbot', '/classbot/assignment', '/classbot/chat']);
  });
});

/*
  빵부스러기 뿌리는 **역할마다 다르다.** 예전에는 삼항(학생이면 클래스봇, 아니면 교사)이라,
  union 만 넓힌 첫 판에서 `/parent` 가 「풀림 교사 › 홈」을 달고 떴다 — 학부모가 교사 뿌리를
  조용히 물려받은 것이다. 표로 바꾼 뒤 그 자리를 여기서 못박는다.
*/
describe('buildBreadcrumb — 뿌리는 역할을 따라간다', () => {
  it.each<[Role, string, string]>([
    ['student', '/classbot', '풀림 클래스봇'],
    ['teacher', '/teacher/students', '풀림 교사'],
    ['parent', '/parent/assignments', '풀림 학부모'],
  ])('%s 의 뿌리는 %s 에서 「%s」', (role, pathname, rootLabel) => {
    expect(buildBreadcrumb(pathname, role)[0].label).toBe(rootLabel);
  });

  /*
    빵부스러기는 레일을 읽는다 — `buildBreadcrumb` 이 `navForRole` 을 훑으므로 **레일에서
    내린 경로는 빵부스러기도 잃는다.** `/teacher/builder` 가 그 경우다(2026-09-15 교사 레일
    승인). 뿌리 한 칸으로 끝나면 `breadcrumb.tsx` 의 `trail.length <= 1` 이 막대를 통째로
    안 그린다.

    **알고 한 것임을 여기에 못박는다.** 모르고 되돌리지 않도록, 그리고 되살릴 때 무엇이
    함께 움직이는지 알도록. 이 화면이 길을 잃지 않는 것은 `/teacher/builder` 페이지가
    `TeacherPageShell` 의 `backHref="/teacher/bots"` 로 돌아갈 길을 직접 들기 때문이고,
    그쪽은 `components/builder/__tests__/builder.test.tsx` 가 못박는다.
  */
  it('봇 빌더는 레일에 없으니 빵부스러기도 뿌리 한 칸뿐이다 — 돌아갈 길은 화면이 든다', () => {
    expect(buildBreadcrumb('/teacher/builder', 'teacher')).toEqual([
      { label: '풀림 교사', href: '/teacher' },
    ]);
    expect(buildBreadcrumb('/teacher/builder/cb_004', 'teacher')).toEqual([
      { label: '풀림 교사', href: '/teacher' },
    ]);
    // 레일에 있는 이웃은 그대로다 — 레일을 통째로 잃은 것이 아니라 한 줄만 내린 것이다
    expect(buildBreadcrumb('/teacher/bots', 'teacher')).toEqual([
      { label: '풀림 교사', href: '/teacher' },
      { label: '봇 관리', href: '/teacher/bots' },
    ]);
  });

  it('역할 홈에서는 뿌리 한 칸뿐이다', () => {
    expect(buildBreadcrumb('/parent', 'parent')).toEqual([
      { label: '풀림 학부모', href: '/parent' },
    ]);
  });

  /*
    중첩 항목의 빵부스러기(결정 ④) — `/classbot/chat` 은 `/classbot/classroom` 아래 경로가 아닌데
    「내 수업방」 아래에 산다. 경로만 보면 부모가 빠지고, 그러면 레일은 들여쓰는데 빵부스러기는
    형제처럼 말한다. 부모부터 싣는 것을 여기서 못박는다. (뿌리 `/` 와 도메인 `/classbot` 의 라벨이
    같은 것은 `breadcrumb.tsx` 가 인접 중복으로 접는다 — 여기서는 원본 trail 을 본다.)
  */
  it('중첩 항목은 부모부터 싣는다 — 풀림 클래스봇 › 내 수업방 › 봇 대화', () => {
    expect(buildBreadcrumb('/classbot/chat', 'student')).toEqual([
      { label: '풀림 클래스봇', href: '/' },
      { label: '풀림 클래스봇', href: '/classbot' },
      { label: '내 수업방', href: '/classbot/classroom' },
      { label: '봇 대화', href: '/classbot/chat' },
    ]);
    // 부모 자신은 종전대로 두 칸 — 자식을 끌어오지 않는다.
    expect(buildBreadcrumb('/classbot/classroom', 'student').slice(2)).toEqual([
      { label: '내 수업방', href: '/classbot/classroom' },
    ]);
    // 형제는 층이 바뀌지 않았다.
    expect(buildBreadcrumb('/classbot/assignment/a1', 'student').slice(2)).toEqual([
      { label: '받은 과제', href: '/classbot/assignment' },
    ]);
    // `matchPrefix` 는 빵부스러기가 읽지 않는다(교사 레일 주석과 같은 결정) — 커리큘럼은 종전대로 없다.
    expect(buildBreadcrumb('/classbot/learn/t1', 'student')).toHaveLength(2);
  });
});
