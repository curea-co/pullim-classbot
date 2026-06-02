import { AuthService } from "../service/auth.service";
import { LogoutUseCase } from "./logout.use-case";

describe("LogoutUseCase (무효화)", () => {
  it("refresh 토큰을 블랙리스트에 등록한다", async () => {
    const authService = {
      blacklistToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Pick<AuthService, "blacklistToken">>;

    const useCase = new LogoutUseCase(authService as never);
    await useCase.execute("refresh-xyz");

    expect(authService.blacklistToken).toHaveBeenCalledWith("refresh-xyz");
  });

  it("블랙리스트 등록 중 발생한 예외는 전파한다", async () => {
    const authService = {
      blacklistToken: jest.fn().mockRejectedValue(new Error("revoke 실패")),
    } as unknown as jest.Mocked<Pick<AuthService, "blacklistToken">>;

    const useCase = new LogoutUseCase(authService as never);
    await expect(useCase.execute("refresh-xyz")).rejects.toThrow("revoke 실패");
  });
});
