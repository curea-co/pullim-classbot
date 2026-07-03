import {
  computeDDay,
  formatDueLabel,
  parseDueIsoAsKst,
} from "./due-label.util";

/** 기준 now — 2026-07-03 12:00 KST (= 03:00 UTC). */
const NOW = new Date("2026-07-03T03:00:00.000Z");

describe("parseDueIsoAsKst", () => {
  it("TZ 없는 datetime-local 문자열은 KST 로 해석한다", () => {
    const parsed = parseDueIsoAsKst("2026-07-04T22:00");

    expect(parsed.toISOString()).toBe("2026-07-04T13:00:00.000Z");
  });

  it("Z/오프셋이 붙은 문자열은 그대로 파싱한다", () => {
    expect(parseDueIsoAsKst("2026-07-04T13:00:00.000Z").toISOString()).toBe(
      "2026-07-04T13:00:00.000Z",
    );
    expect(parseDueIsoAsKst("2026-07-04T22:00:00+09:00").toISOString()).toBe(
      "2026-07-04T13:00:00.000Z",
    );
  });
});

describe("formatDueLabel — FE lib/assignment-due.ts 포트(ceil 분기 포함)", () => {
  it("지난(≤now) 마감은 '오늘 hh:mm' (KST 벽시계)", () => {
    const due = parseDueIsoAsKst("2026-07-03T10:00");

    expect(formatDueLabel(due, NOW)).toBe("오늘 10:00");
  });

  it("24시간 이내 미래는 '내일 hh:mm' (FE ceil 동작 재현)", () => {
    const due = parseDueIsoAsKst("2026-07-04T10:00");

    expect(formatDueLabel(due, NOW)).toBe("내일 10:00");
  });

  it("그 이후는 'M/D hh:mm'", () => {
    const due = parseDueIsoAsKst("2026-07-06T09:05");

    expect(formatDueLabel(due, NOW)).toBe("7/6 09:05");
  });
});

describe("computeDDay — FE lib/assignment-due.ts 포트", () => {
  it("지난(≤now) 마감은 '오늘'", () => {
    expect(computeDDay(parseDueIsoAsKst("2026-07-03T10:00"), NOW)).toBe("오늘");
  });

  it("24시간 이내 미래는 'D-1'", () => {
    expect(computeDDay(parseDueIsoAsKst("2026-07-04T10:00"), NOW)).toBe("D-1");
  });

  it("n일 뒤는 'D-n'", () => {
    expect(computeDDay(parseDueIsoAsKst("2026-07-06T09:05"), NOW)).toBe("D-3");
  });
});
