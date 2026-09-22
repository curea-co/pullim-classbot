// apps/classbot/components/shell/nav-adapter.test.ts
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

describe("nav-adapter", () => {
  it("flattens teacher groups into rail sections with heads", () => {
    const secs = railSectionsForRole("teacher", "/teacher/grading");
    expect(secs.length).toBeGreaterThanOrEqual(2); // 워크스페이스, 평가
    const all = secs.flatMap((s) => s.items);
    const grading = all.find((i) => i.href === "/teacher/grading");
    expect(grading?.active).toBe(true);
  });
  it("teacher rail exposes 학급 관제소 · 봇 관리 (워크스페이스 끝, 기존 항목 뒤)", () => {
    const secs = railSectionsForRole("teacher", "/teacher/monitor");
    const ws = secs.find((s) => s.head === "워크스페이스");
    expect(ws?.items.map((i) => i.href)).toEqual([
      "/teacher",
      // 반을 열고 참여 코드를 내는 화면 — 학생을 들이는 입구라 홈 바로 뒤에 온다
      "/teacher/classroom",
      "/teacher/classbot",
      // 봇 빌더(`/teacher/builder`)는 레일에서 내렸다 — 라우트는 살아 있고 앱 안 여러 진입점이 쓴다 (nav-config)
      "/teacher/monitor",
      "/teacher/bots",
      // 게시된 봇이 모이는 곳 — 봇 관리 다음
      "/teacher/marketplace",
    ]);
    expect(ws?.items.find((i) => i.href === "/teacher/monitor")?.active).toBe(true);
  });
  it("student rail includes home + classbot routes, active on exact home", () => {
    const secs = railSectionsForRole("student", "/");
    const items = secs.flatMap((s) => s.items);
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/chat")).toBe(true);
  });
  /*
    결정 ④(2026-09-16 · nav-config): 「봇 대화」는 「내 수업방」 아래 한 단계다. PUDS `OsRail` 은 행마다
    여백을 달리 줄 수 없어 어댑터가 평탄화하며 **부모 바로 뒤에 depth 1 로** 세운다 — 여기서 빠지면
    배포 레일에서 「봇 대화」가 통째로 사라진다(`app-shell.tsx` 가 이 목록을 그대로 그린다).
  */
  it("student rail nests 봇 대화 right under 내 수업방 as a depth-1 row, others depth 0", () => {
    const items = railSectionsForRole("student", "/classbot").flatMap((s) => s.items);
    expect(items.map((i) => [i.href, i.depth])).toEqual([
      ["/", 0],
      ["/classbot/classroom", 0],
      ["/classbot/chat", 1],
      ["/classbot/assignment", 0],
      ["/classbot/my-bots", 0],
      ["/classbot/discover", 0],
      ["/classbot/me/progress", 0],
      ["/classbot/onboarding", 0],
    ]);
    // 들여쓴 행만 아이콘 앞에 빈 칸을 달고 있다 — 낭독기에는 안 들리는(aria-hidden) 여백이다.
    const nested = items.find((i) => i.href === "/classbot/chat");
    const flat = items.find((i) => i.href === "/classbot/classroom");
    expect(JSON.stringify(nested?.icon)).toContain('"aria-hidden":true');
    expect(JSON.stringify(flat?.icon)).not.toContain('"aria-hidden":true');
  });
  // 내 정보(/classbot/me) 는 nav 비노출 — 프로필 메뉴 전용 진입점.
  it("student rail exposes 학습 기록 but not /classbot/me", () => {
    const items = railSectionsForRole("student", "/classbot/me/progress").flatMap((s) => s.items);
    const progress = items.find((i) => i.href === "/classbot/me/progress");
    expect(progress?.label).toBe("학습 기록");
    expect(progress?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/me")).toBe(false);
  });
  // 홈 대시보드(`/teacher`) 는 모든 교사 페이지의 상위 경로다 — 접두사로 잡으면 어디서나 켜진다.
  it("teacher 홈 대시보드 is active only on the exact /teacher route", () => {
    const activeLabels = (pathname: string) =>
      railSectionsForRole("teacher", pathname)
        .flatMap((s) => s.items)
        .filter((i) => i.active)
        .map((i) => i.label);
    expect(activeLabels("/teacher")).toEqual(["홈 대시보드"]);
    expect(activeLabels("/teacher/classbot")).toEqual(["내 클래스봇"]);
    // 봇 빌더는 레일에서 내렸다 — 라우트는 살아 있지만 레일에 행이 없으니 어느 행도 켜지 않는다
    expect(activeLabels("/teacher/builder")).toEqual([]);
    expect(activeLabels("/teacher/grading/7")).toEqual(["채점 허브"]);
    // nav 에 없고 어느 행에도 속한다고 선언되지 않은 페이지 — 현재 위치라고 주장할 행이 없으니 아무것도 켜지 않는다
    expect(activeLabels("/teacher/settings")).toEqual([]);
  });
  // `/teacher/students*` 는 경로가 `/teacher/monitor` 아래가 아닌데도 관제소 소속이다 —
  // 관제소 항목이 `matchPrefix` 로 밝혀서 잡는다 (nav-config).
  // 「관제소 명단에서 눌러 들어간다」는 2026-09-18 에 더는 참이 아니다(계획 PR 7 · 결함 03-③) —
  // 그 두 화면은 빈 상태이고 학생 상세로 보내는 자리가 없다. 그래도 이 판정은 그대로 지킨다:
  // 라우트가 살아 있고, 밖에 남은 주소로 들어온 교사가 레일에서 제 위치를 잃으면 안 된다.
  it("teacher 학급 관제소 stays active on its 학생 상세 sub-pages", () => {
    const activeLabels = (pathname: string) =>
      railSectionsForRole("teacher", pathname)
        .flatMap((s) => s.items)
        .filter((i) => i.active)
        .map((i) => i.label);
    expect(activeLabels("/teacher/monitor")).toEqual(["학급 관제소"]);
    expect(activeLabels("/teacher/students")).toEqual(["학급 관제소"]);
    expect(activeLabels("/teacher/students/s1")).toEqual(["학급 관제소"]);
  });
  // 경로 경계(`/`) 없이 접두사를 보면 `/teacher/classbot` 이 `/teacher/classbot-archive` 까지 잡는다.
  it("teacher rail matches on path boundaries, not bare string prefixes", () => {
    const items = railSectionsForRole("teacher", "/teacher/classbot-archive").flatMap((s) => s.items);
    expect(items.filter((i) => i.active)).toHaveLength(0);
  });
  // '/' 은 /classbot 로 redirect 된다 — 착지한 경로에서도 홈 행이 켜져 있어야 한다.
  it("student 홈 stays active after the '/' → /classbot redirect", () => {
    const activeLabels = (pathname: string) =>
      railSectionsForRole("student", pathname)
        .flatMap((s) => s.items)
        .filter((i) => i.active)
        .map((i) => i.label);
    expect(activeLabels("/classbot")).toEqual(["홈"]);
    expect(activeLabels("/classbot/chat")).toEqual(["봇 대화"]);
    expect(activeLabels("/classbot/assignment/1")).toEqual(["받은 과제"]);
  });
  // 커리큘럼은 대화에서 이어지는 화면인데 경로가 갈라져 있다 —
  // 소속을 밝힌 항목이 잡되, 그 때문에 두 곳이 켜지지는 않아야 한다 (nav-config 의 matchPrefix).
  it("keeps split-off routes on the section that owns them", () => {
    const studentLabels = (pathname: string) =>
      railSectionsForRole("student", pathname).flatMap((s) => s.items).filter((i) => i.active).map((i) => i.label);
    expect(studentLabels("/classbot/learn/t1")).toEqual(["봇 대화"]);
    expect(studentLabels("/classbot/learn/t1/u1")).toEqual(["봇 대화"]);
  });

  /*
    과제 내기는 **더 이상 「내 클래스봇」 소속이 아니다.** 종전에는 `/teacher/assignment` 아래에
    `new` 하나뿐이라 봇 운영 항목이 `matchPrefix` 로 데려갔고, nav-config 의 그 자리 주석이
    「나중에 형제 경로가 생기면 소속을 새로 정한다」고 예고해 두었다. 목록·상세가 생기면서
    그 날이 왔다 — 이제 `/teacher/assignment/*` 셋 다 [낸 과제] 하나로 켜진다.
    셋을 같이 못박는 이유는 하나만 어긋나도 교사가 「내가 어디 있는지」를 잃기 때문이다.
  */
  it("owns every /teacher/assignment/* route under 낸 과제", () => {
    const teacherLabels = (pathname: string) =>
      railSectionsForRole("teacher", pathname).flatMap((s) => s.items).filter((i) => i.active).map((i) => i.label);
    expect(teacherLabels("/teacher/assignment")).toEqual(["낸 과제"]);
    expect(teacherLabels("/teacher/assignment/new")).toEqual(["낸 과제"]);
    expect(teacherLabels("/teacher/assignment/as_today")).toEqual(["낸 과제"]);
  });
  // 커리큘럼 소속은 레일만의 결정이 아니다 — 모바일 하단탭도 「대화」로 같이 켜져야
  // 같은 화면에서 「내가 어디 있는지」가 두 표면에 같게 나온다.
  // 하단탭 「홈」이 `matchPrefix: ['/classbot']` 을 갖고 있지만 규칙 ②(섹션 루트면 종료)가
  // ③(matchPrefix)보다 먼저라 같이 켜지지 않는다 — 그것까지 한 번에 못박는다.
  it("lights the 대화 tab on curriculum routes, and only that tab", () => {
    const activeTabs = (pathname: string) => tabItems(pathname).filter((t) => t.active).map((t) => t.label);
    expect(activeTabs("/classbot/learn/t1")).toEqual(["대화"]);
    expect(activeTabs("/classbot/learn/t1/u1")).toEqual(["대화"]);
    // 자기 자신을 가리키는 `matchPrefix` 없이도 규칙 ①·④ 가 잡는다 — 그래서 안 적었다
    expect(activeTabs("/classbot/chat")).toEqual(["대화"]);
  });
  // 활성은 "지금 여기"를 가리키는 표시다 — 두 곳을 동시에 가리키면 아무 데도 안 가리키는 것과 같다.
  // 실제 라우트 전부를 훑어 두 개가 켜지는 경로가 없는지 못박는다.
  it("never lights up more than one rail item on any real route", () => {
    const teacherRoutes = [
      "/teacher", "/teacher/assignment/new", "/teacher/bots", "/teacher/bots/b1",
      "/teacher/builder", "/teacher/classbot", "/teacher/grading", "/teacher/grading/g1",
      "/teacher/monitor", "/teacher/replay", "/teacher/replay/r1", "/teacher/reports",
      "/teacher/reports/r1", "/teacher/settings", "/teacher/students", "/teacher/students/s1",
    ];
    const studentRoutes = [
      "/", "/classbot", "/classbot/assignment", "/classbot/assignment/a1",
      "/classbot/assignment/a1/solve", "/classbot/chat", "/classbot/discover",
      "/classbot/learn/t1", "/classbot/learn/t1/u1", "/classbot/live/b1", "/classbot/me",
      "/classbot/me/progress", "/classbot/me/report", "/classbot/onboarding",
      "/classbot/replay", "/classbot/replay/r1", "/classbot/wellness", "/classbot/wellness/check-in",
    ];
    const routes: { role: Role; pathname: string }[] = [
      ...teacherRoutes.map((pathname) => ({ role: "teacher" as Role, pathname })),
      ...studentRoutes.map((pathname) => ({ role: "student" as Role, pathname })),
    ];
    // 실패했을 때 어느 경로가 터졌는지 바로 보이도록 목록째로 비교한다
    const overlit = routes
      .map(({ role, pathname }) => ({
        pathname,
        labels: railSectionsForRole(role, pathname).flatMap((s) => s.items).filter((i) => i.active).map((i) => i.label),
      }))
      .filter((r) => r.labels.length > 1);
    expect(overlit).toEqual([]);
    // 하단탭도 같은 잣대로 — 탭 세 개 중 둘이 켜지는 경로가 있으면 안 된다
    const overlitTabs = studentRoutes
      .map((pathname) => ({ pathname, labels: tabItems(pathname).filter((t) => t.active).map((t) => t.label) }))
      .filter((r) => r.labels.length > 1);
    expect(overlitTabs).toEqual([]);
  });
  // 웰빙·리플레이는 기획 보류로 하단 탭에서 내려 3개만 남는다 (nav-config).
  it("tabItems returns the 3 student bottom tabs with active detection", () => {
    const tabs = tabItems("/classbot/assignment/123");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.href)).toEqual(["/classbot", "/classbot/assignment", "/classbot/chat"]);
    expect(tabs.find((t) => t.href === "/classbot/assignment")?.active).toBe(true);
  });
});
