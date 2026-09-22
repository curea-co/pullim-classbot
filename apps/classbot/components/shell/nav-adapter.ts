import React from "react";
import { navForRole, studentBottomTabs, type Role } from "./nav-config";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  /**
   * 레일에서의 깊이 — 0 이 보통 행, 1 이 어떤 행 **아래 한 단계**로 들여쓴 행(결정 ④ ·
   * `nav-config.ts` `NavSubItem.children`). PUDS `OsRail`(레인 1 · 수정 금지)은 행마다 다른
   * 여백을 줄 수 없어, 들여쓰기는 이 어댑터가 `icon` 앞에 빈 칸을 하나 세워 만든다(아래
   * `indentedIcon`). 값은 그 사실을 소비부·테스트가 읽을 수 있게 같이 싣는다.
   */
  depth?: 0 | 1;
}
export interface RailSection {
  head: string;
  items: RailItem[];
}

/** 레일 한 행의 원본 — nav-config 의 NavItem / NavSubItem 에서 필요한 것만 추린 모양 */
type NavSource = {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  matchPrefix?: string[];
  depth: 0 | 1;
};

/**
 * 들여쓴 행의 아이콘 — 아이콘 앞에 폭 하나짜리 빈 칸을 세운다.
 *
 * `OsRail` 이 행에 주는 조절 지점은 `icon`·`label`·`active`·`disabled` 넷뿐이라, 층을 보이게
 * 하는 길은 아이콘 노드 안에 여백을 싣는 것이다. 빈 칸은 `aria-hidden` 이고 글자가 아니라
 * 낭독기에는 들리지 않는다 — 소속은 빵부스러기(「풀림 클래스봇 › 내 수업방 › 봇 대화」)가 말한다.
 * `AppShell` 은 레일을 펼침으로 고정하므로(`collapsed={false}`) 접힘 정렬은 여기서 다루지 않는다.
 */
function indentedIcon(icon: React.ReactNode): React.ReactNode {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("span", { "aria-hidden": true, className: "inline-block w-4 shrink-0" }),
    icon,
  );
}

const ROLE_LABEL: Record<Role, string> = { student: "클래스봇", teacher: "교사", parent: "학부모" };

/** '/' 은 /classbot 로 redirect → 같은 목적지로 취급해 홈 중복 제거 */
const normHref = (href: string): string => (href === "/" ? "/classbot" : href);

/** 경로 경계(`/`)까지 맞춘 접두사 일치 — `/teacher/class` 가 `/teacher/classbot` 을 잡는 사고를 막는다 */
const isUnder = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(prefix + "/");

/**
 * 활성 판정 — 열려 있는 경로에 해당하는 행 하나만 켠다.
 *
 * `targets` 는 같은 레일(또는 탭)에 놓인 행들의 목적지 전부다. 그 중 다른 행의
 * 상위 경로인 href — 홈 대시보드 `/teacher`, 학생 홈 `/classbot` 같은 **섹션 루트** — 는
 * 접두사로 잡으면 모든 하위 페이지에서 함께 켜진다. 그래서 정확히 일치할 때만 활성이다.
 * 하위 행이 없는 항목은 정확 일치 또는 경로 경계 접두사 일치로 활성이 된다.
 */
function isActive(pathname: string, href: string, targets: string[], matchPrefix?: string[]): boolean {
  const target = normHref(href);
  // redirect 로 목적지가 갈리는 행('/' → /classbot) 은 원래 href 로도 한 번 본다
  if (pathname === href || pathname === target) return true;
  const isSectionRoot = targets.some((other) => other !== target && isUnder(other, target));
  if (isSectionRoot) return false;
  if (matchPrefix?.some((p) => isUnder(pathname, p))) return true;
  return isUnder(pathname, target);
}

export function railSectionsForRole(role: Role, pathname: string): RailSection[] {
  const groups = navForRole(role);
  // 1) 레일에 실제로 놓일 행부터 추린다 — children 평탄화 + 중복 목적지 제거.
  const sections = groups.map((g) => {
    const sources: NavSource[] = [];
    const seen = new Set<string>();
    const push = (it: Omit<NavSource, "depth">, depth: 0 | 1) => {
      const key = normHref(it.href);
      if (seen.has(key)) return; // 중복 목적지(예: 홈 '/' vs '/classbot') 제거
      seen.add(key);
      sources.push({ ...it, depth });
    };
    for (const item of g.items) {
      // children 있는 도메인은 그룹 컨테이너 — 부모 행은 생략하고 children 만 평탄화.
      // 항목 아래 한 단계(`NavSubItem.children` · 결정 ④)는 **부모 바로 뒤에** 들여쓴 행으로 선다 —
      // 부모 행은 남는다(도메인 컨테이너와 달리 그 자체가 갈 곳이다).
      if (item.children?.length) {
        for (const child of item.children) {
          push(child, 0);
          for (const grandchild of child.children ?? []) push(grandchild, 1);
        }
      } else {
        push(item, 0);
      }
    }
    return { head: g.label || ROLE_LABEL[role], sources };
  });

  // 2) 활성 판정은 레일 전체를 놓고 한다 — 섹션 루트인지 알려면 다른 그룹의 행까지 봐야 한다.
  const targets = sections.flatMap((s) => s.sources.map((it) => normHref(it.href)));
  return sections.map(({ head, sources }) => ({
    head,
    items: sources.map((it) => {
      const icon = it.icon ? React.createElement(it.icon, { className: "h-[19px] w-[19px]" }) : undefined;
      return {
        label: it.label,
        href: it.href,
        icon: it.depth === 1 ? indentedIcon(icon) : icon,
        active: isActive(pathname, it.href, targets, it.matchPrefix),
        depth: it.depth,
      };
    }),
  }));
}

export function tabItems(pathname: string): RailItem[] {
  const targets = studentBottomTabs.map((t) => normHref(t.href));
  return studentBottomTabs.map((t) => {
    const Icon = t.icon;
    return {
      label: t.label,
      href: t.href,
      icon: Icon ? React.createElement(Icon, { className: "h-[22px] w-[22px]" }) : undefined,
      active: isActive(pathname, t.href, targets, t.matchPrefix),
    };
  });
}
