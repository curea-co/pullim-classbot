// apps/classbot/components/shell/nav-adapter.test.ts
import { railSectionsForRole, tabItems } from "./nav-adapter";

describe("nav-adapter", () => {
  it("flattens teacher groups into rail sections with heads", () => {
    const secs = railSectionsForRole("teacher", "/teacher/grading");
    expect(secs.length).toBeGreaterThanOrEqual(2); // 워크스페이스, 평가
    const all = secs.flatMap((s) => s.items);
    const grading = all.find((i) => i.href === "/teacher/grading");
    expect(grading?.active).toBe(true);
  });
  it("teacher rail exposes 학급 관제소 · 봇 설정 (워크스페이스 끝, 기존 항목 뒤)", () => {
    const secs = railSectionsForRole("teacher", "/teacher/monitor");
    const ws = secs.find((s) => s.head === "워크스페이스");
    expect(ws?.items.map((i) => i.href)).toEqual([
      "/teacher",
      "/teacher/classbot",
      "/teacher/builder",
      "/teacher/monitor",
      "/teacher/settings",
    ]);
    expect(ws?.items.find((i) => i.href === "/teacher/monitor")?.active).toBe(true);
  });
  it("student rail includes home + classbot routes, active on exact home", () => {
    const secs = railSectionsForRole("student", "/");
    const items = secs.flatMap((s) => s.items);
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/chat")).toBe(true);
  });
  // 내 정보(/classbot/me) 는 nav 비노출 — 프로필 메뉴 전용 진입점.
  it("student rail exposes 학습 기록 but not /classbot/me", () => {
    const items = railSectionsForRole("student", "/classbot/me/progress").flatMap((s) => s.items);
    const progress = items.find((i) => i.href === "/classbot/me/progress");
    expect(progress?.label).toBe("학습 기록");
    expect(progress?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/me")).toBe(false);
  });
  // 웰빙·리플레이는 기획 보류로 하단 탭에서 내려 3개만 남는다 (nav-config).
  it("tabItems returns the 3 student bottom tabs with active detection", () => {
    const tabs = tabItems("/classbot/assignment/123");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.href)).toEqual(["/classbot", "/classbot/assignment", "/classbot/chat"]);
    expect(tabs.find((t) => t.href === "/classbot/assignment")?.active).toBe(true);
  });
});
