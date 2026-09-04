// apps/classbot/components/shell/nav-config.test.ts
//
// nav 는 **라우트 인벤토리**다 — 여기 오른 항목은 곧 「이 앱에 이 화면이 있다」는 약속이다.
// 화면보다 먼저 열면 레일에서 누르는 즉시 404 이므로, 그 약속을 손이 아니라 파일 트리에
// 대 본다. 이 파일이 있는 한 nav 항목은 페이지를 앞지를 수 없다.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  parentNav, studentBottomTabs, studentNav, teacherNav,
  type NavGroup,
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

function hrefsOf(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => [item.href, ...(item.children ?? []).map((c) => c.href)]),
  );
}

describe('nav-config 라우트 인벤토리', () => {
  const matchers = collectRoutes(APP_DIR).map(routeMatcher);
  const exists = (href: string) => matchers.some((re) => re.test(href === '' ? '/' : href));

  // 학부모(`parentNav`)까지 한 번에 훑는다 — 지금은 비어 있지만 화면 없이 항목만
  // 채워지는 순간 여기서 걸린다.
  it.each([
    ['학생 레일', hrefsOf(studentNav)],
    ['교사 레일', hrefsOf(teacherNav)],
    ['학부모 레일', hrefsOf(parentNav)],
    ['학생 하단탭', studentBottomTabs.map((t) => t.href)],
  ])('%s 의 모든 항목은 app 트리에 대응 page 가 있다', (_label, hrefs) => {
    expect(hrefs.filter((href) => !exists(href))).toEqual([]);
  });

  // 봇 마켓(`/classbot/discover`)은 **화면은 있지만** 아직 「공식 튜터 마켓」(mock 공식
  // 튜터 + 「곧 만날 봇」)이다. 그래서 위의 「page 가 있다」만으로는 못 막는다 —
  // 교사가 공유한 봇으로 화면을 갈아끼우는 PR 이 nav 도 함께 되살리기로 한 자리라
  // (`proc/spec/03 § 2.1`), 그때까지 비노출인 것을 따로 못박는다.
  it('봇 마켓은 화면이 바뀌기 전까지 nav 에 오르지 않는다', () => {
    expect(hrefsOf(studentNav)).not.toContain('/classbot/discover');
    expect(studentBottomTabs.map((t) => t.href)).not.toContain('/classbot/discover');
  });
});
