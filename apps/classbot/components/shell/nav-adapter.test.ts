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
  it("student rail includes home + classbot routes, active on exact home", () => {
    const secs = railSectionsForRole("student", "/");
    const items = secs.flatMap((s) => s.items);
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/chat")).toBe(true);
  });
  it("tabItems returns the 5 student bottom tabs with active detection", () => {
    const tabs = tabItems("/classbot/assignment/123");
    expect(tabs).toHaveLength(5);
    expect(tabs.find((t) => t.href === "/classbot/assignment")?.active).toBe(true);
  });
});
