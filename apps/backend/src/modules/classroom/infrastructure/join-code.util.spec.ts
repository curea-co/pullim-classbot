import { generateJoinCode, JOIN_CODE_PATTERN } from "./join-code.util";

describe("generateJoinCode", () => {
  it("XXXX-XXXX 형태(혼동 문자 제외 32자 알파벳)의 코드를 생성한다", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      // 혼동 문자(I, L, O, 0, 1)는 절대 포함하지 않는다.
      expect(code).not.toMatch(/[ILO01]/);
      // 생성 코드는 사용자 제공 코드 패턴도 통과해야 한다(발급 경로 일관성).
      expect(code).toMatch(JOIN_CODE_PATTERN);
    }
  });

  it("연속 생성 시 사실상 중복되지 않는다(추측 곤란성 스모크)", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateJoinCode()),
    );
    expect(codes.size).toBe(200);
  });
});

describe("JOIN_CODE_PATTERN", () => {
  it("mock 시드 코드(MATH-2024)와 대문자 영숫자·하이픈 코드를 허용한다", () => {
    expect("MATH-2024").toMatch(JOIN_CODE_PATTERN);
    expect("ABCD").toMatch(JOIN_CODE_PATTERN);
  });

  it("공백·소문자·특수문자·과잉 길이는 거부한다", () => {
    expect("math-2024").not.toMatch(JOIN_CODE_PATTERN);
    expect("AB CD").not.toMatch(JOIN_CODE_PATTERN);
    expect("AB").not.toMatch(JOIN_CODE_PATTERN);
    expect("-ABCD").not.toMatch(JOIN_CODE_PATTERN);
    expect("A".repeat(30)).not.toMatch(JOIN_CODE_PATTERN);
  });
});
