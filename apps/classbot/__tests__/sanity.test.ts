/**
 * Jest 도입 검증용 sanity 테스트.
 * 실제 클래스봇 단위 테스트는 도메인 lib (예: lib/db, lib/mock) 부터 점진적 추가.
 */
describe("jest sanity", () => {
  it("환경이 정상이다", () => {
    expect(1 + 1).toBe(2);
  });

  it("NEXT_PUBLIC_ENV 가 development 로 셋업된다", () => {
    expect(process.env.NEXT_PUBLIC_ENV).toBe("development");
  });
});
